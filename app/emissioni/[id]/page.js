"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import { oggiRoma } from "../../../lib/scadenze";
import {
  statoEmissione,
  avvisoPredefinito,
  isoValida,
  EMAIL_REGEX,
  MESI_PREAVVISO,
} from "../../../lib/emissioni";

const fmtIso = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const fmtDataOra = (ts) =>
  new Date(ts).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });

const s = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "#0f172a",
    padding: "32px 16px",
  },
  container: { maxWidth: 1100, margin: "0 auto" },
  back: { color: "#0f766e", fontWeight: 600, fontSize: 14, textDecoration: "none" },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    border: "1px solid #0f766e",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    marginBottom: 24,
  },
  cardTitle: { fontSize: 16, fontWeight: 600, margin: "0 0 16px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, display: "block" },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    boxSizing: "border-box",
  },
  hint: { fontSize: 12, color: "#64748b", marginTop: 4, display: "block" },
  stato: { display: "flex", gap: 32, flexWrap: "wrap", fontSize: 14, marginBottom: 16 },
  statoLabel: { color: "#64748b", fontSize: 13 },
  actions: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 4 },
  btn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #94a3b8",
    background: "#fff",
    color: "#334155",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  btnOutline: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #0f766e",
    background: "#fff",
    color: "#0f766e",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  msgErr: { background: "#fef2f2", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, margin: "16px 0", fontSize: 14 },
  msgOk: { background: "#ecfdf5", color: "#065f46", padding: "10px 14px", borderRadius: 8, margin: "16px 0", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "2px solid #e2e8f0",
    color: "#64748b",
    fontWeight: 600,
    fontSize: 13,
  },
  td: { padding: "12px", borderBottom: "1px solid #f1f5f9" },
  muted: { color: "#94a3b8", textAlign: "center", padding: 24 },
};

export default function EmissioniClientePage() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [form, setForm] = useState({ ragione_sociale: "", email: "", telefono: "", data_scadenza: "", data_avviso: "" });
  const [avvisoToccato, setAvvisoToccato] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  function formDa(c) {
    return {
      ragione_sociale: c.ragione_sociale || "",
      email: c.email || "",
      telefono: c.telefono || "",
      data_scadenza: c.data_scadenza || "",
      data_avviso: c.data_avviso || "", // vuoto = predefinito
    };
  }

  async function load() {
    const res = await fetch(`/api/emissioni/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg({ type: "err", text: data.error || "Errore nel caricamento" });
      return;
    }
    setCliente(data);
    setForm(formDa(data));
    setAvvisoToccato(false);
  }

  useEffect(() => {
    load().catch(() => setMsg({ type: "err", text: "Errore di connessione" }));
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      // Cambiando la scadenza senza toccare la data avviso, questa torna al predefinito
      // (stessa regola del server). Se la scadenza torna quella salvata, ripristino l'avviso salvato.
      if (name === "data_scadenza" && !avvisoToccato && cliente) {
        next.data_avviso = value !== cliente.data_scadenza ? "" : cliente.data_avviso || "";
      }
      return next;
    });
    if (name === "data_avviso") setAvvisoToccato(true);
  }

  function campiModificati() {
    if (!cliente) return {};
    const orig = formDa(cliente);
    const mod = {};
    const nome = form.ragione_sociale.replace(/\s+/g, " ").trim();
    if (nome !== orig.ragione_sociale) mod.ragione_sociale = nome;
    if (form.email.trim() !== orig.email) mod.email = form.email.trim();
    if (form.telefono.trim() !== orig.telefono) mod.telefono = form.telefono.trim();
    if (form.data_scadenza !== orig.data_scadenza) mod.data_scadenza = form.data_scadenza;
    // Se la scadenza cambia e c'è una data avviso nel campo, va sempre inviata (altrimenti il server la azzera)
    if (form.data_avviso !== orig.data_avviso || (mod.data_scadenza && form.data_avviso)) {
      mod.data_avviso = form.data_avviso || null;
    }
    return mod;
  }

  function erroreForm() {
    if (!form.ragione_sociale.trim()) return "L'anagrafica cliente è obbligatoria";
    if (!isoValida(form.data_scadenza)) return "Scadenza emissioni non valida";
    if (form.data_avviso && !isoValida(form.data_avviso)) return "Data avviso non valida";
    if (form.data_avviso && form.data_avviso > form.data_scadenza) return "La data avviso non può essere dopo la scadenza";
    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) return "Email non valida";
    return "";
  }

  async function salva(e) {
    e.preventDefault();
    const mod = campiModificati();
    if (Object.keys(mod).length === 0) {
      return setMsg({ type: "ok", text: "Nessuna modifica da salvare" });
    }
    const err = erroreForm();
    if (err) return setMsg({ type: "err", text: err });

    setBusy(true);
    setMsg({ type: "", text: "" });
    const res = await fetch(`/api/emissioni/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mod),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ type: "err", text: data.error || "Salvataggio non riuscito" });
    setMsg({ type: "ok", text: "Anagrafica aggiornata" });
    load();
  }

  async function inviaOra() {
    if (!window.confirm(`Inviare l'avviso scadenza emissioni a ${cliente.ragione_sociale} (${cliente.email})?`)) return;
    setBusy(true);
    setMsg({ type: "", text: "" });
    const res = await fetch(`/api/emissioni/${id}/send`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setMsg({ type: "err", text: data.error || "Invio non riuscito" });
    else setMsg({ type: "ok", text: data.avviso || "Mail inviata" });
    load();
  }

  if (!cliente) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          {msg.text ? <div style={s.msgErr}>{msg.text}</div> : <p>Caricamento...</p>}
          <Link href="/emissioni" style={s.back}>← Torna allo scadenziario</Link>
        </div>
      </div>
    );
  }

  const modificato = Object.keys(campiModificati()).length > 0;
  const formValido = isoValida(form.data_scadenza) && (!form.data_avviso || isoValida(form.data_avviso));
  const oggi = oggiRoma();
  const stSalvato = statoEmissione(cliente.data_scadenza, oggi, cliente.data_avviso);
  const stForm = formValido ? statoEmissione(form.data_scadenza, oggi, form.data_avviso || null) : null;
  const storico = cliente.emissioni_notifiche || [];

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link href="/emissioni" style={s.back}>← Torna allo scadenziario</Link>
        <div style={{ height: 16 }} />

        <SiteHeader attiva="emissioni" sottotitolo={`Emissioni in atmosfera - ${cliente.ragione_sociale}`} />

        {msg.text && <div style={msg.type === "err" ? s.msgErr : s.msgOk}>{msg.text}</div>}

        <section style={s.card}>
          <h2 style={s.cardTitle}>Anagrafica e scadenza</h2>
          <form onSubmit={salva}>
            <div style={s.grid}>
              <div>
                <label style={s.label}>Anagrafica cliente *</label>
                <input style={s.input} name="ragione_sociale" value={form.ragione_sociale} onChange={handleChange} required />
              </div>
              <div>
                <label style={s.label}>Email (per l&apos;avviso)</label>
                <input style={s.input} name="email" type="email" value={form.email} onChange={handleChange} />
                {!form.email.trim() && <span style={{ ...s.hint, color: "#dc2626" }}>Senza email non parte nessun avviso</span>}
              </div>
              <div>
                <label style={s.label}>Telefono</label>
                <input style={s.input} name="telefono" value={form.telefono} onChange={handleChange} />
              </div>
              <div>
                <label style={s.label}>Scadenza emissioni *</label>
                <input style={s.input} name="data_scadenza" type="date" value={form.data_scadenza} onChange={handleChange} required />
              </div>
              <div>
                <label style={s.label}>Data avviso (facoltativa)</label>
                <input
                  style={s.input}
                  name="data_avviso"
                  type="date"
                  value={form.data_avviso}
                  max={form.data_scadenza || undefined}
                  onChange={handleChange}
                />
                <span style={s.hint}>
                  {form.data_avviso
                    ? "Personalizzata. Svuota il campo per tornare al predefinito."
                    : isoValida(form.data_scadenza)
                    ? `Vuota = predefinita: ${fmtIso(avvisoPredefinito(form.data_scadenza))} (${MESI_PREAVVISO} mesi prima)`
                    : `Vuota = ${MESI_PREAVVISO} mesi prima della scadenza`}
                </span>
              </div>
            </div>

            <div style={s.stato}>
              <div>
                <div style={s.statoLabel}>Stato salvato</div>
                {stSalvato.scaduta ? `scaduta da ${-stSalvato.giorni} gg` : `scade tra ${stSalvato.giorni} gg`} · avviso dal {fmtIso(stSalvato.avvisoIso)}
              </div>
              {modificato && stForm && (
                <div>
                  <div style={s.statoLabel}>Con le modifiche</div>
                  <strong>
                    {stForm.scaduta ? `scaduta da ${-stForm.giorni} gg` : `scade tra ${stForm.giorni} gg`} · avviso dal {fmtIso(stForm.avvisoIso)}
                  </strong>
                </div>
              )}
            </div>

            <div style={s.actions}>
              <button type="submit" style={{ ...s.btn, opacity: busy || !modificato ? 0.5 : 1 }} disabled={busy || !modificato}>
                {busy ? "Salvataggio..." : "Salva modifiche"}
              </button>
              {modificato && (
                <button
                  type="button"
                  style={s.btnGhost}
                  disabled={busy}
                  onClick={() => {
                    setForm(formDa(cliente));
                    setAvvisoToccato(false);
                  }}
                >
                  Annulla modifiche
                </button>
              )}
            </div>
          </form>
        </section>

        <section style={s.card}>
          <h2 style={s.cardTitle}>Invia avviso</h2>
          <div style={s.actions}>
            <button
              style={{ ...s.btnOutline, opacity: cliente.email && !modificato ? 1 : 0.4 }}
              onClick={inviaOra}
              disabled={busy || !cliente.email || modificato}
            >
              Invia mail ora
            </button>
            {!cliente.email && <span style={s.hint}>Manca l&apos;email del cliente</span>}
            {modificato && <span style={s.hint}>Salva prima le modifiche: l&apos;avviso usa i dati salvati</span>}
          </div>
        </section>

        <section style={s.card}>
          <h2 style={s.cardTitle}>Storico avvisi ({storico.length})</h2>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Data e ora</th>
                <th style={s.th}>Tipo</th>
                <th style={s.th}>Stato</th>
                <th style={s.th}>Scadenza di riferimento</th>
              </tr>
            </thead>
            <tbody>
              {storico.map((n) => (
                <tr key={n.id}>
                  <td style={s.td}>{n.data_invio_effettiva ? fmtDataOra(n.data_invio_effettiva) : "—"}</td>
                  <td style={s.td}>{n.tipo_invio === "manuale" ? "manuale" : "automatico"}</td>
                  <td style={s.td}>
                    {n.status === "sent" ? "inviato" : n.status === "failed" ? "fallito" : n.status}
                    {n.status === "failed" && n.errore && (
                      <>
                        <br />
                        <span style={s.hint}>{n.errore}</span>
                      </>
                    )}
                  </td>
                  <td style={s.td}>{fmtIso(n.data_scadenza_rif)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {storico.length === 0 && <div style={s.muted}>Nessun avviso registrato.</div>}
        </section>
      </div>
    </div>
  );
}
