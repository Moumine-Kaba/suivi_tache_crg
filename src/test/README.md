# Tests Unitaires - Suivi Tâches CRG

## 📋 Vue d'ensemble

Cette suite de tests unitaires couvre toutes les fonctionnalités critiques de l'application :

- ✅ Services API (authentification, tâches, utilisateurs)
- ✅ Stores Zustand (authStore, tasksStore)
- ✅ Utilitaires (cn)
- ✅ Composants UI (Button, Badge)
- ✅ Validations métier (restrictions chefs de service)

## 🚀 Commandes disponibles

```bash
# Lancer tous les tests
npm test

# Lancer les tests en mode watch
npm test -- --watch

# Lancer les tests avec interface graphique
npm run test:ui

# Lancer les tests avec couverture de code
npm run test:coverage
```

## 📁 Structure des tests

```
src/test/
├── setup.js                    # Configuration globale des tests
├── utils.test.js               # Tests des utilitaires
├── services/
│   ├── api.test.js             # Tests des services API
│   └── chefValidation.test.js  # Tests de validation des chefs
├── stores/
│   ├── authStore.test.js       # Tests du store d'authentification
│   └── tasksStore.test.js      # Tests du store de tâches
└── components/
    └── ui/
        ├── Button.test.jsx      # Tests du composant Button
        └── Badge.test.jsx       # Tests du composant Badge
```

## ✅ Fonctionnalités testées

### Services API
- ✅ Connexion utilisateur
- ✅ Récupération de l'utilisateur actuel
- ✅ Gestion des erreurs d'authentification
- ✅ Création de tâches
- ✅ Validation des permissions (chefs de service)
- ✅ Récupération des tâches
- ✅ Gestion des utilisateurs

### Stores Zustand
- ✅ Connexion/déconnexion
- ✅ Mise à jour de l'utilisateur
- ✅ Persistance dans localStorage
- ✅ Chargement des tâches avec cache
- ✅ Gestion des erreurs

### Composants UI
- ✅ Rendu des composants
- ✅ Gestion des événements (clics)
- ✅ États désactivés
- ✅ Variantes de style
- ✅ Tailles

### Validations métier
- ✅ Les chefs ne peuvent assigner qu'aux employés de leur service
- ✅ Les chefs ne peuvent pas assigner à d'autres chefs
- ✅ Les chefs ne peuvent pas assigner à des employés d'autres directions
- ✅ Les admins peuvent créer des tâches sans restriction

## 🎯 Couverture de code

Les tests visent une couverture de code élevée pour garantir la qualité et la fiabilité de l'application.

## 📝 Ajout de nouveaux tests

Pour ajouter un nouveau test :

1. Créer un fichier `*.test.js` ou `*.test.jsx` dans le dossier approprié
2. Importer les dépendances nécessaires
3. Utiliser `describe` pour grouper les tests
4. Utiliser `it` ou `test` pour chaque cas de test
5. Utiliser `expect` pour les assertions

Exemple :
```javascript
import { describe, it, expect } from 'vitest'
import { maFonction } from '../maFonction'

describe('maFonction', () => {
  it('devrait faire quelque chose', () => {
    const result = maFonction()
    expect(result).toBe(expectedValue)
  })
})
```













