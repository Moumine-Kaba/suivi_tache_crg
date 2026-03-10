-- Migration: archivage des factures par la caissière
-- Date: 2026-02-23
-- Permet à la caissière d'archiver les factures après virement pour garder une trace

begin;

-- Colonnes d'archivage
alter table public.invoices
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users(id) on delete set null;

create index if not exists idx_invoices_archived_at on public.invoices(archived_at) where archived_at is not null;

-- RLS: caissier peut voir les factures archivées (archived_at non null)
drop policy if exists invoices_select_policy on public.invoices;
create policy invoices_select_policy
on public.invoices
for select
using (
  public.has_any_role(array['admin','directrice'])
  or
  (public.has_any_role(array['employe','chef']) and created_by = auth.uid())
  or
  -- Comptable / Lecture: transmis + virement_effectue
  (public.has_any_role(array['comptable','lecture']) and status in ('transmis_comptabilite','virement_effectue'))
  or
  -- Caissier: transmis + virement_effectue + archivées (archived_at not null)
  (public.has_any_role(array['caissier']) and (
    status in ('transmis_comptabilite','virement_effectue')
    or archived_at is not null
  ))
);

-- Caissier peut mettre à jour pour archiver (status virement_effectue -> archived_at)
drop policy if exists invoices_update_caissier_archive_policy on public.invoices;
create policy invoices_update_caissier_archive_policy
on public.invoices
for update
using (
  public.has_any_role(array['caissier'])
  and status = 'virement_effectue'
)
with check (
  public.has_any_role(array['caissier'])
);

commit;
