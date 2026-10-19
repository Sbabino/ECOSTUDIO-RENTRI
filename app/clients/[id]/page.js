"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { prossimaScadenza } from "../../../lib/scadenze";
import { isoValida } from "../../../lib/emissioni";

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
  header: {
    background: "#115e59",
    color: "#fff",
    borderRadius: 12,
    padding: "20px 24px",
    margin: "16px 0 24px",
  },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    border: "1px solid #0f766e",
    marginBottom: 24,
  },
  cardTitle: { fontSize: 16, fontWeight: 600, margin: "0 0 16px" },
  row: { display: "flex", gap: 32, flexWrap: "wrap", fontSize: 14, marginBottom: 14 },
  label: { color: "#64748b", fontSize: 13 },
  actions: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 },
  input: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    width: 110,
  },
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
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 16,
  },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, display: "block" },
  inputFull: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    boxSizing: "border-box",
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
  msgErr: { background: "#fef2f2", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  msgOk: { background: "#ecfdf5", color: "#065f46", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
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

const fmtData = (ms) => new Date(ms).toLocaleDateString("it-IT", { timeZone: "UTC" });
const fmtIso = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

export default function ClientPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [form, setForm] = useState({
    ragione_sociale: "",
    email: "",
    telefono: "",
    data_primo_carico: "",
    frequenza_giorni: 30,
  });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/clients/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setMsg({ type: "err", text: data.error });
      return;
    }
    setClient(data);
    setForm({
      ragione_sociale: data.ragione_sociale || "",
      email: data.email || "",
      telefono: data.telefono || "",
      data_primo_carico: data.data_primo_carico || "",
      frequenza_giorni: data.frequenza_giorni,
    });
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  useEffect(() => {
    load();
  }, [id]);

  // Invia solo i campi cambiati rispetto a quelli salvati
  function campiModificati() {
    if (!client) return {};
    const mod = {};
    const nome = form.ragione_sociale.replace(/\s+/g, " ").trim();
    if (nome !== (client.ragione_sociale || "")) mod.ragione_sociale = nome;
    if (form.email.trim() !== (client.email || "")) mod.email = form.email.trim();
    if (form.telefono.trim() !== (client.telefono || "")) mod.telefono = form.telefono.trim();
    if (form.data_primo_carico !== (client.data_primo_carico || "")) mod.data_primo_carico = form.data_primo_carico;
    if (Number(form.frequenza_giorni) !== client.frequenza_giorni) mod.frequenza_giorni = Number(form.frequenza_giorni);
    return mod;
  }

  async function salvaAnagrafica(e) {
    e.preventDefault();
    const mod = campiModificati();
    if (Object.keys(mod).length === 0) {
      return setMsg({ type: "ok", text: "Nessuna modifica da salvare" });
    }
    setBusy(true);
    setMsg({ type: "", text: "" });
    const res = await fetch(`/api/clients/${id}`, {
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
    if (!window.confirm(`Inviare la mail a ${client.ragione_sociale} (${client.email})?`)) return;
    setBusy(true);
    setMsg({ type: "", text: "" });
    const res = await fetch(`/api/clients/${id}/send`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ type: "err", text: data.error });
    setMsg({ type: "ok", text: "Mail inviata" });
    load();
  }

  async function caricaFile(file) {
    if (!file) return;
    setBusy(true);
    setMsg({ type: "", text: "" });
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/clients/${id}/file`, { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ type: "err", text: data.error });
    setMsg({ type: "ok", text: "File caricato" });
    load();
  }

  if (!client) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          {msg.text ? <div style={s.msgErr}>{msg.text}</div> : <p>Caricamento...</p>}
          <Link href="/" style={s.back}>← Torna all'elenco</Link>
        </div>
      </div>
    );
  }

  // Anteprima della prossima scadenza con i valori che stai scrivendo (prima di salvare)
  const freqNum = Number(form.frequenza_giorni);
  const formValido = isoValida(form.data_primo_carico) && Number.isInteger(freqNum) && freqNum >= 1 && freqNum <= 365;
  const prox = prossimaScadenza(client.data_primo_carico, client.frequenza_giorni);
  const proxForm = formValido ? prossimaScadenza(form.data_primo_carico, freqNum) : null;
  const modificato = Object.keys(campiModificati()).length > 0;
  const storico = client.notifications || [];

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link href="/" style={s.back}>← Torna all'elenco</Link>

        <header style={s.header}>
          <h1 style={s.title}>{client.ragione_sociale}</h1>
        </header>

        {msg.text && <div style={msg.type === "err" ? s.msgErr : s.msgOk}>{msg.text}</div>}

        <section style={s.card}>
          <h2 style={s.cardTitle}>Anagrafica e scadenza</h2>
          <form onSubmit={salvaAnagrafica}>
            <div style={s.formGrid}>
              <div>
                <label style={s.fieldLabel}>Denominazione sociale *</label>
                <input style={s.inputFull} name="ragione_sociale" value={form.ragione_sociale} onChange={handleChange} required />
              </div>
              <div>
                <label style={s.fieldLabel}>Email *</label>
                <input style={s.inputFull} name="email" type="email" value={form.email} onChange={handleChange} required />
              </div>
              <div>
                <label style={s.fieldLabel}>Telefono</label>
                <input style={s.inputFull} name="telefono" value={form.telefono} onChange={handleChange} />
              </div>
              <div>
                <label style={s.fieldLabel}>Data primo carico rifiuti *</label>
                <input style={s.inputFull} name="data_primo_carico" type="date" value={form.data_primo_carico} onChange={handleChange} required />
              </div>
              <div>
                <label style={s.fieldLabel}>Ogni quanti giorni *</label>
                <input
                  style={s.inputFull}
                  name="frequenza_giorni"
                  type="number"
                  min={1}
                  max={365}
                  value={form.frequenza_giorni}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div style={s.row}>
              <div>
                <div style={s.label}>Prossima scadenza (salvata)</div>
                {fmtData(prox.ms)} ({prox.giorni} gg)
              </div>
              {modificato && proxForm && (
                <div>
                  <div style={s.label}>Con le modifiche</div>
                  <strong>{fmtData(proxForm.ms)} ({proxForm.giorni} gg)</strong>
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
                  onClick={() =>
                    setForm({
                      ragione_sociale: client.ragione_sociale || "",
                      email: client.email || "",
                      telefono: client.telefono || "",
                      data_primo_carico: client.data_primo_carico || "",
                      frequenza_giorni: client.frequenza_giorni,
                    })
                  }
                  disabled={busy}
                >
                  Annulla modifiche
                </button>
              )}
            </div>
          </form>
        </section>

        <section style={s.card}>
          <h2 style={s.cardTitle}>Documento</h2>
          <div style={s.actions}>
            {client.file_word_path ? (
              <a style={{ color: "#0f766e", fontWeight: 600 }} href={`/api/clients/${id}/file`} target="_blank" rel="noreferrer">
                Scarica documento
              </a>
            ) : (
              <span style={s.label}>Nessun file caricato</span>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              disabled={busy}
              onChange={(e) => caricaFile(e.target.files[0])}
            />
          </div>
        </section>

        <section style={s.card}>
          <h2 style={s.cardTitle}>Invia avviso</h2>
          <button style={s.btn} onClick={inviaOra} disabled={busy}>Invia mail ora</button>
        </section>

        <section style={s.card}>
          <h2 style={s.cardTitle}>Storico invii ({storico.length})</h2>
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
                  <td style={s.td}>
                    {n.data_invio_effettiva
                      ? new Date(n.data_invio_effettiva).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                  </td>
                  <td style={s.td}>{n.tipo_invio === "manuale" ? "manuale" : "automatico"}</td>
                  <td style={s.td}>{n.status === "sent" ? "inviata" : n.status === "failed" ? "fallita" : n.status}</td>
                  <td style={s.td}>{fmtIso(n.data_invio_prevista)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {storico.length === 0 && <div style={s.muted}>Nessun invio registrato.</div>}
        </section>
      </div>
    </div>
  );
}
