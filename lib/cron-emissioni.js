import { leggiTutti } from "./supabase";
import { statoEmissione, avvisiPersonalizzati } from "./emissioni";
import { inviaAvvisoEmissioni } from "./mail-emissioni";

// Massimo di mail per esecuzione: protegge dai limiti del provider dopo un import massivo.
// I clienti rimasti indietro vengono ripresi dalle esecuzioni dei giorni successivi.
const MAX_PER_ESECUZIONE = 25;

// Avvisi automatici "analisi emissioni": sono tre per ogni scadenza (1°, 2° e 3° avviso),
// di default 90, 60 e 30 giorni prima, oppure alle date scelte per il cliente.
// Un cliente è da avvisare se ha un'email, la scadenza non è passata e c'è un avviso la cui data
// è arrivata e che non è stato superato da uno già inviato (automatico o manuale).
// Per ogni cliente parte al massimo UN avviso per esecuzione: se più date sono già passate
// (es. cliente caricato in ritardo) parte solo l'ultima, mai tre mail di fila.
// Se la scadenza viene spostata (analisi rinnovata) il ciclo dei tre avvisi riparte da solo.
//
// SICUREZZA: finché EMISSIONI_INVIO_AUTOMATICO non vale "true" non parte NESSUNA mail:
// la funzione si limita a dire chi verrebbe avvisato.
export async function processaEmissioni(supabase, oggi) {
  const attivo = process.env.EMISSIONI_INVIO_AUTOMATICO === "true";

  const clienti = await leggiTutti((da, a) =>
    supabase
      .from("emissioni_clienti")
      .select("*, emissioni_notifiche(numero_avviso, data_scadenza_rif, data_invio_effettiva, status, tipo_invio)")
      .order("data_scadenza", { ascending: true })
      .order("id", { ascending: true })
      .range(da, a)
  );

  const daAvvisare = [];
  const senzaEmail = [];

  for (const c of clienti) {
    const st = statoEmissione(c.data_scadenza, oggi, avvisiPersonalizzati(c), c.emissioni_notifiche);
    if (!st.daInviare) continue;
    if (!c.email) {
      senzaEmail.push(c.id);
      continue;
    }
    daAvvisare.push({ cliente: c, numero: st.daInviare });
  }

  if (!attivo) {
    return {
      modalita: "simulazione",
      motivo: "EMISSIONI_INVIO_AUTOMATICO non attivo: nessuna mail inviata",
      daAvvisare: daAvvisare.map(({ cliente, numero }) => ({ id: cliente.id, avviso: numero })),
      senzaEmail,
    };
  }

  const lotto = daAvvisare.slice(0, MAX_PER_ESECUZIONE);
  const inviati = [];
  const falliti = [];
  const erroriRegistro = [];

  for (const { cliente: c, numero } of lotto) {
    const r = await inviaAvvisoEmissioni(c);

    const { error } = await supabase.from("emissioni_notifiche").insert({
      cliente_id: c.id,
      data_scadenza_rif: c.data_scadenza,
      numero_avviso: numero,
      data_invio_effettiva: r.ok ? new Date().toISOString() : null,
      status: r.ok ? "sent" : "failed",
      tipo_invio: "auto",
      errore: r.ok ? null : r.error,
    });
    if (error) erroriRegistro.push({ cliente: c.id, errore: error.message });

    (r.ok ? inviati : falliti).push({ id: c.id, avviso: numero });
  }

  return {
    modalita: "attiva",
    inviati,
    falliti,
    rinviatiAlProssimoGiro: daAvvisare.length - lotto.length,
    senzaEmail,
    ...(erroriRegistro.length ? { erroriRegistro } : {}),
  };
}
