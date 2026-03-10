-- ============================================
-- Restriction : seuls les emails @creditruralgn.com peuvent créer un compte
-- Les comptes @creditruralgn.com sont actifs immédiatement (pas d'activation admin)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
  v_is_active boolean;
  v_email text := lower(COALESCE(NEW.email, ''));
BEGIN
  -- Comptes @creditruralgn.com : actifs immédiatement (pas d'activation admin)
  -- Autres : employe/chef = inactif, admin/directrice = actif
  IF v_email LIKE '%@creditruralgn.com' THEN
    v_is_active := true;
  ELSE
    v_is_active := lower(trim(v_role)) NOT IN ('employe', 'chef');
  END IF;

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

COMMENT ON FUNCTION public.handle_new_auth_user() IS 'Crée le profil public.users. Comptes @creditruralgn.com actifs immédiatement.';
