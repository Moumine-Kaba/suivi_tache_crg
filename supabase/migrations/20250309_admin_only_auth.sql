-- ============================================
-- Authentification admin uniquement
-- matricule, prenom, must_change_password, login_logs
-- ============================================

-- Colonnes users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'matricule') THEN
    ALTER TABLE public.users ADD COLUMN matricule text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'prenom') THEN
    ALTER TABLE public.users ADD COLUMN prenom text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'must_change_password') THEN
    ALTER TABLE public.users ADD COLUMN must_change_password boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status') THEN
    ALTER TABLE public.users ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_matricule ON public.users(matricule) WHERE matricule IS NOT NULL;

-- Table login_logs (connexions et tentatives)
CREATE TABLE IF NOT EXISTS public.login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES public.users(id),
  email text,
  ip_address inet,
  user_agent text,
  status text NOT NULL,
  details jsonb
);

CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON public.login_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON public.login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_email ON public.login_logs(email);
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON public.login_logs(status);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can read login_logs" ON public.login_logs;
CREATE POLICY "Admin can read login_logs"
  ON public.login_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND lower(trim(u.role)) = 'admin')
  );

COMMENT ON TABLE public.login_logs IS 'Journal des connexions et tentatives échouées';
