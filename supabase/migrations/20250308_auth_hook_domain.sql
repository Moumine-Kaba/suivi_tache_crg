-- ============================================
-- Hook Auth : Validation domaine @creditruralgn.com (backend)
-- Empêche toute inscription avec un email hors domaine
-- À configurer : Supabase Dashboard > Auth > Hooks > Before user created
-- Sélectionner : Postgres function > hook_restrict_signup_creditruralgn
-- ============================================

CREATE OR REPLACE FUNCTION public.hook_restrict_signup_creditruralgn(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_domain text := 'creditruralgn.com';
BEGIN
  v_email := lower(trim(event->'user'->>'email'));
  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Inscription réservée au personnel de Crédit Rural de Guinée',
        'http_code', 403
      )
    );
  END IF;

  IF NOT (v_email LIKE '%@' || v_domain) THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Inscription réservée au personnel de Crédit Rural de Guinée',
        'http_code', 403
      )
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

COMMENT ON FUNCTION public.hook_restrict_signup_creditruralgn(jsonb) IS 'Auth Hook : n''autorise que les emails @creditruralgn.com. Configurer dans Auth > Hooks > Before user created.';
