export default function LoginPage({ searchParams }) {
  const errore = searchParams?.error;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
      <form method="POST" action="/api/login" style={{ background: "#fff", padding: 32, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", width: 320 }}>
        <h1 style={{ fontSize: 20, margin: "0 0 20px", color: "#0f172a" }}>Portale RENTRI</h1>
        {errore && <p style={{ color: "#b91c1c", fontSize: 14 }}>Password non corretta.</p>}
        <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Password</label>
        <input name="password" type="password" required autoFocus style={{ width: "100%", padding: "10px 12px", margin: "6px 0 16px", borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: 14 }} />
        <button type="submit" style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: "#0f766e", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Accedi</button>
      </form>
    </div>
  );
}
