-- Migrazione 3: tre avvisi per cliente (1°, 2°, 3°) nella sezione Emissioni.
-- Da eseguire DOPO migrazione-emissioni.sql e PRIMA di pubblicare il nuovo codice.
-- Va bene sia se la migrazione 2 (data avviso singola) è stata eseguita, sia se non lo è stata.
-- Idempotente: si può rieseguire senza danni.
--
-- Date avviso: NULL = predefinita (scadenza meno 90 / 60 / 30 giorni).

begin;

-- 1) Le tre date avviso per cliente
alter table emissioni_clienti add column if not exists data_avviso_1 date;
alter table emissioni_clienti add column if not exists data_avviso_2 date;
alter table emissioni_clienti add column if not exists data_avviso_3 date;

-- 2) Se esiste la vecchia "data avviso" singola (migrazione 2), il suo valore diventa il 1° avviso
--    e la vecchia colonna (con il suo vincolo) viene tolta.
--    Il 1° avviso deve restare prima del 2° predefinito (scadenza - 60 giorni): le vecchie date che
--    non rispettano questo ordine NON vengono copiate (tornano ai predefiniti 90/60/30) e vengono
--    elencate qui sotto in un messaggio, così puoi reinserirle a mano dalla scheda del cliente.
do $$
declare
  scartati text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'emissioni_clienti' and column_name = 'data_avviso'
  ) then
    execute $q$
      update emissioni_clienti
         set data_avviso_1 = data_avviso
       where data_avviso is not null
         and data_avviso_1 is null
         and data_avviso < data_scadenza - 60
         and data_avviso <> data_scadenza - 90
    $q$;

    execute $q$
      select string_agg(ragione_sociale || ' (data avviso ' || to_char(data_avviso, 'DD/MM/YYYY') || ')', ', ')
        from emissioni_clienti
       where data_avviso is not null
         and data_avviso >= data_scadenza - 60
    $q$ into scartati;
    if scartati is not null then
      raise notice 'ATTENZIONE - date avviso non copiate (troppo vicine alla scadenza per essere un 1° avviso): %', scartati;
    end if;

    execute 'alter table emissioni_clienti drop column data_avviso';
  end if;
end $$;

-- 3) Vincoli: nessuna data dopo la scadenza e ordine 1° < 2° < 3° (sulle date indicate)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'emissioni_clienti_avvisi_prima_scadenza') then
    alter table emissioni_clienti
      add constraint emissioni_clienti_avvisi_prima_scadenza
      check (
        (data_avviso_1 is null or data_avviso_1 <= data_scadenza) and
        (data_avviso_2 is null or data_avviso_2 <= data_scadenza) and
        (data_avviso_3 is null or data_avviso_3 <= data_scadenza)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'emissioni_clienti_avvisi_in_ordine') then
    alter table emissioni_clienti
      add constraint emissioni_clienti_avvisi_in_ordine
      check (
        (data_avviso_1 is null or data_avviso_2 is null or data_avviso_1 < data_avviso_2) and
        (data_avviso_2 is null or data_avviso_3 is null or data_avviso_2 < data_avviso_3) and
        (data_avviso_1 is null or data_avviso_3 is null or data_avviso_1 < data_avviso_3)
      );
  end if;
end $$;

-- 4) Ogni avviso inviato ricorda di quale dei tre si tratta
alter table emissioni_notifiche add column if not exists numero_avviso smallint;

-- Gli avvisi già registrati prima di questa modifica erano l'unico avviso previsto: diventano "1° avviso"
update emissioni_notifiche set numero_avviso = 1 where numero_avviso is null;

alter table emissioni_notifiche alter column numero_avviso set default 1;
alter table emissioni_notifiche alter column numero_avviso set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'emissioni_notifiche_numero_avviso_1_3') then
    alter table emissioni_notifiche
      add constraint emissioni_notifiche_numero_avviso_1_3
      check (numero_avviso between 1 and 3);
  end if;
end $$;

commit;
