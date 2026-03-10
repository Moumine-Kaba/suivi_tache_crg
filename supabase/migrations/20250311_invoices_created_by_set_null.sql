-- ============================================
-- Permettre la suppression d'un utilisateur même s'il a créé des factures
-- Au lieu de RESTRICT, on utilise SET NULL : created_by devient NULL,
-- created_by_name conserve le nom pour l'historique
-- ============================================

-- 1. Rendre created_by nullable (pour accepter NULL après suppression de l'utilisateur)
ALTER TABLE public.invoices
  ALTER COLUMN created_by DROP NOT NULL;

-- 2. Supprimer l'ancienne contrainte
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;

-- 3. Réajouter la contrainte avec ON DELETE SET NULL
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.invoices.created_by IS 'ID de l''utilisateur créateur. Mis à NULL si l''utilisateur est supprimé (created_by_name conserve le nom).';
