function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const fmtIt = (iso) => iso.split("-").reverse().join("/");

// =====================================================================
// TESTO PROVVISORIO: da definire con lo studio.
// Oggetto e corpo della mail si modificano solo qui.
// =====================================================================
const OGGETTO = "Promemoria analisi emissioni in atmosfera - EcoStudio";

function corpoHtml({ nome, scadenza, contatto }) {
  return `
    <p>Gentile ${nome},</p>
    <p>le ricordiamo che le analisi delle emissioni in atmosfera dovranno essere effettuate entro il <strong>${scadenza}</strong>.</p>
    ${contatto}
    <p>EcoStudio</p>
  `;
}

export async function inviaAvvisoEmissioni(cliente) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY mancante" };
  if (!cliente.email) return { ok: false, error: "Email del cliente mancante" };

  const studioEmail = process.env.STUDIO_EMAIL;
  const contatto = studioEmail
    ? `<p>Questo messaggio è automatico. Per informazioni scrivete a <a href="mailto:${escapeHtml(studioEmail)}">${escapeHtml(studioEmail)}</a>.</p>`
    : `<p>Questo messaggio è automatico.</p>`;

  const html = corpoHtml({
    nome: escapeHtml(cliente.ragione_sociale),
    scadenza: fmtIt(cliente.data_scadenza),
    contatto,
  });

  const body = {
    from: "EcoStudio <noreply@ecostudiomc.it>",
    to: [cliente.email],
    subject: OGGETTO,
    html,
    ...(studioEmail ? { reply_to: studioEmail } : {}),
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  return res.ok
    ? { ok: true, id: json.id }
    : { ok: false, error: json.message || "Invio fallito" };
}
