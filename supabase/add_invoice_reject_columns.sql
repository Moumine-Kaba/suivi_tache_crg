-- Colonnes pour le rejet par le Service Gestion
-- Exécuter dans Supabase : SQL Editor

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid;
