# Backend d'authentification - Crédit Rural de Guinée

Backend sécurisé pour l'inscription et la connexion du personnel CRG.

## Fonctionnalités

- **Inscription** : Email @creditruralgn.com uniquement
- **Validation backend** : Domaine, mot de passe (8 car., lettres + chiffres)
- **Vérification email** : Supabase envoie un lien de confirmation
- **Rate limiting** : 10 inscriptions / 15 min, 20 connexions / 15 min
- **CAPTCHA** : reCAPTCHA v3 (optionnel)
- **Logs de sécurité** : Connexions et tentatives échouées

## Structure

```
server/
├── src/
│   ├── config/         # Configuration
│   ├── controllers/    # AuthController
│   ├── services/       # AuthService
│   ├── models/         # UserModel, SecurityLogModel
│   ├── middleware/     # validation, rateLimit, recaptcha
│   ├── routes/         # auth
│   ├── utils/          # logger
│   ├── app.js
│   └── server.js
├── .env.example
└── package.json
```

## Installation

```bash
cd server
npm install
cp .env.example .env
# Éditer .env avec vos clés Supabase
```

## Configuration

1. **Supabase** : Récupérer `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API)
2. **Base de données** : `DATABASE_URL` ou `SUPABASE_DB_URL` pour les logs (Settings → Database → Connection string)
3. **Email** : Activer "Confirm email" dans Supabase Auth (Authentication → Providers → Email)

## Démarrage

```bash
npm run dev
```

Le serveur écoute sur le port 3001.

## Frontend

Ajouter dans `.env` du projet React :

```
VITE_AUTH_API_URL=http://localhost:3001
```

En production : `VITE_AUTH_API_URL=https://votre-domaine.com`

## API

### POST /api/auth/register

```json
{
  "email": "prenom.nom@creditruralgn.com",
  "password": "MotDePasse123",
  "name": "Jean Dupont",
  "role": "employe",
  "direction": null,
  "fonction": null
}
```

### POST /api/auth/login

```json
{
  "email": "prenom.nom@creditruralgn.com",
  "password": "MotDePasse123"
}
```

Retourne `session` (access_token, refresh_token) pour le frontend Supabase.
