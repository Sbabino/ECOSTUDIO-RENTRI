import { createClient } from "@supabase/supabase-js";
import { inviaAvviso } from "../../../../lib/mail";
import { prossimaScadenza, oggiRoma, toIso } from "../../../../lib/scadenze";

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*, notifications(data_invio_prevista, status, tipo_invio)");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const oggi = oggiRoma();
  const inviati = [];
  const saltati = [];
  const falliti = [];

  for (const c of clients) {
    const prox = prossimaScadenza(c.data_primo_carico, c.frequenza_giorni, oggi);
    if (prox.giorni !== 0) continue;

    const gia = (c.notifications || []).some(
      (n) => n.tipo_invio === "auto" && n.status === "sent" && n.data_invio_prevista === prox.iso
    );
    if (gia) {
      saltati.push(c.id);
      continue;
    }

    const r = await inviaAvviso(c);

    await supabase.from("notifications").insert({
      client_id: c.id,
      data_invio_prevista: prox.iso,
      data_invio_effettiva: r.ok ? new Date().toISOString() : null,
      status: r.ok ? "sent" : "failed",
      tipo_invio: "auto",
    });

    (r.ok ? inviati : falliti).push(c.id);
  }

  return Response.json({ oggi: toIso(oggi), inviati, saltati, falliti });
}
