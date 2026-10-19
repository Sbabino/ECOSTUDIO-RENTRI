import { parseIso, toIso, oggiRoma } from "./scadenze";

const GIORNO = 86400000;

// Gli avvisi sono 3. Di default partono 90, 60 e 30 giorni prima della scadenza;
// per ogni cliente ciascuna data può essere sostituita con una data scelta dall'utente.
export const GIORNI_PREAVVISO = [90, 60, 30];
export const NUM_AVVISI = GIORNI_PREAVVISO.length;
export const CAMPI_AVVISO = ["data_avviso_1", "data_avviso_2", "data_avviso_3"];
export const NOMI_AVVISO = ["1° avviso", "2° avviso", "3° avviso"];

const fmtIt = (iso) => iso.split("-").reverse().join("/");

// Data predefinita dell'avviso `numero` (1..3): scadenza meno 90/60/30 giorni
export function avvisoPredefinito(isoScadenza, numero) {
  return toIso(parseIso(isoScadenza) - GIORNI_PREAVVISO[numero - 1] * GIORNO);
}

// Le tre date personalizzate di un cliente (null = predefinita)
export function avvisiPersonalizzati(cliente) {
  return CAMPI_AVVISO.map((campo) => (cliente && cliente[campo]) || null);
}

// Date effettive dei tre avvisi: quella personalizzata se c'è, altrimenti la predefinita
export function dateAvvisi(isoScadenza, personalizzati = []) {
  return GIORNI_PREAVVISO.map((_, i) => {
    const custom = personalizzati[i] || null;
    return {
      numero: i + 1,
      iso: custom || avvisoPredefinito(isoScadenza, i + 1),
      personalizzata: !!custom,
    };
  });
}

// Controlla le tre date (effettive): nessuna dopo la scadenza e ordine 1° < 2° < 3°.
// Restituisce null se tutto va bene, altrimenti il messaggio d'errore.
export function validaAvvisi(isoScadenza, personalizzati = []) {
  const date = dateAvvisi(isoScadenza, personalizzati);
  for (const a of date) {
    if (a.iso > isoScadenza) {
      return `Il ${NOMI_AVVISO[a.numero - 1]} (${fmtIt(a.iso)}) non può essere dopo la scadenza emissioni (${fmtIt(isoScadenza)})`;
    }
  }
  for (let i = 1; i < date.length; i++) {
    if (date[i].iso <= date[i - 1].iso) {
      return `Il ${NOMI_AVVISO[i]} (${fmtIt(date[i].iso)}) deve essere successivo al ${NOMI_AVVISO[i - 1]} (${fmtIt(date[i - 1].iso)})`;
    }
  }
  return null;
}

// Una data uguale al predefinito non va salvata come personalizzata
export function normalizzaAvvisi(isoScadenza, personalizzati = []) {
  return GIORNI_PREAVVISO.map((_, i) => {
    const v = personalizzati[i] || null;
    return v && v !== avvisoPredefinito(isoScadenza, i + 1) ? v : null;
  });
}

// Unisce le date indicate (import Excel) a quelle già salvate di un cliente.
// - `nuove[i]`: stringa = data da impostare; null = tornare al predefinito; undefined = non indicata
// - se la scadenza è cambiata le vecchie date personalizzate non valgono più (si riparte dai predefiniti)
// - altrimenti le date non indicate restano quelle salvate
export function unisciAvvisi(esistenti, nuove, scadenzaCambiata) {
  return GIORNI_PREAVVISO.map((_, i) => {
    if (nuove[i] !== undefined) return nuove[i];
    return scadenzaCambiata ? null : esistenti[i] || null;
  });
}

// Stato di una scadenza emissioni rispetto a oggi (fuso Roma).
// `personalizzati` = le 3 date scelte per il cliente (null = predefinita).
// `notifiche` = storico avvisi del cliente (solo quelli di QUESTA scadenza e inviati contano).
//
// Regola di invio: per ogni cliente, in un dato giorno, al massimo UN avviso, e cioè l'ultimo
// (il più avanzato) tra quelli la cui data è arrivata e che non sia già stato superato da uno
// inviato. Esempio: cliente caricato quando 1° e 2° avviso sono già passati -> parte solo il 2°.
//
// Stato di ciascun avviso:
//   inviato      già inviato (automatico o manuale)
//   da_inviare   data raggiunta e verrà inviato al prossimo giro (o con l'invio manuale)
//   saltato      data raggiunta ma superato da un avviso successivo
//   programmato  data futura
//   non_inviato  scadenza passata senza che sia stato inviato
export function statoEmissione(isoScadenza, oggi = oggiRoma(), personalizzati = [], notifiche = []) {
  const scadenzaMs = parseIso(isoScadenza);
  const scaduta = scadenzaMs < oggi;
  const inviatiDi = (numero) =>
    (notifiche || [])
      .filter(
        (n) =>
          n.status === "sent" &&
          n.data_scadenza_rif === isoScadenza &&
          Number(n.numero_avviso) === numero
      )
      .sort((a, b) => new Date(b.data_invio_effettiva) - new Date(a.data_invio_effettiva));
  const fallitoDi = (numero) =>
    (notifiche || []).some(
      (n) => n.status === "failed" && n.data_scadenza_rif === isoScadenza && Number(n.numero_avviso) === numero
    );

  const base = dateAvvisi(isoScadenza, personalizzati).map((a) => ({
    ...a,
    ms: parseIso(a.iso),
    inviato: inviatiDi(a.numero)[0] || null,
    fallito: fallitoDi(a.numero),
  }));

  const ultimoInviato = base.reduce((m, a) => (a.inviato ? Math.max(m, a.numero) : m), 0);

  // Avvisi con data raggiunta, scadenza non passata e non superati da uno già inviato
  let daInviare = null;
  if (!scaduta) {
    for (const a of base) {
      if (a.ms <= oggi && a.numero > ultimoInviato) daInviare = a.numero;
    }
  }

  const avvisi = base.map((a) => {
    let stato;
    if (a.inviato) stato = "inviato";
    else if (scaduta) stato = "non_inviato";
    else if (a.numero === daInviare) stato = "da_inviare";
    else if (a.ms <= oggi) stato = "saltato";
    else stato = "programmato";
    return { ...a, stato };
  });

  return {
    scadenzaMs,
    giorni: Math.round((scadenzaMs - oggi) / GIORNO),
    scaduta,
    avvisi,
    daInviare, // numero dell'avviso che parte al prossimo giro (null = nessuno)
    ultimoInviato, // numero più alto già inviato (0 = nessuno)
    // Numero con cui viene registrato un invio manuale: l'avviso dovuto, altrimenti il successivo
    // a quelli già inviati (l'ultimo se sono già stati inviati tutti)
    numeroManuale: daInviare || Math.min(ultimoInviato + 1, NUM_AVVISI),
  };
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
