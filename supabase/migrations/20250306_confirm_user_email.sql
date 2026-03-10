-- ============================================
-- Fonction RPC pour confirmer l'email d'un utilisateur (activation par admin)
-- Contourne le bug Supabase où updateUserById(email_confirm: true) ne suffit pas
-- pour débloquer la connexion (email_confirmed_at + identities.email_verified)
-- ============================================

CREATE OR REPLACE FUNCTION public.confirm_user_email(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_updated_count int;
BEGIN
  -- 1. Vérifier que l'appelant est authentifié et admin
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_id;
  IF v_caller_role IS NULL OR lower(trim(v_caller_role)) != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès non autorisé. Seul l''admin peut activer les comptes.');
  END IF;

  -- 2. Mettre à jour auth.users (email_confirmed_at + raw_user_meta_data.email_verified)
  UPDATE auth.users
  SET
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email_verified}',
      'true'::jsonb,
      true
    ),
    updated_at = now()
  WHERE id = target_user_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Utilisateur non trouvé dans auth.users. Ce compte existe peut-être uniquement dans public.users (compte orphelin). Supprimez-le et recréez-le via le formulaire "Ajouter un utilisateur" en vous assurant que l\'Edge Function create-user est déployée.'
    );
  END IF;

  -- 3. Mettre à jour auth.identities (email_verified dans identity_data)
  UPDATE auth.identities
  SET
    identity_data = jsonb_set(
      COALESCE(identity_data, '{}'::jsonb),
      '{email_verified}',
      'true'::jsonb,
      true
    ),
    updated_at = now()
  WHERE user_id = target_user_id;

  -- 4. Mettre à jour public.users (is_active)
  UPDATE public.users
  SET is_active = true, updated_at = now()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Compte activé avec succès',
    'user_id', target_user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute aux utilisateurs authentifiés (la fonction vérifie le rôle admin en interne)
GRANT EXECUTE ON FUNCTION public.confirm_user_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(uuid) TO service_role;

COMMENT ON FUNCTION public.confirm_user_email(uuid) IS 'Active un compte utilisateur en confirmant son email dans auth.users et auth.identities. Réservé aux admins.';
