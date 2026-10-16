import { getSupabase } from "../../../../../lib/supabase";
import { inviaAvvisoEmissioni } from "../../../../../lib/mail-emissioni";

export const dynamic = "force-dynamic";

// Invio manuale dell'avviso scadenza emissioni
export async function POST(request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id non valido" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: cliente, error } = await supabase
    .from("emissioni_clienti")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!cliente) {
    return Response.json({ error: "Cliente non trovato" }, { status: 404 });
  }
  if (!cliente.email) {
    return Response.json({ error: "Questo cliente non ha un indirizzo email" }, { status: 400 });
  }

  const r = await inviaAvvisoEmissioni(cliente);

  const { error: logErr } = await supabase.from("emissioni_notifiche").insert({
    cliente_id: cliente.id,
    data_scadenza_rif: cliente.data_scadenza,
    data_invio_effettiva: r.ok ? new Date().toISOString() : null,
    status: r.ok ? "sent" : "failed",
    tipo_invio: "manuale",
    errore: r.ok ? null : r.error,
  });

  if (!r.ok) {
    return Response.json({ error: r.error }, { status: 502 });
  }
  return Response.json({
    id: r.id,
    ...(logErr ? { avviso: "Mail inviata ma storico non salvato: " + logErr.message } : {}),
  });
}
