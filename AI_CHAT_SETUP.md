# Configuration du Chat IA

Ce document explique comment configurer le chat IA génératif dans l'application.

## 🚀 Fonctionnalités

Le chat IA permet aux utilisateurs de :
- Poser des questions sur l'utilisation de l'application
- Obtenir de l'aide sur les tâches et rapports
- Recevoir des suggestions et conseils
- Interagir avec un assistant intelligent

## ⚙️ Configuration

### Option 1 : Utiliser OpenAI (Recommandé)

1. Créez un compte sur [OpenAI](https://platform.openai.com/)
2. Générez une clé API dans votre dashboard
3. Ajoutez la clé dans votre fichier `.env` :

```env
VITE_OPENAI_API_KEY=sk-votre-cle-api-ici
```

### Option 2 : Utiliser un Proxy/Backend personnalisé

Si vous préférez utiliser votre propre backend pour l'IA :

1. Configurez votre serveur proxy
2. Ajoutez les variables dans `.env` :

```env
VITE_USE_AI_PROXY=true
VITE_AI_PROXY_URL=https://votre-serveur.com/api/chat
```

Votre serveur doit accepter des requêtes POST avec ce format :

```json
{
  "messages": [
    {
      "role": "system",
      "content": "..."
    },
    {
      "role": "user",
      "content": "..."
    }
  ],
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

Et retourner une réponse au format OpenAI :

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Réponse de l'IA..."
      }
    }
  ]
}
```

### Option 3 : Mode Développement (Sans API)

Si aucune clé API n'est configurée, l'application utilisera automatiquement un mode mock qui répond aux questions de base. C'est utile pour le développement et les tests.

## 📝 Variables d'environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `VITE_OPENAI_API_KEY` | Clé API OpenAI | Non (si proxy utilisé) |
| `VITE_USE_AI_PROXY` | Activer l'utilisation d'un proxy | Non |
| `VITE_AI_PROXY_URL` | URL du serveur proxy | Oui (si proxy activé) |

## 🎯 Utilisation

1. Cliquez sur l'icône **Bot** dans le header
2. Le chat IA s'ouvre dans une fenêtre modale
3. Tapez votre question et appuyez sur Entrée ou cliquez sur Envoyer
4. L'IA répondra à vos questions

## 💡 Exemples de questions

- "Comment créer une nouvelle tâche ?"
- "Quels sont les différents statuts de tâches ?"
- "Comment envoyer un rapport ?"
- "Explique-moi comment fonctionne la validation des tâches"

## 🔒 Sécurité

- ⚠️ **Important** : Ne commitez jamais votre clé API dans le code source
- Utilisez toujours des variables d'environnement
- Ajoutez `.env` à votre `.gitignore`
- Pour la production, configurez les variables d'environnement sur votre serveur

## 🐛 Dépannage

### L'IA ne répond pas

1. Vérifiez que votre clé API est correcte
2. Vérifiez votre connexion internet
3. Consultez la console du navigateur pour les erreurs
4. Vérifiez que vous n'avez pas dépassé votre quota API

### Erreur "Clé API invalide"

- Vérifiez que `VITE_OPENAI_API_KEY` est bien définie dans `.env`
- Redémarrez le serveur de développement après avoir modifié `.env`
- Vérifiez que la clé API est active sur votre compte OpenAI

### Erreur "Limite de requêtes atteinte"

- Vous avez atteint votre limite de requêtes OpenAI
- Attendez quelques minutes ou passez à un plan supérieur
- Vérifiez votre utilisation sur le dashboard OpenAI

## 📚 Ressources

- [Documentation OpenAI](https://platform.openai.com/docs)
- [Guide des modèles OpenAI](https://platform.openai.com/docs/models)
- [Tarification OpenAI](https://openai.com/pricing)











