import { getSupabase } from "../../../../lib/supabase";
import { EMAIL_REGEX, isoValida } from "../../../../lib/emissioni";

export const dynamic = "force-dynamic";

// Modifica scadenza, email, telefono, anagrafica
export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id non valido" }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  const update = { updated_at: new Date().toISOString() };

  if ("data_scadenza" in body) {
    if (!isoValida(body.data_scadenza)) {
      return Response.json({ error: "Data di scadenza non valida" }, { status: 400 });
    }
    update.data_scadenza = body.data_scadenza;
  }

  if ("ragione_sociale" in body) {
    const nome = String(body.ragione_sociale || "").replace(/\s+/g, " ").trim();
    if (!nome || nome.length > 255) {
      return Response.json({ error: "Anagrafica cliente non valida" }, { status: 400 });
    }
    update.ragione_sociale = nome;
  }

  if ("email" in body) {
    const email = String(body.email || "").trim();
    if (email && (!EMAIL_REGEX.test(email) || email.length > 255)) {
      return Response.json({ error: "Email non valida" }, { status: 400 });
    }
    update.email = email || null;
  }

  if ("telefono" in body) {
    const tel = String(body.telefono || "").trim();
    if (tel.length > 30) {
      return Response.json({ error: "Telefono troppo lungo (max 30 caratteri)" }, { status: 400 });
    }
    update.telefono = tel || null;
  }

  if (Object.keys(update).length === 1) {
    return Response.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("emissioni_clienti")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Esiste già un cliente con questo nome" }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Cliente non trovato" }, { status: 404 });
  }
  return Response.json(data);
}

// Elimina il cliente (lo storico avvisi si cancella a cascata)
export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id non valido" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("emissioni_clienti")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return Response.json({ error: "Cliente non trovato" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
