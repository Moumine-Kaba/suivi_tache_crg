-- ============================================
-- DÉSACTIVER RLS SUR TOUTES LES TABLES
-- ============================================
-- Résout les erreurs 403 et "new row violates row-level security policy"
-- sur invoices, notifications, users, etc.
--
-- ATTENTION : Avec RLS désactivé, tous les utilisateurs authentifiés
-- peuvent lire/modifier les données selon les permissions de l'API.
-- À utiliser en développement ou si Madame ne peut pas valider les factures.
--
-- Exécuter dans Supabase : SQL Editor
-- ============================================

-- Tables principales
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports DISABLE ROW LEVEL SECURITY;

-- Tables directions/services (si elles existent)
DO $$
BEGIN
  ALTER TABLE public.directions DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Table messages (si elle existe)
DO $$
BEGIN
  ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Vérification : lister les tables avec RLS désactivé
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_actif
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
WHERE schemaname = 'public'
  AND tablename IN ('users', 'invoices', 'notifications', 'tasks', 'reports', 'directions', 'services', 'messages')
ORDER BY tablename;
