-- ============================================
-- CRÉER UN COMPTE ADMIN DANS SUPABASE
-- ============================================
-- Exécuter dans Supabase : SQL Editor
-- ============================================
-- Modifiez l'email et le mot de passe ci-dessous
-- Identifiants par défaut : admin@crg.gn / AdminCRG2025!
-- ⚠️ Changez le mot de passe après la première connexion
-- ✅ Script idempotent : peut être réexécuté sans erreur
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@crg.gn';
  v_password TEXT := 'AdminCRG2025!';
  v_username TEXT := 'admin';
  v_nom TEXT := 'Administrateur';
  v_admin_exists BOOLEAN;
BEGIN
  -- Vérifier si admin@crg.gn existe déjà dans auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;
  v_admin_exists := (v_user_id IS NOT NULL);

  IF v_admin_exists THEN
    -- Admin existe déjà : réinitialiser le mot de passe ET mettre à jour le rôle
    -- (utile si "Email ou mot de passe incorrect" - le hash peut être corrompu)
    UPDATE auth.users
    SET encrypted_password = crypt(v_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        confirmation_token = '',
        recovery_token = '',
        email_change = '',
        updated_at = NOW()
    WHERE id = v_user_id;

    INSERT INTO public.users (id, email, username, nom, role, direction, fonction, is_active)
    VALUES (v_user_id, v_email, v_username, v_nom, 'admin', NULL, NULL, true)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      username = EXCLUDED.username,
      nom = EXCLUDED.nom,
      role = 'admin',
      direction = EXCLUDED.direction,
      fonction = EXCLUDED.fonction,
      is_active = EXCLUDED.is_active;
    RAISE NOTICE 'Admin existant mis à jour : % / % (mot de passe réinitialisé)', v_email, v_password;
  ELSE
    -- Créer un nouvel admin
    v_user_id := gen_random_uuid();

    -- 1. auth.users (tokens vides pour éviter erreur 500 au login)
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token, email_change,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      '', '', '',
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW()
    );

    -- 2. auth.identities (requis pour la connexion)
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user_id,
      v_user_id,
      format('{"sub": "%s", "email": "%s"}', v_user_id, v_email)::jsonb,
      'email',
      v_user_id,
      NOW(),
      NOW(),
      NOW()
    );

    -- 3. public.users (UPSERT si le trigger a déjà créé le profil)
    INSERT INTO public.users (id, email, username, nom, role, direction, fonction, is_active)
    VALUES (v_user_id, v_email, v_username, v_nom, 'admin', NULL, NULL, true)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      username = EXCLUDED.username,
      nom = EXCLUDED.nom,
      role = 'admin',
      direction = EXCLUDED.direction,
      fonction = EXCLUDED.fonction,
      is_active = EXCLUDED.is_active;

    RAISE NOTICE 'Admin créé avec succès : % / %', v_email, v_password;
  END IF;
END $$;

-- Corriger les tokens NULL (évite "Database error querying schema" / 500 au login)
-- GoTrue attend des chaînes vides '', pas NULL
UPDATE auth.users SET confirmation_token = '' WHERE confirmation_token IS NULL;
UPDATE auth.users SET recovery_token = '' WHERE recovery_token IS NULL;
UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;

-- Colonnes optionnelles (selon version Supabase)
DO $$
BEGIN
  EXECUTE 'UPDATE auth.users SET email_change_token = '''' WHERE email_change_token IS NULL';
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'UPDATE auth.users SET email_change_token_new = '''' WHERE email_change_token_new IS NULL';
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- ============================================
-- ✅ Connexion : admin@crg.gn / AdminCRG2025!
-- Rôle : admin (accès à toutes les fonctionnalités)
-- ============================================
-- Pour personnaliser :
-- 1. Modifiez v_email, v_password, v_username, v_nom dans le bloc DO $$
-- 2. Réexécutez ce script
-- ============================================
