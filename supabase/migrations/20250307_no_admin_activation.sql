-- ============================================
-- Suppression de l'activation admin obligatoire
-- Tous les nouveaux comptes sont actifs immédiatement
-- (restriction par domaine email @crg.gn côté application)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
BEGIN
  -- Tous les comptes sont actifs immédiatement (plus d'activation admin)
  INSERT INTO public.users (id, email, username, nom, role, direction, fonction, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(split_part(NEW.email, '@', 1), 'user'),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Utilisateur'),
    v_role,
    NEW.raw_user_meta_data->>'direction',
    NEW.raw_user_meta_data->>'fonction',
    true  -- is_active = true pour tous (restriction domaine côté app)
  )
  ON CONFLICT (id) DO UPDATE SET
    is_active = COALESCE(EXCLUDED.is_active, true),
    role = EXCLUDED.role,
    direction = EXCLUDED.direction,
    fonction = EXCLUDED.fonction,
    nom = EXCLUDED.nom;
  RETURN NEW;
END;
$$;
