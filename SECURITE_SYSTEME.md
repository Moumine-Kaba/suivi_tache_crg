# Système de sécurité – Comptes utilisateurs et directeurs

Document de référence complet du système de sécurité de l'application CRG (Suivi des tâches).

---

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE DE SÉCURITÉ                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  INSCRIPTION → Validation admin → ACTIVATION → CONNEXION → Utilisation       │
│       │              │                  │            │            │           │
│  is_active=false   confirm-user-email  is_active   is_active   ProtectedRoute│
│                    + notification      = true      vérifié     + rôle        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentification

### 2.1 Connexion (Login)

| Étape | Vérification |
|-------|--------------|
| 1 | Supabase Auth : email + mot de passe |
| 2 | Récupération du profil dans `public.users` |
| 3 | **Vérification `is_active`** : si `false` → déconnexion + message d'erreur |
| 4 | Rôle chargé depuis la base (jamais depuis le token seul) |

**Message si compte inactif :**  
« Votre compte est en attente de validation par un administrateur. Veuillez patienter ou contacter l'administrateur. »

**Email non confirmé :**  
Aucune auto-confirmation côté client. L'admin valide via l'Edge Function `confirm-user-email`.

### 2.2 Persistance de session

- **authStore** : stockage JWT + profil dans `localStorage`
- **initAuth** : au démarrage, vérifie `is_active` → si `false`, déconnexion forcée
- **refreshProfile** : à chaque rafraîchissement, vérifie `is_active` → si `false`, déconnexion

### 2.3 Déconnexion automatique

- **Realtime** : écoute des changements sur `public.users`
- Si `is_active` passe à `false` pour l'utilisateur connecté → déconnexion immédiate

---

## 3. Inscription

### 3.1 Rôles autorisés

- **Employé** : auto-inscription
- **Chef de Service** : auto-inscription
- **Directrice / Admin** : création uniquement par l'admin (Edge Function `create-user`)

### 3.2 Nouveaux comptes (auto-inscription employé/chef)

| Champ | Valeur |
|-------|--------|
| `is_active` | `false` |

**Déconnexion immédiate** : Après inscription, l'utilisateur est déconnecté (`signOut`) pour empêcher tout accès avant validation admin.

**Message** :  
« Votre compte sera validé par un administrateur. Vous recevrez une notification une fois activé. »

### 3.3 Trigger SQL

`handle_new_auth_user` (sur `auth.users` INSERT) :

- **employe / chef** → `is_active = false`
- **admin / directrice** → `is_active = true`

---

## 4. Activation des comptes

### 4.1 Qui peut activer ?

- **Admin uniquement** (Edge Function `confirm-user-email`)

### 4.2 Actions effectuées

1. `email_confirm = true` (Supabase Auth)
2. `is_active = true` (table `users`)
3. Insert dans `audit_log` (action `compte_activé`)
4. Notification dans `notifications` (type `compte_activé`)

### 4.3 Interface admin

- **Page Utilisateurs** : section « Comptes en attente de validation »
- Bouton **Activer** par compte → appel à `confirm-user-email`

---

## 5. Contrôle d'accès (routes)

### 5.1 ProtectedRoute

| Condition | Rôle requis |
|-----------|-------------|
| Non authentifié | Redirection vers `/login` |
| Rôle requis non respecté | Redirection vers `/dashboard` |

### 5.2 Routes par rôle

| Route | Rôle requis |
|-------|-------------|
| `/dashboard`, `/missions`, etc. | Authentifié |
| `/users`, `/directions` | `admin` |
| `/director-mode`, `/employee-comparison` | `directrice` ou `admin` |
| `/gestion` | `gestion` ou `admin` |

---

## 6. Protection des directeurs

### 6.1 Création

- Uniquement via Edge Function `create-user` (admin uniquement)

### 6.2 Modification

- Uniquement par admin
- Vérification `is_active` de l'admin avant modification

### 6.3 Suppression

- Uniquement par admin
- Confirmation renforcée pour les comptes directrice
- Impossible de supprimer le compte admin

---

## 7. Edge Functions

### 7.1 confirm-user-email

| Vérification | Action |
|--------------|--------|
| Token JWT valide | Requis |
| Rôle = admin | Requis |
| `is_active` admin = true | Requis |
| Activation du compte | `email_confirm` + `is_active = true` |
| Audit log | `compte_activé` |
| Notification | Création pour l'utilisateur activé |

### 7.2 create-user

| Vérification | Action |
|--------------|--------|
| Token JWT valide | Requis |
| Rôle = admin | Requis |
| `is_active` admin = true | Requis |
| Création utilisateur | Auth + `users` avec `is_active = true` |
| Audit log | `utilisateur_créé` |

---

## 8. Audit et traçabilité

### 8.1 Table audit_log

| Colonne | Description |
|---------|-------------|
| `id` | UUID |
| `created_at` | Horodatage |
| `action` | `compte_activé`, `utilisateur_créé` |
| `table_name` | `users` |
| `record_id` | ID de l'utilisateur concerné |
| `actor_id` | ID de l'admin qui agit |
| `actor_email` | Email de l'admin |
| `actor_role` | `admin` |
| `new_data` | Données associées (JSON) |

### 8.2 RLS

- **SELECT** : admin uniquement
- **INSERT** : service_role uniquement (Edge Functions)

---

## 9. Rôles et hiérarchie

| Rôle | Accès | Création |
|------|-------|----------|
| **admin** | Tout | Par lui-même ou autre admin |
| **directrice** | Direction, missions, rapports | Par admin uniquement |
| **chef** | Sa direction/service | Auto-inscription + validation |
| **employe** | Ses tâches | Auto-inscription + validation |
| **comptable** | Factures, comptabilité | Par admin |
| **gestion** | Service Gestion | Par admin |
| **lecture** | Lecture seule | Par admin |

---

## 10. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/services/api.js` | Login (is_active), register, usersService, signAndTransmit (sécurité signature) |
| `src/store/authStore.js` | Session, initAuth, refreshProfile |
| `src/App.jsx` | Realtime users (déconnexion si désactivé) |
| `src/components/guards/ProtectedRoute.jsx` | Protection des routes |
| `src/pages/Users.jsx` | Comptes en attente, activation |
| `supabase/functions/confirm-user-email/` | Activation des comptes |
| `supabase/functions/create-user/` | Création par admin |
| `supabase/migrations/20250305_security_audit.sql` | audit_log, trigger |

---

## 11. Déploiement

### 11.1 Migration SQL

Exécuter dans Supabase → SQL Editor :

```
supabase/migrations/20250305_security_audit.sql
```

### 11.2 Edge Functions

```bash
supabase functions deploy confirm-user-email
supabase functions deploy create-user
```

### 11.3 Realtime

Activer la réplication sur `public.users` (Supabase Dashboard → Database → Replication) pour la déconnexion automatique.

---

## 12. Sécurité de la signature des factures

### 12.1 Problème visé

Empêcher qu’un employé malveillant utilise le cachet du directeur pour signer sa propre facture.

### 12.2 Contrôles dans `submitToDirectrice` (signature employé)

| Vérification | Description |
|--------------|-------------|
| **Créateur uniquement** | Seul `created_by` peut apposer sa signature et soumettre |
| **Statut brouillon** | La facture doit être en `brouillon` pour être soumise |

### 12.3 Contrôles dans `signAndTransmit` (signature directeur)

| Vérification | Description |
|--------------|-------------|
| **Rôle** | Seul `directrice` ou `admin` peut signer |
| **Pas de signature de sa propre facture** | `signer.id !== facture.created_by` |
| **Direction** | Le directeur ne peut signer que les factures des employés de sa direction |
| **Statut** | La facture doit être en `soumis_directrice` |

### 12.4 Flux de validation

```
signAndTransmit(id, { signatureName, stampLabel, stampImage })
    │
    ├── Vérifier rôle = directrice ou admin
    ├── Récupérer la facture (created_by, direction, status)
    ├── Vérifier status = soumis_directrice
    ├── Vérifier signer.id !== facture.created_by
    └── Si directrice : getDirectorIdForUserId(created_by) === signer.id
    │
    ▼
Mise à jour facture (status, signature, cachet, signed_by)
```

### 12.5 Messages d’erreur

| Cas | Message |
|-----|---------|
| Soumission par non-créateur | « Vous ne pouvez signer que les factures que vous avez créées. Seul le créateur peut apposer sa signature et soumettre. » |
| Rôle non autorisé (directeur) | « Seul le directeur/directrice ou l'admin peut signer une facture. » |
| Signature de sa propre facture | « Vous ne pouvez pas signer votre propre facture. La signature doit être effectuée par le directeur/directrice de votre direction. » |
| Direction incorrecte | « Vous ne pouvez signer que les factures des employés de votre direction. » |

### 12.6 PIN de signature (directeur/admin)

Un code PIN à 4–6 chiffres peut être défini par le directeur ou l’admin pour renforcer la signature des factures.

| Élément | Description |
|---------|-------------|
| **Stockage** | Hash bcrypt dans `users.signature_pin_hash` |
| **Définition** | Page Profil → section « PIN de signature » |
| **Vérification** | Modal PIN affiché avant `signAndTransmit` si un PIN est défini |
| **RPC** | `set_signature_pin`, `verify_signature_pin`, `has_signature_pin` |

Migration : `supabase/migrations/20250306_signature_pin.sql`

---

## 13. Flux résumé

```
INSCRIPTION (employé/chef)
    │
    ▼
Compte créé (is_active = false)
    │
    ▼
Admin valide → confirm-user-email
    │
    ├── email_confirm = true
    ├── is_active = true
    ├── audit_log
    └── notification
    │
    ▼
Utilisateur peut se connecter
    │
    ▼
À chaque connexion / refresh :
    ├── Vérifier is_active
    └── Si false → Rejet
    │
    ▼
Utilisation de l'app
    ├── ProtectedRoute (rôle)
    ├── API (token + rôle + is_active admin)
    └── Realtime (déconnexion si désactivé)
```
