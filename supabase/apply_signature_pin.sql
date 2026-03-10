-- ============================================
-- PIN de signature pour directeurs
-- À exécuter dans Supabase SQL Editor
-- SANS pgcrypto (évite l'erreur gen_salt)
-- ============================================

-- 1. Colonnes
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS signature_pin_hash text,
ADD COLUMN IF NOT EXISTS signature_pin_salt text;

COMMENT ON COLUMN public.users.signature_pin_hash IS 'Hash du PIN de signature (md5 avec salt).';
COMMENT ON COLUMN public.users.signature_pin_salt IS 'Salt aléatoire pour le hash du PIN.';

-- 2. Fonction : définir le PIN
CREATE OR REPLACE FUNCTION public.set_signature_pin(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_salt text;
  v_hash text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT role INTO v_role FROM public.users WHERE id = v_user_id;
  IF v_role IS NULL OR lower(trim(v_role)) NOT IN ('directrice', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seuls les directeurs et admin peuvent définir un PIN de signature.');
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
  SET signature_pin_hash = v_hash,
      signature_pin_salt = v_salt,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Fonction : vérifier le PIN
CREATE OR REPLACE FUNCTION public.verify_signature_pin(p_pin text)
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

  SELECT signature_pin_hash, signature_pin_salt INTO v_stored_hash, v_stored_salt
  FROM public.users WHERE id = v_user_id;

  IF v_stored_hash IS NULL OR v_stored_salt IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Aucun PIN défini. Définissez votre PIN dans votre profil.');
  END IF;

  v_valid := (v_stored_hash = md5(v_stored_salt || trim(p_pin)));

  RETURN jsonb_build_object('valid', v_valid);
END;
$$;

-- 4. Fonction : vérifier si PIN défini
CREATE OR REPLACE FUNCTION public.has_signature_pin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT signature_pin_hash IS NOT NULL AND signature_pin_salt IS NOT NULL
     FROM public.users WHERE id = auth.uid()),
    false
  );
$$;
