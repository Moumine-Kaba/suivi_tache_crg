# CRG Pilotage Missions

Application web professionnelle de pilotage de missions et de suivi de performance pour le Crédit Rural de Guinée (CRG).

## 🚀 Technologies

- **React 18** (Vite)
- **JavaScript (ES6+)**
- **Tailwind CSS** - Design system avec thème dark/light
- **react-router-dom** - Routing
- **Recharts** - Graphiques et visualisations
- **Zustand** - State management
- **react-hook-form** - Gestion des formulaires
- **lucide-react** - Icônes
- **axios** - Client HTTP

## 📁 Structure du Projet

```
src/
├── components/
│   ├── ui/              # Composants UI réutilisables (Button, Card, Modal, Badge)
│   ├── charts/          # Composants graphiques Recharts
│   ├── layout/          # Sidebar, Header, Layout
│   └── guards/          # ProtectedRoute pour l'authentification
├── pages/
│   ├── Login.jsx        # Page de connexion
│   ├── Dashboard.jsx    # Dashboard principal avec KPIs et graphiques
│   ├── Missions.jsx     # Gestion des tâches/missions
│   ├── Calendar.jsx     # Calendrier mensuel
│   ├── Reports.jsx      # Rapports hebdomadaires
│   ├── Notifications.jsx # Centre de notifications
│   └── Users.jsx        # Gestion des utilisateurs (Directrice uniquement)
├── services/
│   └── api.js           # Service API avec données mockées
├── store/
│   └── authStore.js     # Store Zustand pour l'authentification
├── utils/
│   ├── cn.js            # Utilitaire pour combiner les classes CSS
│   └── theme.js         # Gestion du thème dark/light
├── App.jsx              # Composant principal avec routing
└── main.jsx             # Point d'entrée
```

## 🎨 Design System

### Couleurs CRG
- **Primary**: `#006020` (Vert foncé)
- **Secondary**: `#408060` (Vert moyen)
- **Accent**: `#e0c060` (Jaune doré)
- **Dark**: `#004020` (Vert très foncé)

### Thèmes
- **Light mode** : Mode clair par défaut
- **Dark mode** : Mode sombre avec toggle dans le header
- Persistance du thème dans localStorage

## 👤 Rôles Utilisateurs

1. **Directrice** : Accès total à toutes les fonctionnalités
2. **Chef** : Accès à sa direction uniquement
3. **Employé** : Accès uniquement à ses tâches
4. **Lecture** : Accès en lecture seule

## 🔐 Authentification

### Comptes de démonstration

- **Directrice** : `directrice@crg.gn` / `directrice123`
- **Chef** : `chef@crg.gn` / `chef123`
- **Employé** : `employe@crg.gn` / `employe123`
- **Lecture** : `lecture@crg.gn` / `lecture123`

L'authentification utilise JWT simulé (token stocké dans localStorage).

## 📊 Fonctionnalités

### Dashboard
- **KPIs** : Total missions, tâches, taux de complétion, tâches en retard
- **Graphiques** :
  - Camembert : Statut des tâches
  - Bar chart : Tâches par semaine
  - Bar chart : Performance par mission
  - Line chart : Évolution de la productivité

### Missions
- **CRUD complet** des tâches
- **Filtres** : Statut, priorité, direction, assigné, recherche textuelle
- **Vue cartes** avec badges colorés
- **Gestion des statuts** : Planifié, En cours, Terminé, En retard
- **Bordure colorée** selon le statut

### Calendrier
- **Vue mensuelle** avec navigation
- **Affichage des tâches** par jour
- **Badge** avec nombre de tâches
- **Modal détail** au clic sur une tâche

### Rapports
- **Employé/Chef** : Formulaire structuré (6 sections)
  - Objectifs de la semaine
  - Réalisations
  - Difficultés rencontrées
  - Solutions apportées
  - Besoins identifiés
  - Perspectives
- **Sauvegarde brouillon** et envoi
- **Directrice** : Tableau des rapports avec filtres et vue détaillée

### Notifications
- **Centre de notifications** avec badge compteur
- **Marquer comme lu** / Tout marquer comme lu
- **Lien vers tâche/rapport**

### Utilisateurs (Directrice uniquement)
- **Gestion complète** des utilisateurs
- **CRUD** avec rôles et directions

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+ et npm

### Installation
```bash
npm install
```

### Développement
```bash
npm run dev
```

En local, après avoir configuré votre fichier `hosts`, l'application sera accessible sur  
`http://missions.crg.gn:5173`

### Build de production
```bash
npm run build
```

### Preview de production
```bash
npm run preview
```

## 🔧 Configuration

### Variables d'environnement
Créez un fichier `.env` à la racine :
```
VITE_API_URL=https://missions.crg.gn/api
```

Par défaut, l'application utilise des données mockées.

## 📝 Notes

- Les données sont actuellement **mockées** dans `src/services/api.js`
- L'authentification JWT est **simulée** (token stocké localement)
- L'application est prête à être branchée à un backend réel
- Tous les composants sont **responsives** (mobile, tablette, desktop)
- Le thème dark/light est **persisté** dans localStorage

## 🎯 Prochaines Étapes

Pour connecter l'application à un backend réel :

1. Mettre à jour `VITE_API_URL` dans `.env`
2. Adapter les services dans `src/services/api.js` pour utiliser les vraies routes API
3. Implémenter la gestion des tokens JWT côté backend
4. Ajouter la gestion des erreurs réseau
5. Implémenter le refresh token si nécessaire

## 📄 Licence

Propriétaire - Crédit Rural de Guinée (CRG)
