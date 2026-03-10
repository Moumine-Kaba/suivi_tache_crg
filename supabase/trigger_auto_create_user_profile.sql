-- ============================================
-- TRIGGER : Créer automatiquement le profil public.users
-- quand un utilisateur est créé dans Supabase (Auth > Add user)
-- Rôle par défaut : admin (accès à toutes les vues)
-- ============================================
-- Exécuter dans Supabase : SQL Editor
-- ============================================

-- Fonction appelée à chaque nouvel utilisateur auth
-- SÉCURITÉ : employe/chef (auto-inscription) → is_active false (validation admin requise)
--           admin/directrice (création par admin) → is_active true
-- Schéma public.users : id, email, username, nom, role, direction, fonction, is_active
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

-- Trigger sur auth.users (schéma auth)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ✅ Désormais : Authentication > Add user = profil créé automatiquement avec rôle admin
