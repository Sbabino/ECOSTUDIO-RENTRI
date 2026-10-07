"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setClients(data);
      })
      .catch(() => setError("Errore di connessione"));
  }, []);

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Portale RENTRI</h1>

      {error && <p style={{ color: "red" }}>Errore: {error}</p>}

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

      {clients.length === 0 && !error && <p>Nessun cliente.</p>}
    </main>
  );
}
