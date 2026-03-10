-- ============================================
-- SUPPRIMER TOUS LES UTILISATEURS
-- Exécuter dans Supabase : SQL Editor
-- Ensuite : créez votre admin via Authentication > Add user
-- ============================================

BEGIN;

-- 1. Désactiver RLS
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 2. Supprimer toutes les données
TRUNCATE TABLE public.users CASCADE;
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- 3. Réactiver RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;

COMMIT;

-- ✅ Terminé. Créez maintenant votre admin :
-- 1. Authentication > Users > Add user > Create new user
-- 2. Puis exécutez :
--    INSERT INTO public.users (id, email, username, nom, role, is_active)
--    SELECT id, email, split_part(email, '@', 1), 'Admin', 'admin', true
--    FROM auth.users WHERE email = 'VOTRE_EMAIL';
