-- Migrazione 2: data avviso personalizzabile per cliente (sezione Emissioni).
-- Da eseguire DOPO migrazione-emissioni.sql e PRIMA di pubblicare il nuovo codice.
-- Additiva e idempotente: si può rieseguire senza danni, non modifica i dati esistenti.

-- Data in cui far partire l'avviso. NULL = usa il predefinito (3 mesi prima della scadenza).
alter table emissioni_clienti
  add column if not exists data_avviso date;

-- L'avviso non può partire dopo la scadenza
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'emissioni_clienti_avviso_prima_scadenza'
  ) then
    alter table emissioni_clienti
      add constraint emissioni_clienti_avviso_prima_scadenza
      check (data_avviso is null or data_avviso <= data_scadenza);
  end if;
end $$;
