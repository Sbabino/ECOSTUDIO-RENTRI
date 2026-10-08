import { createClient } from "@supabase/supabase-js";

const BUCKET = "rentri-documents";
const MAX_ALLEGATO_BYTES = 4 * 1024 * 1024;

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

// Legge il documento del cliente da Supabase e lo prepara come allegato
async function leggiAllegato(client) {
  if (!client.file_word_path) return null;

  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .download(client.file_word_path);

  if (error) {
    throw new Error("Impossibile leggere il documento: " + error.message);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.length > MAX_ALLEGATO_BYTES) {
    throw new Error("Documento troppo grande per l'allegato (max 4 MB)");
  }

  // Il nome nel bucket ha un prefisso numerico (timestamp): lo tolgo
  const nome = client.file_word_path.split("/").pop().replace(/^\d+-/, "");

  return { filename: nome, content: buffer.toString("base64") };
}

export async function inviaAvviso(client) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY mancante" };

  let allegato = null;
  try {
    allegato = await leggiAllegato(client);
  } catch (err) {
    // Se il documento non si legge, non mando la mail senza allegato
    return { ok: false, error: err.message };
  }

  const studioEmail = process.env.STUDIO_EMAIL;
  const nome = escapeHtml(client.ragione_sociale);
  const contatto = studioEmail
    ? `<p>Questo messaggio è automatico. Per informazioni scrivete a <a href="mailto:${escapeHtml(studioEmail)}">${escapeHtml(studioEmail)}</a>.</p>`
    : `<p>Questo messaggio è automatico.</p>`;

  const html = `
    <p>Gentile ${nome},</p>
    <p>le ricordiamo la prossima scadenza per la gestione dei rifiuti.</p>
    ${allegato ? "<p>In allegato trova il documento di riferimento.</p>" : ""}
    ${contatto}
    <p>EcoStudio</p>
  `;

  const body = {
    from: "EcoStudio <noreply@ecostudiomc.it>",
    to: [client.email],
    subject: "Promemoria scadenza - EcoStudio",
    html,
    ...(studioEmail ? { reply_to: studioEmail } : {}),
    ...(allegato ? { attachments: [allegato] } : {}),
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  return res.ok
    ? { ok: true, id: json.id }
    : { ok: false, error: json.message || "Invio fallito" };
}
