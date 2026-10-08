import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET() {
  const { data, error } = await getSupabase()
    .from("clients")
    .select("*, notifications(data_invio_effettiva, status, tipo_invio)");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();

  const ragione_sociale = (body.ragione_sociale || "").trim();
  const email = (body.email || "").trim();
  const data_primo_carico = body.data_primo_carico;
  const frequenza_giorni = Number(body.frequenza_giorni || 30);

  if (!ragione_sociale || !email || !data_primo_carico) {
    return Response.json(
      { error: "Campi obbligatori mancanti" },
      { status: 400 }
    );
  }

  if (![15, 30, 60].includes(frequenza_giorni)) {
    return Response.json(
      { error: "Frequenza non valida (15, 30 o 60)" },
      { status: 400 }
    );
  }

  const { data, error } = await getSupabase()
    .from("clients")
    .insert({
      ragione_sociale,
      email,
      telefono: body.telefono || null,
      data_primo_carico,
      frequenza_giorni,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
