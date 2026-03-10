-- Permettre aux utilisateurs authentifiés d'insérer des notifications (pour les factures, tâches, etc.)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permettre à chaque utilisateur de mettre à jour ses propres notifications (ex: marquer comme lu)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Activer Realtime pour la table notifications (requis pour les mises à jour en temps réel)
-- Exécuter manuellement dans Supabase SQL Editor si les notifications n'apparaissent pas en direct :
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- (Ignorer l'erreur si la table y est déjà)
