import { getSupabase, leggiTutti } from "../../../../lib/supabase";
import { leggiExcelEmissioni } from "../../../../lib/emissioni-xlsx";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;
const DIM_BLOCCO_INSERT = 500;
const DIM_BLOCCO_UPDATE = 20;

// Importa l'anagrafica clienti emissioni da file Excel.
// Chiave: nome cliente (senza distinzione di maiuscole). Esiste già -> aggiorna; altrimenti crea.
// Non cancella mai i clienti che non compaiono nel file.
export async function POST(request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!file || typeof file === "string") {
    return Response.json({ error: "Nessun file selezionato" }, { status: 400 });
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return Response.json({ error: "Formato non ammesso: usare un file Excel .xlsx" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File troppo grande (max 4 MB)" }, { status: 400 });
  }

  let letto;
  try {
    letto = await leggiExcelEmissioni(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  const { righe, errori, avvisi } = letto;
  if (righe.length === 0 && errori.length === 0) {
    return Response.json({ error: "Nessun cliente trovato nel file" }, { status: 400 });
  }

  const supabase = getSupabase();
  let esistenti;
  try {
    esistenti = await leggiTutti((da, a) =>
      supabase
        .from("emissioni_clienti")
        .select("id, ragione_sociale, email, telefono, data_scadenza")
        .order("id", { ascending: true })
        .range(da, a)
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }

  const perNome = new Map(esistenti.map((c) => [c.ragione_sociale.trim().toLowerCase(), c]));

  const nuovi = [];
  const daAggiornare = [];
  let invariati = 0;
  let senzaEmail = 0;

  for (const r of righe) {
    const ex = perNome.get(r.ragione_sociale.toLowerCase());
    if (!ex) {
      nuovi.push(r);
      if (!r.email) senzaEmail++;
      continue;
    }
    const upd = {};
    if (ex.data_scadenza !== r.data_scadenza) upd.data_scadenza = r.data_scadenza;
    // Email e telefono: il file li sovrascrive solo se compilati
    if (r.email && r.email !== ex.email) upd.email = r.email;
    if (r.telefono && r.telefono !== ex.telefono) upd.telefono = r.telefono;
    if (!r.email && !ex.email) senzaEmail++;

    if (Object.keys(upd).length > 0) daAggiornare.push({ ex, r, upd });
    else invariati++;
  }

  const erroriDb = [];
  let creati = 0;
  let aggiornati = 0;

  // Inserimenti a blocchi; se un blocco fallisce riprovo riga per riga per isolare il problema
  for (let i = 0; i < nuovi.length; i += DIM_BLOCCO_INSERT) {
    const blocco = nuovi.slice(i, i + DIM_BLOCCO_INSERT);
    const toRow = (r) => ({
      ragione_sociale: r.ragione_sociale,
      email: r.email,
      telefono: r.telefono,
      data_scadenza: r.data_scadenza,
    });

    const { error } = await supabase.from("emissioni_clienti").insert(blocco.map(toRow));
    if (!error) {
      creati += blocco.length;
      continue;
    }
    for (const r of blocco) {
      const { error: e1 } = await supabase.from("emissioni_clienti").insert(toRow(r));
      if (e1) {
        erroriDb.push({
          riga: r.riga,
          cliente: r.ragione_sociale,
          messaggio: e1.code === "23505" ? "Esiste già un cliente con questo nome" : e1.message,
        });
      } else {
        creati++;
      }
    }
  }

  // Aggiornamenti a piccoli gruppi in parallelo
  for (let i = 0; i < daAggiornare.length; i += DIM_BLOCCO_UPDATE) {
    const gruppo = daAggiornare.slice(i, i + DIM_BLOCCO_UPDATE);
    const esiti = await Promise.all(
      gruppo.map(({ ex, upd }) =>
        supabase
          .from("emissioni_clienti")
          .update({ ...upd, updated_at: new Date().toISOString() })
          .eq("id", ex.id)
      )
    );
    esiti.forEach((esito, k) => {
      if (esito.error) {
        erroriDb.push({
          riga: gruppo[k].r.riga,
          cliente: gruppo[k].r.ragione_sociale,
          messaggio: esito.error.message,
        });
      } else {
        aggiornati++;
      }
    });
  }

  return Response.json({
    creati,
    aggiornati,
    invariati,
    senzaEmail,
    errori: [...errori, ...erroriDb].sort((a, b) => a.riga - b.riga),
    avvisi,
  });
}
