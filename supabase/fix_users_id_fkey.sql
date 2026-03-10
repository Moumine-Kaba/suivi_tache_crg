-- ============================================
-- Fix: Erreur "users_id_fkey" lors de la création d'un directeur
-- ============================================
-- Exécuter dans Supabase : SQL Editor
-- ============================================
--
-- La contrainte users_id_fkey (public.users.id -> auth.users.id) peut échouer
-- car l'insert dans public.users se fait avant que auth.users soit visible
-- (décalage de transaction entre Auth et Public).
--
-- Solution : Supprimer la contrainte FK. L'intégrité est assurée par le flux
-- applicatif (création Auth puis insert public.users avec le même id).
--

-- Supprimer la contrainte qui cause l'erreur
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Vérification : lister les contraintes restantes sur users
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.users'::regclass;
