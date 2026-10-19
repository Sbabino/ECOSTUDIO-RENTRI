import ExcelJS from "exceljs";
import { EMAIL_REGEX } from "./emissioni";

export const MAX_RIGHE = 2000;
export const COLONNE = {
  nome: "ANAGRAFICA CLIENTE",
  scadenza: "SCADENZA EMISSIONI",
  avviso: "DATA AVVISO",
  email: "EMAIL",
  telefono: "TELEFONO",
};

// Intestazioni accettate per ciascuna colonna (confronto senza accenti, maiuscole e spazi doppi)
const ALIAS = {
  nome: ["ANAGRAFICA CLIENTE", "ANAGRAFICA", "CLIENTE", "RAGIONE SOCIALE", "DENOMINAZIONE SOCIALE", "DENOMINAZIONE"],
  scadenza: ["SCADENZA EMISSIONI", "SCADENZA", "DATA SCADENZA EMISSIONI", "DATA SCADENZA"],
  avviso: ["DATA AVVISO", "AVVISO", "DATA INVIO AVVISO", "INVIO AVVISO", "DATA PARTENZA AVVISO"],
  email: ["EMAIL", "E-MAIL", "MAIL"],
  telefono: ["TELEFONO", "TEL", "TEL."],
};

function normIntestazione(t) {
  return String(t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// Valore di una cella come testo (gestisce formule, rich text, hyperlink)
function testoCella(v) {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("result" in v) return testoCella(v.result);
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("").trim();
    if ("text" in v) return testoCella(v.text);
    return "";
  }
  return String(v).trim();
}

function valoreGrezzo(v) {
  if (v && typeof v === "object" && !(v instanceof Date) && "result" in v) return v.result;
  return v;
}

const pad = (n) => String(n).padStart(2, "0");

function isoSeValida(y, m, d) {
  if (y < 2000 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

// Converte il contenuto di una cella in data ISO (YYYY-MM-DD).
// Accetta: cella data di Excel, numero seriale, testo GG/MM/AAAA, GG-MM-AAAA, GG.MM.AAAA, AAAA-MM-GG.
// Restituisce null se non è una data valida.
export function leggiData(valore) {
  const v = valoreGrezzo(valore);
  if (v == null || v === "") return null;

  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return isoSeValida(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  }

  if (typeof v === "number") {
    if (!(v >= 1 && v < 2958466)) return null;
    const dt = new Date(Math.round((Math.floor(v) - 25569) * 86400000));
    return isoSeValida(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  const t = testoCella(v);
  let m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return isoSeValida(Number(m[3]), Number(m[2]), Number(m[1]));
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return isoSeValida(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

function trovaColonne(riga) {
  const col = {};
  riga.eachCell({ includeEmpty: false }, (cella, numero) => {
    const h = normIntestazione(testoCella(cella.value));
    for (const [chiave, alias] of Object.entries(ALIAS)) {
      if (!(chiave in col) && alias.includes(h)) col[chiave] = numero;
    }
  });
  return col;
}

// Legge il file Excel e restituisce le righe pronte da salvare e gli errori per riga.
export async function leggiExcelEmissioni(buffer) {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    throw new Error("File non leggibile: usare un file Excel .xlsx (non .xls né .csv)");
  }

  // Cerco il foglio e la riga di intestazione (entro le prime 10 righe)
  let foglio = null;
  let rigaIntest = 0;
  let col = null;
  for (const ws of wb.worksheets) {
    const limite = Math.min(10, ws.rowCount);
    for (let r = 1; r <= limite; r++) {
      const c = trovaColonne(ws.getRow(r));
      if (c.nome && c.scadenza) {
        foglio = ws;
        rigaIntest = r;
        col = c;
        break;
      }
    }
    if (foglio) break;
  }

  if (!foglio) {
    throw new Error(
      `Intestazioni non trovate: servono le colonne "${COLONNE.nome}" e "${COLONNE.scadenza}". Scarica il template e riutilizzalo.`
    );
  }

  const righe = [];
  const errori = [];
  const avvisi = [];
  const visti = new Map(); // nome normalizzato -> numero di riga
  let lette = 0;

  for (let r = rigaIntest + 1; r <= foglio.rowCount; r++) {
    const row = foglio.getRow(r);
    const nome = testoCella(row.getCell(col.nome).value).replace(/\s+/g, " ").trim();
    const scadCella = row.getCell(col.scadenza).value;
    const scadTesto = testoCella(scadCella);
    const avvCella = col.avviso ? row.getCell(col.avviso).value : null;
    const avvTesto = testoCella(avvCella);
    const emailTesto = col.email ? testoCella(row.getCell(col.email).value) : "";
    const telTesto = col.telefono ? testoCella(row.getCell(col.telefono).value) : "";

    // Riga completamente vuota: la salto
    if (!nome && !scadTesto && !avvTesto && !emailTesto && !telTesto) continue;

    lette++;
    if (lette > MAX_RIGHE) {
      throw new Error(`Troppe righe: massimo ${MAX_RIGHE} clienti per file`);
    }

    if (!nome) {
      errori.push({ riga: r, messaggio: "Anagrafica cliente mancante" });
      continue;
    }
    if (nome.length > 255) {
      errori.push({ riga: r, cliente: nome.slice(0, 40) + "…", messaggio: "Nome troppo lungo (max 255 caratteri)" });
      continue;
    }

    const iso = leggiData(scadCella);
    if (!iso) {
      errori.push({
        riga: r,
        cliente: nome,
        messaggio: scadTesto
          ? `Scadenza non valida: "${scadTesto}" (usare GG/MM/AAAA)`
          : "Scadenza emissioni mancante",
      });
      continue;
    }

    // Data avviso: facoltativa. Vuota = predefinito (3 mesi prima). Se indicata deve essere valida
    // e non successiva alla scadenza; in caso contrario la riga NON viene importata.
    let avviso = null;
    if (avvTesto) {
      avviso = leggiData(avvCella);
      if (!avviso) {
        errori.push({
          riga: r,
          cliente: nome,
          messaggio: `Data avviso non valida: "${avvTesto}" (usare GG/MM/AAAA oppure lasciare vuoto)`,
        });
        continue;
      }
      if (avviso > iso) {
        errori.push({
          riga: r,
          cliente: nome,
          messaggio: `La data avviso (${avvTesto}) è dopo la scadenza emissioni`,
        });
        continue;
      }
    }

    const chiave = nome.toLowerCase();
    if (visti.has(chiave)) {
      errori.push({ riga: r, cliente: nome, messaggio: `Duplicato nel file (già presente alla riga ${visti.get(chiave)})` });
      continue;
    }
    visti.set(chiave, r);

    let email = null;
    if (emailTesto) {
      if (EMAIL_REGEX.test(emailTesto) && emailTesto.length <= 255) {
        email = emailTesto;
      } else {
        avvisi.push({ riga: r, cliente: nome, messaggio: `Email non valida ignorata: "${emailTesto}"` });
      }
    }

    righe.push({
      riga: r,
      ragione_sociale: nome,
      data_scadenza: iso,
      data_avviso: avviso,
      email,
      telefono: telTesto ? telTesto.slice(0, 30) : null,
    });
  }

  return { righe, errori, avvisi };
}

// Template Excel scaricabile
export async function creaTemplateEmissioni() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "EcoStudio";

  const ws = wb.addWorksheet("Clienti emissioni");
  ws.columns = [
    { header: COLONNE.nome, key: "nome", width: 42 },
    { header: COLONNE.scadenza, key: "scadenza", width: 22, style: { numFmt: "dd/mm/yyyy" } },
    { header: COLONNE.avviso, key: "avviso", width: 18, style: { numFmt: "dd/mm/yyyy" } },
    { header: COLONNE.email, key: "email", width: 34 },
    { header: COLONNE.telefono, key: "telefono", width: 18 },
  ];
  const intest = ws.getRow(1);
  intest.font = { bold: true, color: { argb: "FFFFFFFF" } };
  intest.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF115E59" } };
  intest.alignment = { vertical: "middle" };
  intest.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  // Il formato data vale anche per le celle vuote sotto l'intestazione
  ws.getColumn(2).numFmt = "dd/mm/yyyy";
  ws.getColumn(3).numFmt = "dd/mm/yyyy";

  const info = wb.addWorksheet("Istruzioni");
  info.columns = [{ width: 110 }];
  [
    "COME COMPILARE IL FILE",
    "",
    `${COLONNE.nome} (obbligatoria): denominazione del cliente. È la chiave: se il cliente esiste già nel portale viene aggiornato, altrimenti viene creato.`,
    `${COLONNE.scadenza} (obbligatoria): data entro cui il cliente deve eseguire le analisi delle emissioni, formato GG/MM/AAAA.`,
    `${COLONNE.avviso} (facoltativa): data in cui far partire l'avviso al cliente, formato GG/MM/AAAA. Se la lasci vuota l'avviso parte 3 mesi prima della scadenza. Non può essere dopo la scadenza emissioni.`,
    `${COLONNE.email} (consigliata): serve per l'avviso automatico. Senza email il cliente viene caricato ma non riceve avvisi.`,
    `${COLONNE.telefono} (facoltativa).`,
    "",
    "Se un cliente esiste già e nel file cambi la scadenza senza indicare la data avviso, la data avviso torna a 3 mesi prima della nuova scadenza.",
    "Se la data avviso è già passata, l'avviso parte alla prima esecuzione automatica successiva (se l'invio automatico è attivo).",
    "Lasciare l'intestazione sulla prima riga del foglio \"Clienti emissioni\". Righe vuote ignorate. Massimo 2000 clienti per file.",
    "",
    "Esempio:  Rossi Srl  |  31/12/2026  |  (vuota = 3 mesi prima)  |  amministrazione@rossi.it  |  051 1234567",
    "Esempio:  Bianchi Spa  |  31/12/2026  |  30/09/2026  |  info@bianchi.it  |",
  ].forEach((t, i) => {
    const c = info.getCell(i + 1, 1);
    c.value = t;
    c.alignment = { wrapText: true, vertical: "top" };
    if (i === 0) c.font = { bold: true, size: 13 };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
