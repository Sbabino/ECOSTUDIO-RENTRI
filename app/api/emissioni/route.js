import { getSupabase, leggiTutti } from "../../../lib/supabase";
import { EMAIL_REGEX, isoValida, CAMPI_AVVISO, validaAvvisi, normalizzaAvvisi } from "../../../lib/emissioni";

export const dynamic = "force-dynamic";

// Elenco clienti emissioni con storico avvisi
export async function GET() {
  try {
    const supabase = getSupabase();
    const clienti = await leggiTutti((da, a) =>
      supabase
        .from("emissioni_clienti")
        .select("*, emissioni_notifiche(numero_avviso, data_scadenza_rif, data_invio_effettiva, status, tipo_invio)")
        .order("id", { ascending: true })
        .range(da, a)
    );
    return Response.json({
      clienti,
      // Finché non è attivo, il cron NON invia nulla (simula soltanto)
      invio_automatico: process.env.EMISSIONI_INVIO_AUTOMATICO === "true",
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Nuovo cliente emissioni (inserimento singolo)
export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  const ragione_sociale = (body.ragione_sociale || "").replace(/\s+/g, " ").trim();
  const email = (body.email || "").trim();
  const telefono = (body.telefono || "").trim();
  const data_scadenza = body.data_scadenza;
  // Facoltative: se vuote valgono i predefiniti (scadenza meno 90, 60 e 30 giorni)
  const avvisiIn = CAMPI_AVVISO.map((campo) => (body[campo] ? String(body[campo]) : null));

  if (!ragione_sociale || !data_scadenza) {
    return Response.json({ error: "Anagrafica cliente e scadenza sono obbligatorie" }, { status: 400 });
  }
  if (ragione_sociale.length > 255) {
    return Response.json({ error: "Nome troppo lungo (max 255 caratteri)" }, { status: 400 });
  }
  if (!isoValida(data_scadenza)) {
    return Response.json({ error: "Data di scadenza non valida" }, { status: 400 });
  }
  for (let i = 0; i < avvisiIn.length; i++) {
    if (avvisiIn[i] && !isoValida(avvisiIn[i])) {
      return Response.json({ error: `Data del ${i + 1}° avviso non valida` }, { status: 400 });
    }
  }
  const erroreAvvisi = validaAvvisi(data_scadenza, avvisiIn);
  if (erroreAvvisi) {
    return Response.json({ error: erroreAvvisi }, { status: 400 });
  }
  const avvisi = normalizzaAvvisi(data_scadenza, avvisiIn);
  if (email && (!EMAIL_REGEX.test(email) || email.length > 255)) {
    return Response.json({ error: "Email non valida" }, { status: 400 });
  }
  if (telefono.length > 30) {
    return Response.json({ error: "Telefono troppo lungo (max 30 caratteri)" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("emissioni_clienti")
    .insert({
      ragione_sociale,
      email: email || null,
      telefono: telefono || null,
      data_scadenza,
      ...Object.fromEntries(CAMPI_AVVISO.map((campo, i) => [campo, avvisi[i]])),
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Esiste già un cliente con questo nome" }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
