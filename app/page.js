"use client";

import { useEffect, useState } from "react";

const emptyForm = {
  ragione_sociale: "",
  email: "",
  telefono: "",
  data_primo_carico: "",
  frequenza_giorni: 30,
};

function prossimaScadenza(dataPrimo, freq) {
  const [y, m, d] = dataPrimo.split("-").map(Number);
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  let scadenza = new Date(y, m - 1, d);
  while (scadenza < oggi) {
    scadenza.setDate(scadenza.getDate() + freq);
  }
  const giorni = Math.round((scadenza - oggi) / 86400000);
  return { data: scadenza, giorni };
}

function coloreGiorni(giorni) {
  if (giorni <= 7) return "#dc2626";
  if (giorni <= 15) return "#d97706";
  return "#0f766e";
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "#0f172a",
    padding: "32px 16px",
  },
  container: { maxWidth: 1100, margin: "0 auto" },
    header: {
    background: "#115e59",
    color: "#ffffff",
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: 700, margin: 0, color: "#ffffff" },
  subtitle: { fontSize: 14, color: "#ccfbf1", margin: "4px 0 0" },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
    statCard: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "1px solid #0f766e",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },  
  statLabel: { fontSize: 13, color: "#64748b", margin: 0 },
  statValue: { fontSize: 30, fontWeight: 700, margin: "6px 0 0" },
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
  button: {
    marginTop: 16,
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  error: {
    background: "#fef2f2",
    color: "#b91c1c",
    padding: "10px 14px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "2px solid #e2e8f0",
    color: "#64748b",
    fontWeight: 600,
    fontSize: 13,
  },
  td: { padding: "12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  badge: (colore) => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background: colore + "1a",
    color: colore,
    fontWeight: 600,
    fontSize: 13,
  }),
  btnDisabled: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#94a3b8",
    fontSize: 13,
  },
  link: { color: "#0f766e", fontWeight: 600, fontSize: 13, marginRight: 10 },
  empty: { textAlign: "center", color: "#94a3b8", padding: 24 },
};

export default function Home() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  async function loadClients() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    if (data.error) setError(data.error);
    else setClients(data);
    setLoading(false);
  }

  useEffect(() => {
    loadClients().catch(() => {
      setError("Errore di connessione");
      setLoading(false);
    });
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }
    setForm(emptyForm);
    loadClients();
  }

  async function handleUpload(clientId, file) {
    if (!file) return;
    setError("");
    setUploadingId(clientId);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`/api/clients/${clientId}/file`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    setUploadingId(null);

    if (!res.ok) {
      setError(data.error);
      return;
    }
    loadClients();
  }
  async function handleSend(client) {
    if (!window.confirm(`Inviare la mail a ${client.ragione_sociale} (${client.email})?`)) return;
    setError("");
    setSendingId(client.id);

    const res = await fetch(`/api/clients/${client.id}/send`, { method: "POST" });
    const data = await res.json();
    setSendingId(null);

    if (!res.ok) {
      setError(data.error);
      return;
    }
    alert("Mail inviata");
  }
  const righe = clients
    .map((c) => ({ ...c, ...prossimaScadenza(c.data_primo_carico, c.frequenza_giorni) }))
    .sort((a, b) => a.giorni - b.giorni);

  const urgenti = righe.filter((r) => r.giorni <= 7).length;

  return (
    <div style={s.page}>
      <div style={s.container}>
        <header style={s.header}>
          <h1 style={s.title}>Portale RENTRI</h1>
          <p style={s.subtitle}>Gestione clienti, scadenze e notifiche</p>
        </header>

        <div style={s.stats}>
          <div style={s.statCard}>
            <p style={s.statLabel}>Clienti totali</p>
            <p style={s.statValue}>{clients.length}</p>
          </div>
          <div style={s.statCard}>
            <p style={s.statLabel}>Urgenti (≤ 7 giorni)</p>
            <p style={{ ...s.statValue, color: urgenti > 0 ? "#dc2626" : "#0f172a" }}>{urgenti}</p>
          </div>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <section style={s.card}>
          <h2 style={s.cardTitle}>Nuovo cliente</h2>
          <form onSubmit={handleSubmit}>
            <div style={s.grid}>
              <div>
                <label style={s.label}>Denominazione sociale *</label>
                <input style={s.input} name="ragione_sociale" value={form.ragione_sociale} onChange={handleChange} required />
              </div>
              <div>
                <label style={s.label}>Email *</label>
                <input style={s.input} name="email" type="email" value={form.email} onChange={handleChange} required />
              </div>
              <div>
                <label style={s.label}>Telefono</label>
                <input style={s.input} name="telefono" value={form.telefono} onChange={handleChange} />
              </div>
              <div>
                <label style={s.label}>Data primo carico rifiuti *</label>
                <input style={s.input} name="data_primo_carico" type="date" value={form.data_primo_carico} onChange={handleChange} required />
              </div>
              <div>
                <label style={s.label}>Frequenza notifiche</label>
                <select style={s.input} name="frequenza_giorni" value={form.frequenza_giorni} onChange={handleChange}>
                  <option value={15}>Ogni 15 giorni</option>
                  <option value={30}>Ogni 30 giorni</option>
                  <option value={60}>Ogni 60 giorni</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} style={{ ...s.button, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvataggio..." : "Aggiungi cliente"}
            </button>
          </form>
        </section>

        <section style={s.card}>
          <h2 style={s.cardTitle}>Clienti e scadenze</h2>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Cliente</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Prossima scadenza</th>
                <th style={s.th}>Giorni</th>
                <th style={s.th}>Documento</th>
                <th style={s.th}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{r.ragione_sociale}</td>
                  <td style={s.td}>{r.email}</td>
                  <td style={s.td}>{r.data.toLocaleDateString("it-IT")}</td>
                  <td style={s.td}>
                    <span style={s.badge(coloreGiorni(r.giorni))}>
                      {r.giorni < 0 ? `scaduta da ${-r.giorni} gg` : `${r.giorni} gg`}
                    </span>
                  </td>
                  <td style={s.td}>
                    {r.file_word_path ? (
                      <a style={s.link} href={`/api/clients/${r.id}/file`} target="_blank" rel="noreferrer">
                        Scarica
                      </a>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: 13 }}>nessun file</span>
                    )}
                    <br />
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      disabled={uploadingId === r.id}
                      onChange={(e) => handleUpload(r.id, e.target.files[0])}
                      style={{ fontSize: 12, marginTop: 4 }}
                    />
                    {uploadingId === r.id && <span style={{ fontSize: 12, color: "#64748b" }}> caricamento...</span>}
                  </td>
                  <td style={s.td}>
                    <button
                      style={{ ...s.btnDisabled, color: "#0f766e", borderColor: "#0f766e", background: "#fff", cursor: "pointer" }}
                      onClick={() => handleSend(r)}
                      disabled={sendingId === r.id}
                    >
                      {sendingId === r.id ? "Invio..." : "Invia mail"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && clients.length === 0 && <div style={s.empty}>Nessun cliente inserito.</div>}
        </section>
      </div>
    </div>
  );
}
