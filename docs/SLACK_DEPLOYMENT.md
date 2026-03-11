# Suivi des déploiements via Slack

Ce projet envoie des notifications Slack à chaque événement de déploiement Vercel (succès, échec, annulation).

## Option 1 : Intégration native Vercel ↔ Slack (recommandée)

La méthode la plus simple, sans code :

1. Aller sur **[Vercel Integrations - Slack](https://vercel.com/integrations/slack)**
2. Cliquer sur **Add Integration**
3. Choisir votre workspace Slack et autoriser l'accès
4. Sélectionner le canal (ex. `#deployments`) et les événements souhaités
5. C'est terminé

---

## Option 2 : Webhook personnalisé (plus de contrôle)

Pour des messages personnalisés et plus de flexibilité :

### 1. Créer un Incoming Webhook Slack

1. Ouvrir [Slack API - Incoming Webhooks](https://api.slack.com/messaging/webhooks)
2. **Create your Slack app** (ou utiliser une app existante)
3. Activer **Incoming Webhooks**
4. **Add New Webhook to Workspace** → choisir le canal (ex. `#deployments`)
5. Copier l’URL du webhook (format `https://hooks.slack.com/services/xxx/yyy/zzz`)

### 2. Configurer la variable d'environnement sur Vercel

1. Dashboard Vercel → projet **suivi_tache_crg**
2. **Settings** → **Environment Variables**
3. Ajouter :
   - **Name** : `SLACK_WEBHOOK_URL`
   - **Value** : l’URL du webhook Slack
   - **Environments** : Production, Preview, Development (ou au minimum Production)

### 3. Configurer le webhook Vercel

1. Dashboard Vercel → projet → **Settings** → **Webhooks** (ou **Git** selon votre version)
2. Ou via l’API Vercel : créer un webhook pointant vers :
   ```
   https://suivi-tache-crg.vercel.app/api/deploy-webhook
   ```
3. Événements à sélectionner :
   - `deployment.ready` — déploiement réussi
   - `deployment.error` — déploiement échoué
   - `deployment.canceled` — déploiement annulé
   - `deployment.created` — déploiement démarré (optionnel)

#### Création du webhook via l’API Vercel

```bash
curl -X POST "https://api.vercel.com/v10/webhooks?teamId=VOTRE_TEAM_ID" \
  -H "Authorization: Bearer VOTRE_TOKEN_VERCEL" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://suivi-tache-crg.vercel.app/api/deploy-webhook",
    "events": ["deployment.ready", "deployment.error", "deployment.canceled"]
  }'
```

Token : **Vercel** → **Settings** → **Tokens** → créer un token.

### 4. Tester

Après un `git push` qui déclenche un déploiement, vous devriez recevoir une notification dans le canal Slack configuré.

---

## Événements gérés

| Événement            | Emoji | Description                        |
|----------------------|-------|------------------------------------|
| `deployment.ready`   | ✅    | Déploiement terminé avec succès    |
| `deployment.error`   | ❌    | Échec du build/déploiement         |
| `deployment.canceled`| ⏹️    | Déploiement annulé                 |
| `deployment.created` | 🚀    | Déploiement démarré                |

---

## Structure technique

- **`api/deploy-webhook.js`** : fonction serverless Vercel qui reçoit les webhooks et les envoie à Slack
- Les requêtes vers `/api/*` ne sont pas redirigées vers l’application SPA (voir `vercel.json`)
