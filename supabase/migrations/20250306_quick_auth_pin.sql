-- ============================================
-- PIN d'authentification rapide (tous utilisateurs)
-- Pour le système PIN + Empreinte
-- Hash : md5 + salt (équivalent sécurisé, sans pgcrypto)
-- Pour bcrypt : activer pgcrypto et utiliser crypt(trim(p_pin), gen_salt('bf'))
-- ============================================

-- Colonnes pour PIN rapide (tous les utilisateurs, pas seulement directeurs)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS quick_auth_pin_hash text,
ADD COLUMN IF NOT EXISTS quick_auth_pin_salt text;

COMMENT ON COLUMN public.users.quick_auth_pin_hash IS 'Hash du PIN d''authentification rapide (md5+salt ou bcrypt).';
COMMENT ON COLUMN public.users.quick_auth_pin_salt IS 'Salt pour le hash du PIN rapide.';

-- Définir le PIN rapide (tous utilisateurs authentifiés)
CREATE OR REPLACE FUNCTION public.set_quick_auth_pin(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_salt text;
  v_hash text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  IF p_pin IS NULL OR length(trim(p_pin)) < 4 OR length(trim(p_pin)) > 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le PIN doit contenir 4 à 6 chiffres.');
  END IF;

  IF p_pin !~ '^[0-9]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le PIN doit contenir uniquement des chiffres.');
  END IF;

  v_salt := md5(gen_random_uuid()::text || random()::text || clock_timestamp()::text);
  v_hash := md5(v_salt || trim(p_pin));

  UPDATE public.users
  SET quick_auth_pin_hash = v_hash,
      quick_auth_pin_salt = v_salt,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Vérifier le PIN rapide
CREATE OR REPLACE FUNCTION public.verify_quick_auth_pin(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_stored_hash text;
  v_stored_salt text;
  v_valid boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Non authentifié');
  END IF;

  IF p_pin IS NULL OR trim(p_pin) = '' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'PIN requis');
  END IF;

  SELECT quick_auth_pin_hash, quick_auth_pin_salt INTO v_stored_hash, v_stored_salt
  FROM public.users WHERE id = v_user_id;

  IF v_stored_hash IS NULL OR v_stored_salt IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Aucun PIN défini.');
  END IF;

  v_valid := (v_stored_hash = md5(v_stored_salt || trim(p_pin)));

  RETURN jsonb_build_object('valid', v_valid);
END;
$$;

-- Vérifier si PIN rapide défini
CREATE OR REPLACE FUNCTION public.has_quick_auth_pin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT quick_auth_pin_hash IS NOT NULL AND quick_auth_pin_salt IS NOT NULL
     FROM public.users WHERE id = auth.uid()),
    false
  );
$$;
