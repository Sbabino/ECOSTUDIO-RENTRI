import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !client) {
    return Response.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "RESEND_API_KEY mancante" }, { status: 500 });
  }

  const studioEmail = process.env.STUDIO_EMAIL;
  const nome = escapeHtml(client.ragione_sociale);
  const contatto = studioEmail
    ? `<p>Questo messaggio è automatico. Per informazioni scrivete a <a href="mailto:${escapeHtml(studioEmail)}">${escapeHtml(studioEmail)}</a>.</p>`
    : `<p>Questo messaggio è automatico.</p>`;

  const html = `
    <p>Gentile ${nome},</p>
    <p>le ricordiamo la prossima scadenza per la gestione dei rifiuti.</p>
    ${contatto}
    <p>EcoStudio</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EcoStudio <noreply@ecostudiomc.it>",
      to: [client.email],
      subject: "Promemoria scadenza - EcoStudio",
      html,
      ...(studioEmail ? { reply_to: studioEmail } : {}),
    }),
  });

  const result = await res.json();
  const inviata = res.ok;

  // Registra l'invio nello storico, anche se fallito
  await supabase.from("notifications").insert({
    client_id: client.id,
    data_invio_prevista: new Date().toISOString().slice(0, 10),
    data_invio_effettiva: inviata ? new Date().toISOString() : null,
    status: inviata ? "sent" : "failed",
    tipo_invio: "manuale",
  });

  if (!inviata) {
    return Response.json(
      { error: result.message || "Invio fallito" },
      { status: 502 }
    );
  }

  return Response.json({ id: result.id });
}
