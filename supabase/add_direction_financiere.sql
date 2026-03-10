-- ============================================
-- Ajout de la Direction Financière
-- Comptable, Caissier et Service Gestion font partie de cette direction
-- Exécuter dans Supabase : SQL Editor
-- ============================================

-- Créer la Direction Financière
INSERT INTO public.directions (name, label)
SELECT 'Direction_Financiere', 'Direction Financière'
WHERE NOT EXISTS (SELECT 1 FROM public.directions WHERE name = 'Direction_Financiere');

-- Ajouter les services de la Direction Financière
INSERT INTO public.services (direction_id, name, label)
SELECT d.id, v.name, v.label
FROM public.directions d
CROSS JOIN (VALUES
  ('Service Comptable', 'Service Comptable'),
  ('Service Gestion', 'Service Gestion')
) AS v(name, label)
WHERE d.name = 'Direction_Financiere'
AND NOT EXISTS (SELECT 1 FROM public.services s WHERE s.direction_id = d.id AND s.name = v.name);
