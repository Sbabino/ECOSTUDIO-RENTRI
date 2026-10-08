function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function inviaAvviso(client) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY mancante" };

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

  const json = await res.json();
  return res.ok
    ? { ok: true, id: json.id }
    : { ok: false, error: json.message || "Invio fallito" };
}
