-- Migrazione 4: campo libero "Tipo di autorizzazione" nell'anagrafica clienti Emissioni.
-- Da eseguire PRIMA di pubblicare il nuovo codice. Additiva e idempotente: non modifica i dati esistenti.

alter table emissioni_clienti
  add column if not exists tipo_autorizzazione varchar(500);
