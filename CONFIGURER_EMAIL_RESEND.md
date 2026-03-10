# Configurer l'envoi d'email des identifiants de connexion

## Étape 1 : Créer un compte Resend (gratuit)

1. Allez sur **https://resend.com/signup**
2. Créez un compte (100 emails/jour gratuits)

## Étape 2 : Obtenir la clé API

1. Connectez-vous sur **https://resend.com**
2. Menu **API Keys** → **Create API Key**
3. Donnez un nom (ex: "CRG Supabase")
4. **Copiez la clé** (format `re_xxxxxxxxxx`) — elle ne sera plus affichée !

## Étape 3 : Ajouter la clé dans Supabase

Dans votre terminal, exécutez (remplacez par VOTRE clé) :

```powershell
supabase secrets set RESEND_API_KEY=re_VOTRE_CLE_ICI
```

Exemple :
```powershell
supabase secrets set RESEND_API_KEY=re_123abc456def789
```

## C'est tout !

Désormais, à chaque création d'utilisateur par l'admin, la personne recevra automatiquement un email avec :
- Son email de connexion
- Son mot de passe temporaire
- Un lien pour se connecter
- Un rappel de changer le mot de passe à la première connexion

**Note :** Pour les tests, Resend permet d'envoyer depuis `onboarding@resend.dev` sans vérifier de domaine. Pour la production avec `@creditruralgn.com`, vérifiez votre domaine dans Resend → Domains.
