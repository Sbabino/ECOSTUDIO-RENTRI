import { createClient } from "@supabase/supabase-js";

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
