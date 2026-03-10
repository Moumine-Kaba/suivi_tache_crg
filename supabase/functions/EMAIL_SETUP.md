# Envoi d'email des identifiants de connexion

Lorsqu'un administrateur crée un utilisateur, un email est automatiquement envoyé à l'utilisateur avec ses identifiants temporaires (email + mot de passe), si Resend est configuré.

## Configuration Resend

### 1. Créer un compte Resend

- Allez sur [resend.com](https://resend.com)
- Créez un compte (gratuit : 100 emails/jour, 3000/mois)

### 2. Obtenir la clé API

- Dans Resend : **API Keys** → **Create API Key**
- Copiez la clé (format `re_xxxxx`)

### 3. Configurer Supabase

**Option A – Dashboard Supabase**

1. Projet Supabase → **Project Settings** → **Edge Functions**
2. Section **Secrets** → **Add new secret**
3. Nom : `RESEND_API_KEY`, Valeur : votre clé Resend

**Option B – CLI**

```bash
supabase secrets set RESEND_API_KEY=re_votre_cle_api
```

### 4. (Optionnel) Variables supplémentaires

| Secret | Description | Exemple |
|--------|-------------|---------|
| `EMAIL_FROM` | Expéditeur de l'email | `Crédit Rural <noreply@creditruralgn.com>` |
| `APP_URL` | URL de l'application (lien connexion) | `https://missions.crg.gn` |

Pour tester sans domaine vérifié, Resend permet d'utiliser `onboarding@resend.dev` comme expéditeur (déjà utilisé par défaut).

### 5. Vérifier votre domaine (production)

Pour envoyer depuis `@creditruralgn.com` :

1. Resend → **Domains** → **Add Domain**
2. Ajoutez `creditruralgn.com`
3. Configurez les enregistrements DNS indiqués
4. Définissez : `EMAIL_FROM=Crédit Rural <noreply@creditruralgn.com>`

### 6. Redéployer la Edge Function

```bash
supabase functions deploy create-user
```

## Comportement

- **Avec `RESEND_API_KEY`** : l'utilisateur reçoit un email avec ses identifiants.
- **Sans `RESEND_API_KEY`** : aucun email n’est envoyé, le mot de passe temporaire reste affiché à l’admin.
