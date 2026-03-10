-- ============================================
-- RLS security_logs : permettre au service_role d'insérer (Edge Functions)
-- Les Edge Functions utilisent le service_role qui bypass RLS par défaut
-- Cette migration assure que la table existe et est prête pour les logs
-- ============================================

-- S'assurer que security_logs existe
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

-- Index pour les requêtes de rate limiting
CREATE INDEX IF NOT EXISTS idx_security_logs_created_action ON public.security_logs(created_at, action);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_created ON public.security_logs(ip_address, created_at) WHERE ip_address IS NOT NULL;

-- RLS : lecture pour admin uniquement (sécurité)
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read security_logs" ON public.security_logs;
CREATE POLICY "Admin can read security_logs"
  ON public.security_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND lower(trim(u.role)) = 'admin'
    )
  );

-- Les inserts sont faits par les Edge Functions (service_role) qui bypass RLS
