# Sécurité authentification - Crédit Rural de Guinée

## Résumé

Plateforme réservée au personnel de Crédit Rural de Guinée. Seuls les emails **@creditruralgn.com** peuvent créer un compte.

## Fonctionnalités implémentées

### 1. Restriction domaine email
- **Frontend** : validation dans `constants/emailDomain.js` – message "Inscription réservée au personnel de Crédit Rural de Guinée"
- **Backend** : Edge Function `secure-register` + Auth Hook Postgres `hook_restrict_signup_creditruralgn`
- Impossible de contourner par le frontend

### 2. Validation mot de passe
- Minimum 8 caractères
- Au moins une lettre (majuscule et minuscule)
- Au moins un chiffre
- Un caractère spécial
- Supabase hash les mots de passe (bcrypt)

### 3. Vérification email
- Comptes créés avec `email_confirm: false` → Supabase envoie un email de confirmation
- Le compte reste inactif tant que l'email n'est pas confirmé
- **À activer** : Supabase Dashboard > Auth > Providers > Email > "Confirm email"

### 4. Rate limiting
- 5 tentatives d'inscription par heure et par IP
- Enregistré dans `security_logs`

### 5. Logs de sécurité
- Table `security_logs` : inscriptions, refus (domaine, mot de passe), tentatives
- Consultable par les admins

### 6. Structure base de données
- `auth.users` : Supabase Auth (email, password_hash, email_confirmed_at)
- `public.users` : id, email, nom, prenom, role, direction, fonction, last_login, created_at, etc.

### 7. Authentification
- Login avec email + mot de passe
- JWT Supabase (géré automatiquement)
- Expiration configurable dans Supabase

## Déploiement

### Migrations
```bash
# Exécuter dans Supabase SQL Editor (dans l'ordre) :
# - 20250307_security_logs.sql
# - 20250308_auth_hook_domain.sql
# - 20250308_security_logs_rls.sql
```

### Auth Hook
1. Supabase Dashboard > Authentication > Hooks
2. "Before user created" > Add hook
3. Type : **Postgres function**
4. Function : `hook_restrict_signup_creditruralgn`

### Edge Functions
```bash
supabase functions deploy secure-register
```

### Variables d'environnement
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ALLOWED_EMAIL_DOMAIN` (optionnel, défaut: creditruralgn.com)

## Captcha (optionnel)

Pour ajouter une protection anti-bot (reCAPTCHA, hCaptcha) :
1. Créer un compte sur le service choisi
2. Ajouter le script dans `index.html`
3. Récupérer le token côté client
4. L'envoyer dans le body de `secure-register`
5. Vérifier le token dans l'Edge Function avant de créer l'utilisateur
