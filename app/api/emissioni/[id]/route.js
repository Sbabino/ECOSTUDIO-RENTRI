import { getSupabase } from "../../../../lib/supabase";
import {
  EMAIL_REGEX,
  isoValida,
  CAMPI_AVVISO,
  avvisiPersonalizzati,
  validaAvvisi,
  normalizzaAvvisi,
} from "../../../../lib/emissioni";

export const dynamic = "force-dynamic";

// Dettaglio cliente con storico avvisi (più recenti per primi)
export async function GET(request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id non valido" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("emissioni_clienti")
    .select("*, emissioni_notifiche(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  data.emissioni_notifiche = (data.emissioni_notifiche || []).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  return Response.json(data);
}

// Modifica anagrafica (nome, email, telefono), scadenza e date dei tre avvisi.
// Si inviano solo i campi da cambiare. Per gli avvisi: data_avviso_1, data_avviso_2, data_avviso_3
// (valore vuoto/null = torna al predefinito: scadenza meno 90 / 60 / 30 giorni).
export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id non valido" }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  const update = { updated_at: new Date().toISOString() };
  const supabase = getSupabase();

  const cambiaScadenza = "data_scadenza" in body;
  const campiAvvisoInviati = CAMPI_AVVISO.filter((campo) => campo in body);

  if (cambiaScadenza && !isoValida(body.data_scadenza)) {
    return Response.json({ error: "Data di scadenza non valida" }, { status: 400 });
  }
  for (const campo of campiAvvisoInviati) {
    if (body[campo] && !isoValida(String(body[campo]))) {
      return Response.json({ error: `Data del ${campo.slice(-1)}° avviso non valida` }, { status: 400 });
    }
  }

  if (cambiaScadenza || campiAvvisoInviati.length > 0) {
    // Stato attuale: serve per confrontare le date nel loro insieme (ordine 1° < 2° < 3°, nessuna dopo la scadenza)
    const { data: attuale, error: readErr } = await supabase
      .from("emissioni_clienti")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (readErr) {
      return Response.json({ error: readErr.message }, { status: 500 });
    }
    if (!attuale) {
      return Response.json({ error: "Cliente non trovato" }, { status: 404 });
    }

    const scadenza = cambiaScadenza ? body.data_scadenza : attuale.data_scadenza;
    // Se la scadenza si sposta (es. analisi rinnovata) le vecchie date personalizzate non hanno più senso:
    // si riparte dai predefiniti, a meno che nella stessa richiesta non ne vengano indicate di nuove.
    const spostata = cambiaScadenza && body.data_scadenza !== attuale.data_scadenza;
    let avvisi = spostata ? [null, null, null] : avvisiPersonalizzati(attuale);
    CAMPI_AVVISO.forEach((campo, i) => {
      if (campo in body) avvisi[i] = body[campo] ? String(body[campo]) : null;
    });

    const errore = validaAvvisi(scadenza, avvisi);
    if (errore) {
      return Response.json({ error: errore }, { status: 400 });
    }
    avvisi = normalizzaAvvisi(scadenza, avvisi);

    if (cambiaScadenza) update.data_scadenza = scadenza;
    CAMPI_AVVISO.forEach((campo, i) => {
      update[campo] = avvisi[i];
    });
  }

  if ("ragione_sociale" in body) {
    const nome = String(body.ragione_sociale || "").replace(/\s+/g, " ").trim();
    if (!nome || nome.length > 255) {
      return Response.json({ error: "Anagrafica cliente non valida" }, { status: 400 });
    }
    update.ragione_sociale = nome;
  }

  if ("email" in body) {
    const email = String(body.email || "").trim();
    if (email && (!EMAIL_REGEX.test(email) || email.length > 255)) {
      return Response.json({ error: "Email non valida" }, { status: 400 });
    }
    update.email = email || null;
  }

  if ("telefono" in body) {
    const tel = String(body.telefono || "").trim();
    if (tel.length > 30) {
      return Response.json({ error: "Telefono troppo lungo (max 30 caratteri)" }, { status: 400 });
    }
    update.telefono = tel || null;
  }

  if (Object.keys(update).length === 1) {
    return Response.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("emissioni_clienti")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Esiste già un cliente con questo nome" }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Cliente non trovato" }, { status: 404 });
  }
  return Response.json(data);
}

// Elimina il cliente (lo storico avvisi si cancella a cascata)
export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id non valido" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("emissioni_clienti")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return Response.json({ error: "Cliente non trovato" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
