-- ============================================
-- Tables directions et services
-- Permet à l'admin de créer des directions, y assigner un directeur,
-- et gérer les services et utilisateurs par direction
-- ============================================

-- Table des directions (ex: DSI, Direction Commerciale)
CREATE TABLE IF NOT EXISTS public.directions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  director_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des services (appartiennent à une direction)
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction_id uuid NOT NULL REFERENCES public.directions(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(direction_id, name)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_services_direction_id ON public.services(direction_id);
CREATE INDEX IF NOT EXISTS idx_directions_director_id ON public.directions(director_id);

-- RLS : lecture pour tous les authentifiés, écriture pour admin uniquement
ALTER TABLE public.directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read directions" ON public.directions;
CREATE POLICY "Authenticated can read directions"
  ON public.directions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin can manage directions" ON public.directions;
CREATE POLICY "Admin can manage directions"
  ON public.directions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND lower(trim(u.role)) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND lower(trim(u.role)) = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated can read services" ON public.services;
CREATE POLICY "Authenticated can read services"
  ON public.services FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin can manage services" ON public.services;
CREATE POLICY "Admin can manage services"
  ON public.services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND lower(trim(u.role)) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND lower(trim(u.role)) = 'admin'
    )
  );

-- Données initiales : DSI avec ses services
INSERT INTO public.directions (name, label)
SELECT 'DSI', 'DSI (Direction des Systèmes d''Information)'
WHERE NOT EXISTS (SELECT 1 FROM public.directions WHERE name = 'DSI');

INSERT INTO public.services (direction_id, name, label)
SELECT d.id, v.name, v.label
FROM public.directions d
CROSS JOIN (VALUES
  ('Service Digital', 'Service Digital'),
  ('Service Développement et Innovation', 'Service Développement et Innovation'),
  ('Service Informatique', 'Service Informatique'),
  ('Service Opérationnel', 'Service Opérationnel'),
  ('Service Centre de Validation', 'Service Centre de Validation'),
  ('Service Comptabilité', 'Service Comptabilité'),
  ('Caisse', 'Caisse')
) AS v(name, label)
WHERE d.name = 'DSI'
AND NOT EXISTS (SELECT 1 FROM public.services WHERE direction_id = d.id AND name = v.name);
