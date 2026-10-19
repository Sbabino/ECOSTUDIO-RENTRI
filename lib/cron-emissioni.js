import { leggiTutti } from "./supabase";
import { statoEmissione, avvisoGiaInviato } from "./emissioni";
import { inviaAvvisoEmissioni } from "./mail-emissioni";

// Massimo di mail per esecuzione: protegge dai limiti del provider dopo un import massivo.
// I clienti rimasti indietro vengono ripresi dalle esecuzioni dei giorni successivi.
const MAX_PER_ESECUZIONE = 25;

// Avviso automatico "analisi emissioni".
// Un cliente è da avvisare se: oggi è tra la sua data avviso (se non indicata: scadenza - 3 mesi)
// e la scadenza compresa, ha un'email
// e non ha già ricevuto un avviso (automatico o manuale) per QUELLA scadenza.
// Se la scadenza viene spostata (analisi rinnovata) il ciclo riparte da solo.
//
// SICUREZZA: finché EMISSIONI_INVIO_AUTOMATICO non vale "true" non parte NESSUNA mail:
// la funzione si limita a dire chi verrebbe avvisato.
export async function processaEmissioni(supabase, oggi) {
  const attivo = process.env.EMISSIONI_INVIO_AUTOMATICO === "true";

  const clienti = await leggiTutti((da, a) =>
    supabase
      .from("emissioni_clienti")
      .select("*, emissioni_notifiche(data_scadenza_rif, status, tipo_invio)")
      .order("data_scadenza", { ascending: true })
      .order("id", { ascending: true })
      .range(da, a)
  );

  const daAvvisare = [];
  const senzaEmail = [];

  for (const c of clienti) {
    const st = statoEmissione(c.data_scadenza, oggi, c.data_avviso);
    if (!st.inFinestra) continue;
    if (avvisoGiaInviato(c.emissioni_notifiche, c.data_scadenza)) continue;
    if (!c.email) {
      senzaEmail.push(c.id);
      continue;
    }
    daAvvisare.push(c);
  }

  if (!attivo) {
    return {
      modalita: "simulazione",
      motivo: "EMISSIONI_INVIO_AUTOMATICO non attivo: nessuna mail inviata",
      daAvvisare: daAvvisare.map((c) => c.id),
      senzaEmail,
    };
  }

  const lotto = daAvvisare.slice(0, MAX_PER_ESECUZIONE);
  const inviati = [];
  const falliti = [];
  const erroriRegistro = [];

  for (const c of lotto) {
    const r = await inviaAvvisoEmissioni(c);

    const { error } = await supabase.from("emissioni_notifiche").insert({
      cliente_id: c.id,
      data_scadenza_rif: c.data_scadenza,
      data_invio_effettiva: r.ok ? new Date().toISOString() : null,
      status: r.ok ? "sent" : "failed",
      tipo_invio: "auto",
      errore: r.ok ? null : r.error,
    });
    if (error) erroriRegistro.push({ cliente: c.id, errore: error.message });

    (r.ok ? inviati : falliti).push(c.id);
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
