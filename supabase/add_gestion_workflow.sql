-- ============================================
-- Workflow Service Gestion : contrôle avant Service Financier
-- ============================================
-- Quand le directeur signe → facture va au Service Gestion (controle_gestion)
-- Service Gestion contrôle toutes les factures, puis transfère au Service Financier
-- Exécuter dans Supabase SQL Editor
-- ============================================

BEGIN;

-- 1. Ajouter le rôle 'gestion' (Service Gestion)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'directrice', 'chef', 'employe', 'lecture', 'comptable', 'caissier', 'gestion'));

-- 2. Ajouter le statut 'controle_gestion' aux factures
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status IN (
    'brouillon',
    'soumis_directrice',
    'controle_gestion',
    'transmis_comptabilite',
    'virement_effectue',
    'rejete'
  ));

COMMIT;
