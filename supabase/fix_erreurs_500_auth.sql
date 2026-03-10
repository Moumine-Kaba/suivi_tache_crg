-- ============================================
-- CORRECTION : Erreurs 500 sur signup, recover, login
-- "Database error finding user" / "Unable to process request"
-- ============================================
-- Cause : GoTrue attend des chaînes vides (''), pas NULL, pour les colonnes token
-- Exécuter dans Supabase : SQL Editor
-- ============================================

-- 1. Corriger les tokens NULL pour TOUS les utilisateurs existants
UPDATE auth.users SET confirmation_token = '' WHERE confirmation_token IS NULL;
UPDATE auth.users SET recovery_token = '' WHERE recovery_token IS NULL;
UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;

-- 2. Colonnes optionnelles (selon version Supabase)
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

-- 3. Vérification
SELECT id, email, 
       confirmation_token IS NULL AS conf_null,
       recovery_token IS NULL AS rec_null,
       email_change IS NULL AS email_ch_null
FROM auth.users;

-- ✅ Si des colonnes sont encore NULL, vérifiez les logs Auth dans le dashboard Supabase
-- (Project Settings > Auth > Logs)
--
-- Pour l'erreur 500 sur recover (mot de passe oublié) :
-- 1. Vérifiez Authentication > URL Configuration > Redirect URLs (ex: http://localhost:3000/reset-password)
-- 2. Vérifiez que l'email SMTP est configuré (Authentication > Email Templates)
