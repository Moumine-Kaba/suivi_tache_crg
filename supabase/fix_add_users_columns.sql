-- ============================================
-- Ajouter les colonnes manquantes à la table users
-- (matricule, prenom, must_change_password, status)
-- Exécuter dans Supabase : SQL Editor
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'matricule') THEN
    ALTER TABLE public.users ADD COLUMN matricule text;
    RAISE NOTICE 'Colonne matricule ajoutée';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'prenom') THEN
    ALTER TABLE public.users ADD COLUMN prenom text;
    RAISE NOTICE 'Colonne prenom ajoutée';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'must_change_password') THEN
    ALTER TABLE public.users ADD COLUMN must_change_password boolean DEFAULT false;
    RAISE NOTICE 'Colonne must_change_password ajoutée';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status') THEN
    ALTER TABLE public.users ADD COLUMN status text DEFAULT 'active';
    RAISE NOTICE 'Colonne status ajoutée';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_matricule ON public.users(matricule) WHERE matricule IS NOT NULL;
