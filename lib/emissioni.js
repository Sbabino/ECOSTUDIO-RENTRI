import { parseIso, toIso, oggiRoma } from "./scadenze";

const GIORNO = 86400000;

// Quanti mesi prima della scadenza parte l'avviso
export const MESI_PREAVVISO = 3;

// Sottrae n mesi di calendario a una data ISO (YYYY-MM-DD).
// Se il giorno non esiste nel mese di arrivo si usa l'ultimo giorno del mese
// (es. 31/05 meno 3 mesi = 28/02 o 29/02, mai un salto a marzo).
export function sottraiMesi(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const tot = y * 12 + (m - 1) - n;
  const ny = Math.floor(tot / 12);
  const nm = tot % 12;
  const ultimoGiorno = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return toIso(Date.UTC(ny, nm, Math.min(d, ultimoGiorno)));
}

// Data predefinita di partenza dell'avviso: 3 mesi prima della scadenza
export function avvisoPredefinito(isoScadenza) {
  return sottraiMesi(isoScadenza, MESI_PREAVVISO);
}

// Stato di una scadenza emissioni rispetto a oggi (fuso Roma).
// `isoAvviso` è la data avviso scelta per il cliente: se manca (null) vale il predefinito.
export function statoEmissione(isoScadenza, oggi = oggiRoma(), isoAvviso = null) {
  const scadenzaMs = parseIso(isoScadenza);
  const personalizzato = !!isoAvviso;
  const avvisoIso = isoAvviso || avvisoPredefinito(isoScadenza);
  const avvisoMs = parseIso(avvisoIso);
  return {
    scadenzaMs,
    avvisoIso,
    avvisoMs,
    avvisoPersonalizzato: personalizzato,
    giorni: Math.round((scadenzaMs - oggi) / GIORNO),
    scaduta: scadenzaMs < oggi,
    // Vero dalla data avviso fino al giorno di scadenza compreso
    inFinestra: oggi >= avvisoMs && oggi <= scadenzaMs,
  };
}

// Vero se esiste già un avviso INVIATO per questa scadenza (automatico o manuale)
export function avvisoGiaInviato(notifiche, isoScadenza) {
  return (notifiche || []).some(
    (n) => n.status === "sent" && n.data_scadenza_rif === isoScadenza
  );
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Vero se `s` è una data reale in formato YYYY-MM-DD (anni 2000-2100)
export function isoValida(s) {
  const m = typeof s === "string" && s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}
