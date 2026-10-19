import { getSupabase } from "../../../../../lib/supabase";
import { inviaAvvisoEmissioni } from "../../../../../lib/mail-emissioni";
import { statoEmissione, avvisiPersonalizzati } from "../../../../../lib/emissioni";
import { oggiRoma } from "../../../../../lib/scadenze";

export const dynamic = "force-dynamic";

// Invio manuale dell'avviso scadenza emissioni.
// Viene registrato come l'avviso attualmente dovuto (1°, 2° o 3°); se nessuno è dovuto, come il
// primo non ancora inviato. Si può indicare un numero preciso con { "numero": 1|2|3 }.
export async function POST(request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id non valido" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  let numero = null;
  if (body.numero != null) {
    numero = Number(body.numero);
    if (![1, 2, 3].includes(numero)) {
      return Response.json({ error: "Numero avviso non valido (1, 2 o 3)" }, { status: 400 });
    }
  }

  const supabase = getSupabase();
  const { data: cliente, error } = await supabase
    .from("emissioni_clienti")
    .select("*, emissioni_notifiche(numero_avviso, data_scadenza_rif, data_invio_effettiva, status)")
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

  if (!numero) {
    numero = statoEmissione(
      cliente.data_scadenza,
      oggiRoma(),
      avvisiPersonalizzati(cliente),
      cliente.emissioni_notifiche
    ).numeroManuale;
  }

  const r = await inviaAvvisoEmissioni(cliente);

  const { error: logErr } = await supabase.from("emissioni_notifiche").insert({
    cliente_id: cliente.id,
    data_scadenza_rif: cliente.data_scadenza,
    numero_avviso: numero,
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
    numero_avviso: numero,
    ...(logErr ? { avviso: "Mail inviata ma storico non salvato: " + logErr.message } : {}),
  });
}
