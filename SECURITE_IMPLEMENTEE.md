# Mesures de sécurité implémentées

## Résumé

Toutes les mesures de sécurité prévues ont été implémentées pour les comptes utilisateurs et les directeurs.

---

## 1. Connexion (is_active)

- **Login** : vérification de `is_active` avant d’accepter la connexion
- **Message** : « Votre compte est en attente de validation par un administrateur. Veuillez patienter ou contacter l'administrateur. »
- **authStore** : déconnexion si `is_active === false` dans `initAuth` et `refreshProfile`
- **Realtime** : écoute des changements sur `users` pour déconnecter si `is_active` passe à `false`

---

## 2. Inscription

- **is_active = false** : nouveaux comptes (employé/chef) créés avec `is_active: false`
- **Message** : « Votre compte sera validé par un administrateur. Vous recevrez une notification une fois activé. »
- **Trigger SQL** : `handle_new_auth_user` met `is_active = false` pour les rôles employe/chef

---

## 3. Activation des comptes

- **Interface admin** : section « Comptes en attente » sur la page Utilisateurs
- **Bouton Activer** : appelle l’Edge Function `confirm-user-email`
- **Notification** : création d’une notification pour l’utilisateur activé
- **Audit** : enregistrement dans `audit_log` (action `compte_activé`)

---

## 4. Edge Functions

- **confirm-user-email** : vérification de `is_active` de l’admin, audit log, notification
- **create-user** : vérification de `is_active` de l’admin, audit log

---

## 5. Protection des directeurs

- **Suppression** : confirmation renforcée pour la suppression d’un compte directrice
- **Modification** : uniquement par admin (déjà en place)
- **API** : vérification de `is_active` de l’admin avant modification/suppression

---

## 6. Table audit_log

- **Création** : `supabase/migrations/20250305_security_audit.sql`
- **Actions** : `compte_activé`, `utilisateur_créé`
- **Champs** : `action`, `table_name`, `record_id`, `actor_id`, `actor_email`, `actor_role`, `new_data`, `created_at`

---

## 7. Déploiement

### Exécuter la migration SQL

Dans Supabase → SQL Editor, exécuter :

```
supabase/migrations/20250305_security_audit.sql
```

### Mettre à jour les comptes existants

Pour les comptes déjà créés en auto-inscription avec `is_active = true`, les mettre à jour si besoin :

```sql
-- Exemple : mettre à jour les employés/chefs sans direction assignée
-- (à adapter selon vos besoins)
UPDATE public.users 
SET is_active = false 
WHERE role IN ('employe', 'chef') 
AND is_active = true
AND created_at > '2025-01-01';  -- À ajuster
```

### Déployer les Edge Functions

```bash
supabase functions deploy confirm-user-email
supabase functions deploy create-user
```

---

## 8. Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `src/services/api.js` | Vérification `is_active` à la connexion, inscription avec `is_active: false`, vérification admin dans update/delete |
| `src/store/authStore.js` | Vérification `is_active` dans initAuth et refreshProfile |
| `src/App.jsx` | Realtime sur `users` pour déconnexion si désactivé |
| `src/pages/Users.jsx` | Section « Comptes en attente », bouton Activer, confirmation directrice |
| `supabase/functions/confirm-user-email/index.ts` | Vérification `is_active` admin, audit log, notification |
| `supabase/functions/create-user/index.ts` | Vérification `is_active` admin, audit log |
| `supabase/migrations/20250305_security_audit.sql` | Table `audit_log`, trigger mis à jour, Realtime |
