# Authentification – Création de comptes par l'administrateur uniquement

## Vue d'ensemble

La plateforme Crédit Rural de Guinée utilise un système d'authentification sécurisé où **seul l'administrateur peut créer les comptes utilisateurs**. L'inscription publique est désactivée.

## Fonctionnalités implémentées

### 1. Création d'utilisateur par l'administrateur uniquement

L'administrateur crée les utilisateurs depuis la page **Utilisateurs** (`/users`) avec les informations suivantes :

- **Nom** (obligatoire)
- **Prénom** (obligatoire)
- **Matricule** (optionnel)
- **Email professionnel** se terminant par `@creditruralgn.com` (obligatoire)
- **Rôle** : admin, directrice, chef, employe, comptable, gestion, lecture

Le système vérifie que l'email se termine bien par `@creditruralgn.com`.

### 2. Mot de passe temporaire automatique

Lors de la création d'un utilisateur :

- Un mot de passe temporaire est **généré automatiquement** (respecte les règles : 8 car., maj., min., chiffre, spécial)
- Le mot de passe est affiché à l'administrateur après la création
- L'administrateur doit **communiquer ce mot de passe** à l'utilisateur par un canal sécurisé
- `must_change_password = true` est défini en base

### 3. Première connexion – Changement obligatoire

Lors de la première connexion :

- Si `must_change_password = true`, l'utilisateur est redirigé vers `/change-password-initiale`
- Il doit définir un nouveau mot de passe avant d'accéder au reste de la plateforme
- Une fois le mot de passe changé, `must_change_password` est mis à `false`

### 4. Authentification

- Connexion par **email** et **mot de passe**
- Session Supabase (JWT) pour l'authentification
- Les routes protégées vérifient l'authentification et le rôle

### 5. Sécurité

- **Inscription publique désactivée** : pas de formulaire "Créer un compte" sur la page de connexion
- **Journal des connexions** : table `login_logs` pour tracer les connexions réussies
- **Audit** : table `audit_log` pour les actions sensibles (création d'utilisateurs par l'admin)
- **Rate limiting** : géré par Supabase Auth côté serveur
- **Middleware** : `ProtectedRoute` pour protéger les routes, redirection vers changement de mot de passe si nécessaire

### 6. Gestion des rôles (RBAC)

| Rôle       | Accès                                                                 |
|-----------|-----------------------------------------------------------------------|
| **admin** | Gestion complète des utilisateurs, directions, configuration          |
| **directrice** | Création de tâches, validation missions/factures, rapports        |
| **chef**  | Validation missions, rapports, factures de son service                |
| **employe** | Exécution tâches, rapports, factures                               |
| **comptable** | Validation factures (imputation comptable)                        |
| **gestion** | Contrôle factures, suivi budgétaire                                |
| **lecture** | Consultation seule, pas de modification                            |

### 7. Structure des tables

**Table `users`** (colonnes principales) :
- `id`, `nom`, `prenom`, `email`, `matricule`, `role`, `direction`, `fonction`
- `must_change_password` (boolean)
- `status`, `is_active`, `last_login`, `created_at`, `updated_at`

**Table `login_logs`** :
- `id`, `user_id`, `email`, `ip_address`, `user_agent`, `status`, `details`, `created_at`

**Table `audit_log`** :
- `id`, `action`, `table_name`, `record_id`, `actor_id`, `actor_email`, `new_data`, `created_at`

### 8. Architecture

```
src/
├── pages/
│   ├── Login.jsx              # Connexion uniquement (pas d'inscription)
│   ├── ChangePasswordInitiale.jsx  # Changement mot de passe première connexion
│   └── Users.jsx              # Gestion utilisateurs (admin)
├── components/guards/
│   └── ProtectedRoute.jsx     # Vérifie auth + must_change_password
├── store/
│   └── authStore.js           # État auth + mustChangePassword
├── services/
│   └── api.js                 # authService, usersService
└── utils/
    └── passwordValidation.js  # generateTemporaryPassword, validatePassword

supabase/
├── functions/
│   └── create-user/           # Edge Function création utilisateur (admin)
└── migrations/
    ├── 20250309_admin_only_auth.sql   # matricule, prenom, must_change_password, login_logs
    └── 20250310_login_logs_insert.sql # Politique INSERT login_logs
```

## Flux utilisateur

1. **Admin** crée un utilisateur → mot de passe temporaire généré et affiché
2. **Utilisateur** reçoit l'email et le mot de passe temporaire (par l'admin)
3. **Utilisateur** se connecte avec email + mot de passe temporaire
4. **Redirection** vers `/change-password-initiale` (obligatoire)
5. **Utilisateur** définit son nouveau mot de passe
6. **Accès** au tableau de bord et au reste de l'application

## Configuration

- Domaine email autorisé : `@creditruralgn.com` (configurable via `VITE_ALLOWED_EMAIL_DOMAIN`)
- Les migrations Supabase doivent être appliquées pour `login_logs` et les colonnes `users`
