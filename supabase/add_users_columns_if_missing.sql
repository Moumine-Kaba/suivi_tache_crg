-- ============================================
-- Ajouter direction et fonction à public.users si absents
-- ============================================
-- Exécuter dans Supabase : SQL Editor (si erreur "column does not exist")
-- ============================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS direction text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fonction text;
