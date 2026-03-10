-- ============================================
-- Corriger les utilisateurs activés qui ne peuvent pas se connecter
-- (email_confirmed_at null dans auth.users)
-- Exécuter dans Supabase : SQL Editor
-- ============================================
-- Utilisez ce script si des utilisateurs ont été "activés" (is_active=true)
-- mais reçoivent encore "Email not confirmed" à la connexion.

-- Option 1 : Corriger TOUS les utilisateurs non confirmés
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
WHERE email_confirmed_at IS NULL;

-- Option 2 : Corriger UN utilisateur spécifique (remplacez l'UUID)
-- UPDATE auth.users
-- SET
--   email_confirmed_at = COALESCE(email_confirmed_at, now()),
--   raw_user_meta_data = jsonb_set(
--     COALESCE(raw_user_meta_data, '{}'::jsonb),
--     '{email_verified}',
--     'true'::jsonb,
--     true
--   ),
--   updated_at = now()
-- WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- Mettre à jour auth.identities pour cohérence
UPDATE auth.identities i
SET
  identity_data = jsonb_set(
    COALESCE(i.identity_data, '{}'::jsonb),
    '{email_verified}',
    'true'::jsonb,
    true
  ),
  updated_at = now()
FROM auth.users u
WHERE i.user_id = u.id AND u.email_confirmed_at IS NOT NULL;
