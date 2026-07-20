-- Schéma du carnet de voyage — Neon / Postgres
-- Clé unique partout : code_insee (5 caractères). Jamais le code postal.

-- Référentiel des communes (source : Etalab / INSEE). En lecture seule côté app.
create table if not exists commune (
  code_insee   char(5) primary key,
  nom          text        not null,
  departement  varchar(3)  not null,
  region       varchar(3),
  population   integer
);

-- Suivi des visites. Ne stocke QUE le statut/date/notes : le nom vient de `commune`
-- via le code INSEE (principe « saisir une seule fois »).
create table if not exists suivi (
  code_insee   char(5) primary key references commune(code_insee),
  statut       text        not null default 'À visiter'
               check (statut in ('À visiter', 'Prévu', 'Visité')),
  date_visite  date,
  notes        text,
  maj_le       timestamptz not null default now()
);

-- Accès fréquent au suivi par département (via la jointure sur commune).
create index if not exists idx_commune_departement on commune (departement);
