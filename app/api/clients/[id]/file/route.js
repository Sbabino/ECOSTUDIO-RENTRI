import { createClient } from "@supabase/supabase-js";

const BUCKET = "rentri-documents";
const MAX_BYTES = 4 * 1024 * 1024;
const TIPI_AMMESSI = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Carica il file del cliente
export async function POST(request, { params }) {
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");

  if (!file || typeof file === "string") {
    return Response.json({ error: "Nessun file selezionato" }, { status: 400 });
  }
  if (!TIPI_AMMESSI.includes(file.type)) {
    return Response.json({ error: "Formato non ammesso (solo PDF o Word)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File troppo grande (max 4 MB)" }, { status: 400 });
  }

  const supabase = getSupabase();
  const nomeSicuro = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `clients/${id}/${Date.now()}-${nomeSicuro}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) {
    return Response.json({ error: upErr.message }, { status: 500 });
  }

  const { error: dbErr } = await supabase
    .from("clients")
    .update({ file_word_path: path, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (dbErr) {
    return Response.json({ error: dbErr.message }, { status: 500 });
  }

  return Response.json({ path }, { status: 201 });
}

// Apre il file del cliente con un link temporaneo di 60 secondi
export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: client, error } = await supabase
    .from("clients")
    .select("file_word_path")
    .eq("id", id)
    .single();

  if (error || !client?.file_word_path) {
    return Response.json({ error: "Nessun file" }, { status: 404 });
  }

  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(client.file_word_path, 60);

  if (signErr) {
    return Response.json({ error: signErr.message }, { status: 500 });
  }

  return Response.redirect(data.signedUrl, 302);
}
