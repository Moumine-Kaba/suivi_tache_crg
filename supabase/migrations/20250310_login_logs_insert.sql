-- ============================================
-- Politique INSERT pour login_logs
-- Permet aux utilisateurs authentifiés d'inscrire leur propre connexion
-- ============================================

DROP POLICY IF EXISTS "Authenticated can insert own login" ON public.login_logs;
CREATE POLICY "Authenticated can insert own login"
  ON public.login_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "Authenticated can insert own login" ON public.login_logs IS
  'Permet à un utilisateur connecté de journaliser sa propre connexion réussie';
