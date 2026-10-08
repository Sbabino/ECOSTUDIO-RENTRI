import { createClient } from "@supabase/supabase-js";
import { inviaAvviso } from "../../../../../lib/mail";

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !client) {
    return Response.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  const r = await inviaAvviso(client);
  const oggi = new Date().toISOString().slice(0, 10);

  await supabase.from("notifications").insert({
    client_id: client.id,
    data_invio_prevista: oggi,
    data_invio_effettiva: r.ok ? new Date().toISOString() : null,
    status: r.ok ? "sent" : "failed",
    tipo_invio: "manuale",
  });

  if (!r.ok) {
    return Response.json({ error: r.error }, { status: 502 });
  }
  return Response.json({ id: r.id });
}
