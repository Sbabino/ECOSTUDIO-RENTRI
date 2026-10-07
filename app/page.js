"use client";

import { useEffect, useState } from "react";

const emptyForm = {
  ragione_sociale: "",
  email: "",
  telefono: "",
  data_primo_carico: "",
  frequenza_giorni: 30,
};

export default function Home() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadClients() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    if (data.error) setError(data.error);
    else setClients(data);
  }

  useEffect(() => {
    loadClients().catch(() => setError("Errore di connessione"));
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

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Portale RENTRI</h1>

      <h2>Nuovo cliente</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, maxWidth: 400 }}>
        <input name="ragione_sociale" placeholder="Ragione sociale *" value={form.ragione_sociale} onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email *" value={form.email} onChange={handleChange} required />
        <input name="telefono" placeholder="Telefono" value={form.telefono} onChange={handleChange} />
        <input name="data_primo_carico" type="date" value={form.data_primo_carico} onChange={handleChange} required />
        <select name="frequenza_giorni" value={form.frequenza_giorni} onChange={handleChange}>
          <option value={15}>Ogni 15 giorni</option>
          <option value={30}>Ogni 30 giorni</option>
          <option value={60}>Ogni 60 giorni</option>
        </select>
        <button type="submit" disabled={saving}>
          {saving ? "Salvataggio..." : "Salva cliente"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>Errore: {error}</p>}

      <h2>Clienti</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Ragione sociale</th>
            <th>Email</th>
            <th>Primo carico</th>
            <th>Frequenza (gg)</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.ragione_sociale}</td>
              <td>{c.email}</td>
              <td>{c.data_primo_carico}</td>
              <td>{c.frequenza_giorni}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
