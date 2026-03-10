-- ============================================
-- MESURES DE SÉCURITÉ - Audit et validation des comptes
-- Exécuter dans Supabase : SQL Editor
-- ============================================

-- 1. Table audit_log pour traçabilité
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  actor_id uuid REFERENCES public.users(id),
  actor_email text,
  actor_role text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);

-- 2. Mise à jour du trigger : is_active = false pour employe/chef (auto-inscription)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
  v_is_active boolean;
BEGIN
  -- employe et chef = inscription auto → is_active false (validation admin requise)
  -- admin et directrice = création par admin → is_active true
  v_is_active := lower(trim(v_role)) NOT IN ('employe', 'chef');
  
  INSERT INTO public.users (id, email, username, nom, role, direction, fonction, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(split_part(NEW.email, '@', 1), 'user'),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Utilisateur'),
    v_role,
    NEW.raw_user_meta_data->>'direction',
    NEW.raw_user_meta_data->>'fonction',
    v_is_active
  )
  ON CONFLICT (id) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    role = EXCLUDED.role,
    direction = EXCLUDED.direction,
    fonction = EXCLUDED.fonction,
    nom = EXCLUDED.nom;
  RETURN NEW;
END;
$$;

-- 3. RLS sur audit_log (lecture pour admin uniquement)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read audit_log" ON public.audit_log;
CREATE POLICY "Admin can read audit_log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND lower(trim(u.role)) = 'admin'
    )
  );

-- Insert : uniquement via service_role (Edge Functions) - pas d'insert client
-- Les requêtes service_role contournent RLS

-- 4. Activer Realtime sur users pour déconnexion automatique si is_active passe à false
-- (Optionnel : si Realtime n'est pas activé, la déconnexion se fera au prochain refreshProfile)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Table déjà dans la publication
END $$;
