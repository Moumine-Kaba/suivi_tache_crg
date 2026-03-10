# Configuration Supabase sans ngrok

Après désactivation de ngrok, mettez à jour la configuration Supabase pour utiliser uniquement localhost (ou votre URL de production).

---

## Étapes dans le Dashboard Supabase

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. **Authentication** → **URL Configuration**

---

## Modifications à effectuer

### Site URL

| Environnement | Valeur |
|---------------|--------|
| Développement local | `http://localhost:3000` |
| Production | `https://missions.crg.gn` (ou votre domaine) |

### Redirect URLs

**Supprimez** toutes les URLs ngrok, par exemple :
- `https://xxxx-xx-xx-xx-xx.ngrok-free.app/**`
- `https://xxxx.ngrok.io/**`

**Conservez ou ajoutez** uniquement :

| URL | Usage |
|-----|-------|
| `http://localhost:3000/**` | Développement local |
| `http://localhost:3000/reset-password` | Réinitialisation mot de passe (dev) |
| `https://missions.crg.gn/**` | Production |
| `https://missions.crg.gn/reset-password` | Réinitialisation mot de passe (prod) |

---

## Exemple de configuration (dev uniquement)

```
Site URL: http://localhost:3000

Redirect URLs:
  http://localhost:3000/**
  http://localhost:3000/reset-password
```

---

## Exemple de configuration (dev + prod)

```
Site URL: https://missions.crg.gn

Redirect URLs:
  http://localhost:3000/**
  http://localhost:3000/reset-password
  https://missions.crg.gn/**
  https://missions.crg.gn/reset-password
```

---

## Vérification

Après modification, testez :
- Connexion sur `http://localhost:3000`
- Mot de passe oublié (le lien doit rediriger vers `http://localhost:3000/reset-password`)
