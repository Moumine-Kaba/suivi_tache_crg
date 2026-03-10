-- Ajout de la colonne gender pour distinguer directeur (M) / directrice (F)
-- Exécuter dans Supabase : SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('M', 'F'));

COMMENT ON COLUMN public.users.gender IS 'M = homme (directeur), F = femme (directrice). Utilisé pour afficher le titre approprié.';
