-- Migration: workflow de factures (employe -> directrice -> comptabilite)
-- Date: 2026-02-23

begin;

create extension if not exists pgcrypto;

-- Helpers RLS
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_direction()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.direction
  from public.users u
  where u.id = auth.uid()
  limit 1
$$;

create or replace function public.has_any_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lower(trim(public.current_user_role())) = any(
      array(select lower(trim(x)) from unnest(roles) as x)
    ),
    false
  )
$$;

-- Table principale
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),

  created_by uuid not null references public.users(id) on delete restrict,
  created_by_name text,
  direction text,

  date date,
  nature_depense text not null default '',
  items jsonb not null default '[]'::jsonb,
  wallet_number text,

  apply_fees boolean not null default true,
  is_medical_reimbursement boolean not null default false,

  total_depenses numeric(18,2) not null default 0,
  base_prise_en_charge numeric(18,2) not null default 0,
  reste_employe numeric(18,2) not null default 0,
  frais_wallet numeric(18,2) not null default 0,
  total_facture numeric(18,2) not null default 0,

  imputation_debit text[] not null default array['','',''],
  imputation_credit text[] not null default array['','',''],
  imputation_analytique text[] not null default array['','',''],

  status text not null default 'brouillon'
    check (status in (
      'brouillon',
      'soumis_directrice',
      'transmis_comptabilite',
      'virement_effectue',
      'rejete'
    )),

  submitted_at timestamptz,
  applicant_signature text,
  applicant_signature_image text,

  director_signature text,
  director_stamp text,
  director_stamp_image text,
  signed_by uuid references public.users(id) on delete set null,
  signed_at timestamptz,
  transmitted_at timestamptz,

  paid_at timestamptz,
  paid_by uuid references public.users(id) on delete set null,
  payment_reference text,

  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_invoices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_invoices_updated_at();

create index if not exists idx_invoices_created_by on public.invoices(created_by);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_created_at on public.invoices(created_at desc);
create index if not exists idx_invoices_direction on public.invoices(direction);

-- RLS
alter table public.invoices enable row level security;

drop policy if exists invoices_select_policy on public.invoices;
create policy invoices_select_policy
on public.invoices
for select
using (
  -- Admin / Directrice voient tout
  public.has_any_role(array['admin','directrice'])
  or
  -- Employe / Chef voient leurs factures
  (public.has_any_role(array['employe','chef']) and created_by = auth.uid())
  or
  -- Comptable / Caissier / Lecture voient les factures prêtes pour virement + payées
  (public.has_any_role(array['comptable','caissier','lecture']) and status in ('transmis_comptabilite','virement_effectue'))
);

drop policy if exists invoices_insert_policy on public.invoices;
create policy invoices_insert_policy
on public.invoices
for insert
with check (
  public.has_any_role(array['employe','chef','directrice','admin'])
  and created_by = auth.uid()
);

drop policy if exists invoices_update_employee_draft_policy on public.invoices;
create policy invoices_update_employee_draft_policy
on public.invoices
for update
using (
  public.has_any_role(array['employe','chef'])
  and created_by = auth.uid()
  and status in ('brouillon','rejete')
)
with check (
  public.has_any_role(array['employe','chef'])
  and created_by = auth.uid()
);

drop policy if exists invoices_update_directrice_policy on public.invoices;
create policy invoices_update_directrice_policy
on public.invoices
for update
using (
  public.has_any_role(array['directrice','admin'])
  and status in ('soumis_directrice','transmis_comptabilite')
)
with check (
  public.has_any_role(array['directrice','admin'])
);

drop policy if exists invoices_update_accounting_policy on public.invoices;
create policy invoices_update_accounting_policy
on public.invoices
for update
using (
  public.has_any_role(array['comptable','caissier','lecture'])
  and status = 'transmis_comptabilite'
)
with check (
  public.has_any_role(array['comptable','caissier','lecture'])
);

drop policy if exists invoices_delete_admin_policy on public.invoices;
create policy invoices_delete_admin_policy
on public.invoices
for delete
using (
  public.has_any_role(array['admin'])
);

commit;

