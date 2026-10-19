"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import { oggiRoma } from "../../lib/scadenze";
import {
  statoEmissione,
  avvisoPredefinito,
  avvisiPersonalizzati,
  validaAvvisi,
  isoValida,
  CAMPI_AVVISO,
  NOMI_AVVISO,
  GIORNI_PREAVVISO,
} from "../../lib/emissioni";

const emptyForm = {
  ragione_sociale: "",
  data_scadenza: "",
  data_avviso_1: "",
  data_avviso_2: "",
  data_avviso_3: "",
  email: "",
  telefono: "",
};

const fmtIso = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const fmtDataOra = (ts) =>
  new Date(ts).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });

function coloreStato(st) {
  if (st.scaduta || st.giorni <= 30) return "#dc2626";
  if (st.daInviare) return "#d97706";
  return "#0f766e";
}

async function leggiRisposta(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "#0f172a",
    padding: "32px 16px",
  },
  container: { maxWidth: 1320, margin: "0 auto" },
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
  hint: { fontSize: 13, color: "#64748b", margin: "0 0 14px", lineHeight: 1.5 },
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
  dateInput: {
    width: 138,
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    fontSize: 13,
  },
  search: {
    width: "100%",
    maxWidth: 360,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    boxSizing: "border-box",
    marginBottom: 16,
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
  buttonInline: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  btnOutline: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #0f766e",
    background: "#fff",
    color: "#0f766e",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnDelete: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #dc2626",
    background: "#fff",
    color: "#dc2626",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnLink: {
    background: "none",
    border: "none",
    padding: "0 4px",
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "underline",
    cursor: "pointer",
  },
  btnSave: {
    padding: "5px 10px",
    borderRadius: 6,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    marginLeft: 6,
  },
  error: {
    background: "#fef2f2",
    color: "#b91c1c",
    padding: "10px 14px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  ok: {
    background: "#ecfdf5",
    color: "#065f46",
    padding: "10px 14px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  warn: {
    background: "#fffbeb",
    color: "#92400e",
    border: "1px solid #fcd34d",
    padding: "10px 14px",
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 1.5,
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
  muted: { color: "#94a3b8", fontSize: 13 },
  small: { fontSize: 12, color: "#64748b" },
  smallRed: { fontSize: 12, color: "#dc2626", fontWeight: 600 },
  link: { color: "#0f766e", fontWeight: 600, fontSize: 14 },
  nameLink: { color: "#0f766e", fontWeight: 600, textDecoration: "none" },
  empty: { textAlign: "center", color: "#94a3b8", padding: 24 },
  importRow: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" },
  list: { margin: "8px 0 0", paddingLeft: 20, fontSize: 13, lineHeight: 1.6 },
};

export default function EmissioniPage() {
  const [clienti, setClienti] = useState([]);
  const [invioAuto, setInvioAuto] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // id -> { data_scadenza?, data_avviso_1?, data_avviso_2?, data_avviso_3? } modifiche non ancora salvate
  const [bozze, setBozze] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [fileImport, setFileImport] = useState(null);
  const [importing, setImporting] = useState(false);
  const [esito, setEsito] = useState(null);
  const fileRef = useRef(null);

  async function loadClienti() {
    const res = await fetch("/api/emissioni", { cache: "no-store" });
    const data = await leggiRisposta(res);
    if (!res.ok || data.error) {
      setError(data.error || "Errore nel caricamento");
    } else {
      setClienti(data.clienti);
      setInvioAuto(!!data.invio_automatico);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadClienti().catch(() => {
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
    setInfo("");
    setSaving(true);
    const res = await fetch("/api/emissioni", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await leggiRisposta(res);
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Salvataggio non riuscito");
      return;
    }
    setForm(emptyForm);
    loadClienti();
  }

  async function handleImport() {
    if (!fileImport) return;
    setError("");
    setInfo("");
    setEsito(null);
    setImporting(true);

    const fd = new FormData();
    fd.append("file", fileImport);
    try {
      const res = await fetch("/api/emissioni/import", { method: "POST", body: fd });
      const data = await leggiRisposta(res);
      if (!res.ok) {
        setError(data.error || "Importazione non riuscita");
      } else {
        setEsito(data);
        loadClienti();
      }
    } catch {
      setError("Errore di connessione durante l'importazione");
    }
    setImporting(false);
    setFileImport(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function modificaBozza(id, campo, valore) {
    setBozze((b) => ({ ...b, [id]: { ...b[id], [campo]: valore } }));
  }

  function scartaBozza(id) {
    setBozze((b) => {
      const { [id]: _tolto, ...resto } = b;
      return resto;
    });
  }

  // Salva le modifiche della riga (scadenza e/o date dei tre avvisi)
  async function salvaRiga(c) {
    const bz = bozze[c.id] || {};
    const scadAttuale = c.data_scadenza;
    const scadFinale = bz.data_scadenza || scadAttuale;
    if (!isoValida(scadFinale)) {
      setError("Scadenza emissioni non valida");
      return;
    }
    const scadCambiata = scadFinale !== scadAttuale;

    const body = {};
    if (scadCambiata) body.data_scadenza = scadFinale;
    CAMPI_AVVISO.forEach((campo, i) => {
      const v = bz[campo];
      // Se cambia anche la scadenza, le date digitate vanno sempre inviate (altrimenti il server le azzera)
      if (v && (v !== c.st.avvisi[i].iso || scadCambiata)) body[campo] = v;
    });

    if (Object.keys(body).length === 0) {
      scartaBozza(c.id);
      return;
    }

    // Controllo subito, il server lo ripete: nessun avviso dopo la scadenza e ordine 1° < 2° < 3°
    const finali = scadCambiata ? [null, null, null] : avvisiPersonalizzati(c);
    CAMPI_AVVISO.forEach((campo, i) => {
      if (campo in body) {
        if (!isoValida(body[campo])) finali[i] = "data non valida";
        else finali[i] = body[campo];
      }
    });
    if (finali.includes("data non valida")) {
      setError("Data avviso non valida");
      return;
    }
    const errAvvisi = validaAvvisi(scadFinale, finali);
    if (errAvvisi) {
      setError(errAvvisi);
      return;
    }

    setError("");
    setInfo("");
    setSavingId(c.id);
    const res = await fetch(`/api/emissioni/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await leggiRisposta(res);
    setSavingId(null);
    if (!res.ok) {
      setError(data.error || "Salvataggio non riuscito");
      return;
    }
    if (scadCambiata && avvisiPersonalizzati(c).some(Boolean) && !CAMPI_AVVISO.some((campo) => campo in body)) {
      setInfo(
        `Scadenza aggiornata. Gli avvisi di ${c.ragione_sociale} sono tornati a ${GIORNI_PREAVVISO.join("/")} giorni prima della nuova scadenza.`
      );
    }
    scartaBozza(c.id);
    loadClienti();
  }

  // Riporta UN avviso alla data predefinita
  async function ripristinaAvviso(c, campo) {
    setError("");
    setInfo("");
    setSavingId(c.id);
    const res = await fetch(`/api/emissioni/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: null }),
    });
    const data = await leggiRisposta(res);
    setSavingId(null);
    if (!res.ok) {
      setError(data.error || "Operazione non riuscita");
      return;
    }
    setBozze((b) => {
      if (!b[c.id]) return b;
      const { [campo]: _tolto, ...resto } = b[c.id];
      return { ...b, [c.id]: resto };
    });
    loadClienti();
  }

  async function handleSend(c) {
    const num = c.st.numeroManuale;
    if (
      !window.confirm(
        `Inviare l'avviso scadenza emissioni a ${c.ragione_sociale} (${c.email})?\n\nVerrà registrato come ${NOMI_AVVISO[num - 1]}.`
      )
    )
      return;
    setError("");
    setInfo("");
    setSendingId(c.id);
    const res = await fetch(`/api/emissioni/${c.id}/send`, { method: "POST" });
    const data = await leggiRisposta(res);
    setSendingId(null);
    if (!res.ok) setError(data.error || "Invio non riuscito");
    else setInfo(data.avviso || `Mail inviata a ${c.ragione_sociale} (${NOMI_AVVISO[(data.numero_avviso || num) - 1]})`);
    loadClienti();
  }

  async function handleDelete(c) {
    const ok = window.confirm(
      `Eliminare DEFINITIVAMENTE "${c.ragione_sociale}" dallo scadenziario emissioni?\n\n` +
        "Verrà cancellato anche lo storico degli avvisi. L'operazione non si può annullare."
    );
    if (!ok) return;
    setError("");
    setInfo("");
    setDeletingId(c.id);
    const res = await fetch(`/api/emissioni/${c.id}`, { method: "DELETE" });
    const data = await leggiRisposta(res);
    setDeletingId(null);
    if (!res.ok) {
      setError(data.error || "Eliminazione non riuscita");
      return;
    }
    loadClienti();
  }

  const oggi = oggiRoma();
  const righe = clienti
    .map((c) => ({
      ...c,
      st: statoEmissione(c.data_scadenza, oggi, avvisiPersonalizzati(c), c.emissioni_notifiche),
    }))
    .sort((a, b) => a.st.scadenzaMs - b.st.scadenzaMs);

  const q = search.trim().toLowerCase();
  const righeFiltrate = q
    ? righe.filter(
        (r) =>
          r.ragione_sociale.toLowerCase().includes(q) ||
          (r.email || "").toLowerCase().includes(q)
      )
    : righe;

  // Clienti con un avviso dovuto (data raggiunta, scadenza non passata, non ancora inviato)
  const daInviare = righe.filter((r) => r.st.daInviare).length;
  const scadute = righe.filter((r) => r.st.scaduta).length;
  const senzaEmail = righe.filter((r) => !r.email).length;

  return (
    <div style={s.page}>
      <div style={s.container}>
        <SiteHeader
          attiva="emissioni"
          sottotitolo="Emissioni in atmosfera - Scadenziario analisi e avvisi"
        />

        <div style={s.stats}>
          <div style={s.statCard}>
            <p style={s.statLabel}>Clienti totali</p>
            <p style={s.statValue}>{clienti.length}</p>
          </div>
          <div style={s.statCard}>
            <p style={s.statLabel}>Avvisi da inviare (data raggiunta)</p>
            <p style={{ ...s.statValue, color: daInviare > 0 ? "#d97706" : "#0f172a" }}>{daInviare}</p>
          </div>
          <div style={s.statCard}>
            <p style={s.statLabel}>Scadute</p>
            <p style={{ ...s.statValue, color: scadute > 0 ? "#dc2626" : "#0f172a" }}>{scadute}</p>
          </div>
          <div style={s.statCard}>
            <p style={s.statLabel}>Senza email (nessun avviso)</p>
            <p style={{ ...s.statValue, color: senzaEmail > 0 ? "#dc2626" : "#0f172a" }}>{senzaEmail}</p>
          </div>
        </div>

        {!loading && !invioAuto && (
          <div style={s.warn}>
            <strong>Invio automatico degli avvisi NON attivo.</strong> Il testo della mail è provvisorio:
            finché non viene attivato nessun avviso parte da solo (l&apos;invio manuale resta disponibile).
            Per attivarlo: variabile <code>EMISSIONI_INVIO_AUTOMATICO=true</code> su Vercel.
          </div>
        )}

        {error && <div style={s.error}>{error}</div>}
        {info && <div style={s.ok}>{info}</div>}

        <section style={s.card}>
          <h2 style={s.cardTitle}>Importa anagrafica da Excel</h2>
          <p style={s.hint}>
            Colonne del template: <strong>ANAGRAFICA CLIENTE</strong>, <strong>SCADENZA EMISSIONI</strong> (GG/MM/AAAA),
            <strong> PRIMO AVVISO</strong>, <strong>SECONDO AVVISO</strong>, <strong>TERZO AVVISO</strong> (facoltative:
            se vuote gli avvisi partono {GIORNI_PREAVVISO.join(", ")} giorni prima della scadenza),
            più <strong>EMAIL</strong> e TELEFONO. L&apos;email serve per l&apos;avviso automatico: senza email il cliente
            viene caricato ma non riceve avvisi. Se il cliente esiste già (stesso nome) viene aggiornato; i clienti
            non presenti nel file non vengono toccati.
          </p>
          <div style={s.importRow}>
            <a style={s.link} href="/api/emissioni/template">Scarica il template Excel</a>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              disabled={importing}
              onChange={(e) => setFileImport(e.target.files[0] || null)}
              style={{ fontSize: 13 }}
            />
            <button
              style={{ ...s.buttonInline, opacity: !fileImport || importing ? 0.5 : 1 }}
              onClick={handleImport}
              disabled={!fileImport || importing}
            >
              {importing ? "Importazione..." : "Importa"}
            </button>
          </div>

          {esito && (
            <div style={{ marginTop: 16 }}>
              <div style={esito.errori.length > 0 ? s.warn : s.ok}>
                <strong>Importazione terminata.</strong> Creati: {esito.creati} · Aggiornati: {esito.aggiornati} ·
                Invariati: {esito.invariati} · Righe con errore (non importate): {esito.errori.length}
                {esito.senzaEmail > 0 && (
                  <div>Attenzione: {esito.senzaEmail} clienti importati senza email, non riceveranno avvisi.</div>
                )}
              </div>
              {esito.errori.length > 0 && (
                <>
                  <strong style={{ fontSize: 13 }}>Righe non importate</strong>
                  <ul style={s.list}>
                    {esito.errori.slice(0, 50).map((e, i) => (
                      <li key={i}>
                        Riga {e.riga}
                        {e.cliente ? ` (${e.cliente})` : ""}: {e.messaggio}
                      </li>
                    ))}
                    {esito.errori.length > 50 && <li>… e altre {esito.errori.length - 50}</li>}
                  </ul>
                </>
              )}
              {esito.avvisi.length > 0 && (
                <>
                  <strong style={{ fontSize: 13 }}>Segnalazioni</strong>
                  <ul style={s.list}>
                    {esito.avvisi.slice(0, 50).map((a, i) => (
                      <li key={i}>
                        Riga {a.riga}
                        {a.cliente ? ` (${a.cliente})` : ""}: {a.messaggio}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>

        <section style={s.card}>
          <h2 style={s.cardTitle}>Nuovo cliente</h2>
          <form onSubmit={handleSubmit}>
            <div style={s.grid}>
              <div>
                <label style={s.label}>Anagrafica cliente *</label>
                <input style={s.input} name="ragione_sociale" value={form.ragione_sociale} onChange={handleChange} required />
              </div>
              <div>
                <label style={s.label}>Scadenza emissioni *</label>
                <input style={s.input} name="data_scadenza" type="date" value={form.data_scadenza} onChange={handleChange} required />
              </div>
              {CAMPI_AVVISO.map((campo, i) => (
                <div key={campo}>
                  <label style={s.label}>{NOMI_AVVISO[i]} (facoltativo)</label>
                  <input
                    style={s.input}
                    name={campo}
                    type="date"
                    value={form[campo]}
                    max={form.data_scadenza || undefined}
                    onChange={handleChange}
                  />
                  <span style={s.small}>
                    Se vuoto: {GIORNI_PREAVVISO[i]} giorni prima
                    {isoValida(form.data_scadenza)
                      ? ` (${fmtIso(avvisoPredefinito(form.data_scadenza, i + 1))})`
                      : " della scadenza"}
                  </span>
                </div>
              ))}
              <div>
                <label style={s.label}>Email (per l&apos;avviso)</label>
                <input style={s.input} name="email" type="email" value={form.email} onChange={handleChange} />
              </div>
              <div>
                <label style={s.label}>Telefono</label>
                <input style={s.input} name="telefono" value={form.telefono} onChange={handleChange} />
              </div>
            </div>
            <button type="submit" disabled={saving} style={{ ...s.button, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvataggio..." : "Aggiungi cliente"}
            </button>
          </form>
        </section>

        <section style={s.card}>
          <h2 style={s.cardTitle}>Scadenziario emissioni</h2>

          <input
            style={s.search}
            type="search"
            placeholder="Cerca per nome o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Cliente</th>
                  <th style={s.th}>Contatti</th>
                  <th style={s.th}>Scadenza emissioni</th>
                  {NOMI_AVVISO.map((nome, i) => (
                    <th key={nome} style={s.th}>
                      {nome}
                      <div style={{ fontWeight: 400, fontSize: 11 }}>di default {GIORNI_PREAVVISO[i]} gg prima</div>
                    </th>
                  ))}
                  <th style={s.th}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {righeFiltrate.map((r) => {
                  const bz = bozze[r.id] || {};
                  const scadCambiata = !!bz.data_scadenza && isoValida(bz.data_scadenza) && bz.data_scadenza !== r.data_scadenza;
                  // Valore mostrato in ciascun avviso: quello digitato; se cambia la scadenza senza toccarlo,
                  // il server lo riporta al predefinito e lo mostro già nell'anteprima
                  const mostrato = (i) =>
                    bz[CAMPI_AVVISO[i]] ??
                    (scadCambiata ? avvisoPredefinito(bz.data_scadenza, i + 1) : r.st.avvisi[i].iso);
                  const avvisoCambiato = (i) => !!bz[CAMPI_AVVISO[i]] && bz[CAMPI_AVVISO[i]] !== r.st.avvisi[i].iso;
                  const modificata = scadCambiata || CAMPI_AVVISO.some((_, i) => avvisoCambiato(i));
                  return (
                    <tr key={r.id}>
                      <td style={s.td}>
                        <Link href={`/emissioni/${r.id}`} style={s.nameLink} title="Apri e modifica l'anagrafica">
                          {r.ragione_sociale}
                        </Link>
                      </td>
                      <td style={s.td}>
                        {r.email ? r.email : <span style={s.smallRed}>email mancante</span>}
                        {r.telefono && (
                          <>
                            <br />
                            <span style={s.small}>{r.telefono}</span>
                          </>
                        )}
                      </td>
                      <td style={s.td}>
                        <input
                          type="date"
                          style={s.dateInput}
                          value={bz.data_scadenza ?? r.data_scadenza}
                          onChange={(e) => modificaBozza(r.id, "data_scadenza", e.target.value)}
                        />
                        <div style={{ marginTop: 6 }}>
                          <span style={s.badge(coloreStato(r.st))}>
                            {r.st.scaduta ? `scaduta da ${-r.st.giorni} gg` : `${r.st.giorni} gg`}
                          </span>
                        </div>
                      </td>
                      {CAMPI_AVVISO.map((campo, i) => {
                        const av = r.st.avvisi[i];
                        const daSalvare = scadCambiata || avvisoCambiato(i);
                        return (
                          <td key={campo} style={s.td}>
                            <input
                              type="date"
                              style={s.dateInput}
                              value={mostrato(i)}
                              max={bz.data_scadenza ?? r.data_scadenza}
                              onChange={(e) => modificaBozza(r.id, campo, e.target.value)}
                            />
                            <div style={{ marginTop: 6 }}>
                              {daSalvare ? (
                                <span style={{ ...s.small, color: "#d97706", fontWeight: 600 }}>da salvare</span>
                              ) : av.stato === "inviato" ? (
                                <span style={{ fontSize: 12, color: "#065f46", fontWeight: 600 }}>
                                  Inviato il {fmtDataOra(av.inviato.data_invio_effettiva)}
                                  <span style={{ ...s.small, fontWeight: 400 }}>
                                    {" "}
                                    ({av.inviato.tipo_invio === "manuale" ? "manuale" : "automatico"})
                                  </span>
                                </span>
                              ) : av.stato === "da_inviare" ? (
                                <span style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>Da inviare</span>
                              ) : av.stato === "saltato" ? (
                                <span style={s.muted}>Saltato</span>
                              ) : av.stato === "non_inviato" ? (
                                <span style={s.muted}>Non inviato</span>
                              ) : (
                                <span style={s.muted}>In programma</span>
                              )}
                              {!daSalvare && av.stato !== "inviato" && av.fallito && (
                                <div style={s.smallRed}>ultimo tentativo fallito</div>
                              )}
                            </div>
                            <div style={{ marginTop: 2 }}>
                              <span style={s.small}>{av.personalizzata ? "personalizzata" : "predefinita"}</span>
                              {av.personalizzata && (
                                <button
                                  style={s.btnLink}
                                  onClick={() => ripristinaAvviso(r, campo)}
                                  disabled={savingId === r.id}
                                  title={`Riporta il ${NOMI_AVVISO[i]} a ${GIORNI_PREAVVISO[i]} giorni prima della scadenza`}
                                >
                                  ripristina
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                        {modificata && (
                          <div style={{ marginBottom: 8 }}>
                            <button style={{ ...s.btnSave, marginLeft: 0 }} onClick={() => salvaRiga(r)} disabled={savingId === r.id}>
                              {savingId === r.id ? "..." : "Salva"}
                            </button>
                            <button style={s.btnLink} onClick={() => scartaBozza(r.id)} disabled={savingId === r.id}>
                              annulla
                            </button>
                          </div>
                        )}
                        <button
                          style={{ ...s.btnOutline, opacity: r.email ? 1 : 0.4 }}
                          onClick={() => handleSend(r)}
                          disabled={!r.email || sendingId === r.id}
                          title={r.email ? `Invia ora (registrato come ${NOMI_AVVISO[r.st.numeroManuale - 1]})` : "Email mancante"}
                        >
                          {sendingId === r.id ? "Invio..." : "Invia mail"}
                        </button>{" "}
                        <button style={s.btnDelete} onClick={() => handleDelete(r)} disabled={deletingId === r.id}>
                          {deletingId === r.id ? "Eliminazione..." : "Elimina"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && clienti.length === 0 && (
            <div style={s.empty}>Nessun cliente inserito. Importa il file Excel o aggiungi un cliente.</div>
          )}
          {!loading && clienti.length > 0 && righeFiltrate.length === 0 && (
            <div style={s.empty}>Nessun cliente corrisponde alla ricerca.</div>
          )}
        </section>
      </div>
    </div>
  );
}
