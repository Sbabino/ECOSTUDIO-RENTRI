-- Migrazione: modulo "Emissioni in atmosfera"
-- Solo additiva e idempotente: non tocca le tabelle RENTRI (clients, notifications).
-- Da eseguire una volta nel SQL Editor del progetto Supabase usato dal portale.

-- Anagrafica EMISSIONI (separata da quella RENTRI)
create table if not exists emissioni_clienti (
  id               bigserial primary key,
  ragione_sociale  varchar(255) not null,
  email            varchar(255),
  telefono         varchar(30),
  data_scadenza    date not null,          -- data entro cui fare le analisi delle emissioni
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Un cliente per nome (senza distinzione di maiuscole/spazi ai bordi): serve all'import Excel
create unique index if not exists emissioni_clienti_nome_uq
  on emissioni_clienti (lower(btrim(ragione_sociale)));

create index if not exists emissioni_clienti_scadenza_idx
  on emissioni_clienti (data_scadenza);

-- Storico avvisi inviati
create table if not exists emissioni_notifiche (
  id                    bigserial primary key,
  cliente_id            bigint not null references emissioni_clienti(id) on delete cascade,
  data_scadenza_rif     date not null,    -- scadenza a cui si riferisce l'avviso
  data_invio_effettiva  timestamptz,
  status                varchar(20) not null check (status in ('sent', 'failed')),
  tipo_invio            varchar(20) not null check (tipo_invio in ('auto', 'manuale')),
  errore                text,
  created_at            timestamptz not null default now()
);

create index if not exists emissioni_notifiche_cliente_idx
  on emissioni_notifiche (cliente_id, data_scadenza_rif);

-- Il portale usa la service role key (bypassa RLS). Abilito RLS senza policy
-- così che la chiave anonima non possa leggere né scrivere queste tabelle.
alter table emissioni_clienti  enable row level security;
alter table emissioni_notifiche enable row level security;
