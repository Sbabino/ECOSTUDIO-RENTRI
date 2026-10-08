const GIORNO = 86400000;

export function parseIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function toIso(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Data di oggi nel fuso di Roma, come numero UTC a mezzanotte
export function oggiRoma() {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parseIso(iso);
}

// Prossima scadenza: data primo carico + multipli della frequenza
export function prossimaScadenza(dataPrimo, freq, oggi = oggiRoma()) {
  let d = parseIso(dataPrimo);
  while (d < oggi) d += freq * GIORNO;
  return { ms: d, iso: toIso(d), giorni: Math.round((d - oggi) / GIORNO) };
}
