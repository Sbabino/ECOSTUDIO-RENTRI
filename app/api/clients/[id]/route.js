import { createClient } from "@supabase/supabase-js";

const BUCKET = "rentri-documents";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Dettaglio cliente con tutto lo storico degli invii
export async function GET(request, { params }) {
  const { id } = await params;
  const { data, error } = await getSupabase()
    .from("clients")
    .select("*, notifications(*)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return Response.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  data.notifications = (data.notifications || []).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  return Response.json(data);
}

// Elimina il cliente con storico invii e documenti caricati
export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id non valido" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: client, error: readErr } = await supabase
    .from("clients")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (readErr) {
    return Response.json({ error: readErr.message }, { status: 500 });
  }
  if (!client) {
    return Response.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  let { error: delErr } = await supabase.from("clients").delete().eq("id", id);

  // 23503 = chiave esterna: nel DB lo storico invii non si cancella a cascata.
  // Elimino prima lo storico e riprovo (così, se la prima cancellazione fallisce per altro, lo storico non si perde).
  if (delErr && delErr.code === "23503") {
    const { error: nErr } = await supabase.from("notifications").delete().eq("client_id", id);
    if (nErr) {
      return Response.json({ error: nErr.message }, { status: 500 });
    }
    ({ error: delErr } = await supabase.from("clients").delete().eq("id", id));
  }

  if (delErr) {
    return Response.json({ error: delErr.message }, { status: 500 });
  }

  // Pulizia documenti: ogni upload crea un file nuovo, li rimuovo tutti.
  // Se fallisce il cliente è comunque già eliminato: lo segnalo senza bloccare.
  let documentiRimossi = true;
  try {
    const cartella = `clients/${id}`;
    const { data: files } = await supabase.storage.from(BUCKET).list(cartella, { limit: 1000 });
    if (files && files.length > 0) {
      const { error: rmErr } = await supabase.storage
        .from(BUCKET)
        .remove(files.map((f) => `${cartella}/${f.name}`));
      if (rmErr) documentiRimossi = false;
    }
  } catch {
    documentiRimossi = false;
  }

  return Response.json({ ok: true, documentiRimossi });
}

// Modifica frequenza e/o spunta "Caricamento su RENTRI ESEGUITO"
export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const update = { updated_at: new Date().toISOString() };

  if ("frequenza_giorni" in body) {
    const freq = Number(body.frequenza_giorni);
    if (!Number.isInteger(freq) || freq < 1 || freq > 365) {
      return Response.json(
        { error: "Frequenza non valida (da 1 a 365 giorni)" },
        { status: 400 }
      );
    }
    update.frequenza_giorni = freq;
  }

  if ("rentri_caricato" in body) {
    if (typeof body.rentri_caricato !== "boolean") {
      return Response.json({ error: "Valore non valido" }, { status: 400 });
    }
    update.rentri_caricato = body.rentri_caricato;
  }

  if (Object.keys(update).length === 1) {
    return Response.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("clients")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data);
}
