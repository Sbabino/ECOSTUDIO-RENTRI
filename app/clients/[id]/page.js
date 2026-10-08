"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { prossimaScadenza } from "../../../lib/scadenze";

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
  const [freq, setFreq] = useState(30);
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
    setFreq(data.frequenza_giorni);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function salvaFrequenza() {
    setBusy(true);
    setMsg({ type: "", text: "" });
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frequenza_giorni: Number(freq) }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ type: "err", text: data.error });
    setMsg({ type: "ok", text: "Frequenza aggiornata" });
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

  const prox = prossimaScadenza(client.data_primo_carico, client.frequenza_giorni);
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
          <h2 style={s.cardTitle}>Dati e scadenza</h2>
          <div style={s.row}>
            <div><div style={s.label}>Email</div>{client.email}</div>
            <div><div style={s.label}>Telefono</div>{client.telefono || "—"}</div>
            <div><div style={s.label}>Primo carico</div>{fmtIso(client.data_primo_carico)}</div>
            <div><div style={s.label}>Prossima scadenza</div>{fmtData(prox.ms)} ({prox.giorni} gg)</div>
          </div>

          <div style={s.actions}>
            <label style={s.label}>Ogni quanti giorni</label>
            <input
              style={s.input}
              type="number"
              min={1}
              max={365}
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
            />
            <button style={s.btn} onClick={salvaFrequenza} disabled={busy}>Salva frequenza</button>
          </div>
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
