-- Patch: ajouter la colonne submitted_at à la table invoices
-- À exécuter si la table invoices existe déjà sans cette colonne
-- Date: 2026-02-23

begin;

alter table public.invoices
add column if not exists submitted_at timestamptz;

commit;
