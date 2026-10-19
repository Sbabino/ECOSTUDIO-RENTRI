import Link from "next/link";

const stile = {
  header: {
    background: "#115e59",
    color: "#ffffff",
    borderRadius: 12,
    padding: "20px 24px 0",
    marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: 700, margin: 0, color: "#ffffff" },
  subtitle: { fontSize: 14, color: "#ccfbf1", margin: "4px 0 16px" },
  nav: { display: "flex", gap: 4 },
  tab: (attivo) => ({
    padding: "10px 20px",
    borderRadius: "8px 8px 0 0",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    background: attivo ? "#f1f5f9" : "transparent",
    color: attivo ? "#115e59" : "#ccfbf1",
  }),
};

// Intestazione comune con navigazione tra le due sezioni
export default function SiteHeader({ attiva, sottotitolo }) {
  return (
    <header style={stile.header}>
      <h1 style={stile.title}>RENTRI ED EMISSIONI</h1>
      <p style={stile.subtitle}>{sottotitolo}</p>
      <nav style={stile.nav}>
        <Link href="/" style={stile.tab(attiva === "rentri")}>RENTRI</Link>
        <Link href="/emissioni" style={stile.tab(attiva === "emissioni")}>Emissioni in atmosfera</Link>
      </nav>
    </header>
  );
}
