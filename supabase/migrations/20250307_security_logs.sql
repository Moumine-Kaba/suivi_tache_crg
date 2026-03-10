-- ============================================
-- Table security_logs - Logs de sécurité authentification
-- Connexions, tentatives échouées, inscriptions
-- ============================================

CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  action text NOT NULL,
  email text,
  user_id uuid REFERENCES public.users(id),
  ip_address inet,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  details jsonb
);

CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON public.security_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_logs_email ON public.security_logs(email);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON public.security_logs(ip_address);

-- Colonne last_login si absente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- Colonne prenom si absente (nom complet dans nom pour compatibilité)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'prenom'
  ) THEN
    ALTER TABLE public.users ADD COLUMN prenom text;
  END IF;
END $$;

COMMENT ON TABLE public.security_logs IS 'Logs de sécurité : connexions, inscriptions, tentatives échouées';
