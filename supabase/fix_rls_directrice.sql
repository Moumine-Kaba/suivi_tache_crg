-- Patch: corriger la détection du rôle directrice (comparaison insensible à la casse)
-- À exécuter si la directrice ne voit pas les factures soumises
-- Date: 2026-02-23

begin;

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

commit;
