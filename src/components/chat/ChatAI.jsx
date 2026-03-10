import { useState, useRef, useEffect } from 'react'
import { Send, X, Bot, User, Loader2, Sparkles, MessageSquare } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'

// Structure des données du chatbot avec choix pré-définis
const chatbotData = {
  welcome: {
    message: "Bienvenue 👋\nMoi c'est CRG Assistant, l'assistant virtuel du Crédit Rural de Guinée.",
    question: "Comment puis-je vous aider concernant nos services et fonctionnalités ?",
    options: [
      { id: 'missions', label: 'Gestion des Missions', icon: '📋' },
      { id: 'rapports', label: 'Rapports Hebdomadaires', icon: '📊' },
      { id: 'calendrier', label: 'Calendrier', icon: '📅' },
      { id: 'notifications', label: 'Notifications', icon: '🔔' },
      { id: 'performance', label: 'Performance & Statistiques', icon: '📈' },
      { id: 'validation', label: 'Validation des Tâches', icon: '✅' },
      { id: 'guides', label: 'Guides complets', icon: '📚' },
      { id: 'autre', label: 'Autre sujet', icon: '💬' }
    ]
  },
  guides: {
    message: "Choisissez un guide complet à parcourir :",
    options: [
      { id: 'missions', label: 'Missions', icon: '📋' },
      { id: 'rapports', label: 'Rapports Hebdomadaires', icon: '📊' },
      { id: 'calendrier', label: 'Calendrier', icon: '📅' },
      { id: 'notifications', label: 'Notifications', icon: '🔔' },
      { id: 'performance', label: 'Performance & Statistiques', icon: '📈' },
      { id: 'validation', label: 'Validation des Tâches', icon: '✅' },
      { id: 'autre', label: 'Autre sujet', icon: '💬' }
    ]
  },
  missions: {
    message: "Sur la gestion des missions, de quoi avez-vous besoin ?",
    options: [
      { id: 'creer-mission', label: 'Créer une mission', icon: '➕' },
      { id: 'modifier-mission', label: 'Modifier une mission', icon: '✏️' },
      { id: 'filtrer-missions', label: 'Filtrer les missions', icon: '🔍' },
      { id: 'suivre-mission', label: 'Suivre une mission', icon: '👁️' },
      { id: 'statut-mission', label: 'Changer le statut', icon: '🔄' },
      { id: 'autre-mission', label: 'Autre besoin', icon: '💬' }
    ],
    info: {
      'creer-mission': {
        title: 'Créer une Mission - Guide Complet',
        content: `📋 **CRÉATION D'UNE MISSION - DU DÉBUT À LA FIN**

**ÉTAPE 1 : ACCÉDER AU FORMULAIRE**
• Allez dans la section "Missions" depuis le menu latéral
• Cliquez sur le bouton "Nouvelle Mission" en haut à droite de la page
• Une modal s'ouvre avec le formulaire de création

**ÉTAPE 2 : REMPLIR LES INFORMATIONS OBLIGATOIRES**
• **Titre** : Donnez un titre clair et descriptif à votre mission (ex: "Développement module authentification")
• **Description** : Décrivez en détail ce qui doit être fait, les objectifs, les livrables attendus
• **Priorité** : Choisissez entre Basse, Normale ou Haute selon l'urgence
• **Date d'échéance** : Sélectionnez la date limite pour la réalisation de la mission

**ÉTAPE 3 : CONFIGURER L'ASSIGNATION**
• **Direction/Service** : Sélectionnez la direction concernée (ex: Direction DSI, Service Digital)
• **Assigné à** : Choisissez l'employé ou le chef de service qui sera responsable
  - La liste se met à jour automatiquement selon la direction sélectionnée
  - Vous pouvez assigner à un employé ou à un chef de service

**ÉTAPE 4 : OPTIONS SUPPLÉMENTAIRES**
• **Statut initial** : Par défaut "Planifié", vous pouvez changer si nécessaire
• **Progression** : Définissez le pourcentage de progression initial (0% par défaut)
• **Blocage** : Indiquez s'il y a un blocage qui empêche l'avancement
• **Pièces jointes** : Vous pouvez ajouter des fichiers (documents, images, etc.)

**ÉTAPE 5 : VALIDATION ET CRÉATION**
• Vérifiez toutes les informations saisies
• Cliquez sur le bouton "Créer" pour enregistrer la mission
• La mission apparaît immédiatement dans la liste
• L'employé assigné reçoit une notification automatique

**APRÈS LA CRÉATION :**
• La mission est visible dans la vue "Missions" avec toutes les autres
• L'employé assigné peut commencer à travailler dessus
• Vous pouvez suivre l'avancement en temps réel
• Les modifications peuvent être faites à tout moment

💡 **BONNES PRATIQUES :**
- Utilisez des titres explicites et courts
- Remplissez toujours une description détaillée
- Définissez des dates d'échéance réalistes
- Assignez la mission à la bonne personne`
      },
      'modifier-mission': {
        title: 'Modifier une Mission - Guide Complet',
        content: `✏️ **MODIFICATION D'UNE MISSION - DU DÉBUT À LA FIN**

**ÉTAPE 1 : LOCALISER LA MISSION**
• Allez dans la section "Missions"
• Utilisez les filtres si nécessaire pour trouver rapidement la mission
• La mission peut être identifiée par :
  - Son titre
  - Son statut (badge coloré)
  - La personne assignée
  - La date d'échéance

**ÉTAPE 2 : OUVRIR LE FORMULAIRE DE MODIFICATION**
• **Option 1** : Cliquez directement sur la carte de la mission
• **Option 2** : Cliquez sur le bouton "Modifier" (icône crayon) dans les actions de la carte
• Une modal s'ouvre avec le formulaire pré-rempli avec les données actuelles

**ÉTAPE 3 : MODIFIER LES INFORMATIONS**
Vous pouvez modifier tous les champs :
• **Titre** : Changez le titre si nécessaire
• **Description** : Mettez à jour la description
• **Statut** : Changez le statut (Planifié, En cours, Terminé, En retard, En attente de validation)
• **Progression** : Ajustez le pourcentage d'avancement (0-100%)
• **Priorité** : Modifiez la priorité si l'urgence change
• **Date d'échéance** : Ajustez la date limite si nécessaire
• **Direction/Service** : Changez la direction (cela met à jour la liste des employés)
• **Assigné à** : Réassignez la mission à un autre employé
• **Blocage** : Ajoutez ou modifiez les informations de blocage

**ÉTAPE 4 : GÉRER LES PIÈCES JOINTES**
• Consultez les pièces jointes existantes
• Ajoutez de nouvelles pièces jointes si nécessaire
• Supprimez les pièces jointes obsolètes

**ÉTAPE 5 : SAUVEGARDER LES MODIFICATIONS**
• Vérifiez que toutes les modifications sont correctes
• Cliquez sur "Enregistrer" pour sauvegarder
• Les modifications sont appliquées immédiatement
• L'employé assigné reçoit une notification si des changements importants sont faits

**PERMISSIONS DE MODIFICATION :**
• **Directeur·trice** : Peut modifier toutes les missions
• **Chef de service** : Peut modifier les missions de sa direction
• **Employé** : Peut modifier uniquement :
  - Le statut de ses missions assignées
  - La progression de ses missions
  - Les informations de blocage
  - Les commentaires

**CAS SPÉCIAUX :**
• Si la mission est "En attente de validation", certaines modifications peuvent être limitées
• Une mission "Terminée" peut nécessiter une réouverture avant modification
• Les modifications importantes déclenchent des notifications automatiques

💡 **CONSEILS :**
- Modifiez régulièrement la progression pour un suivi précis
- Mettez à jour le statut pour refléter l'état réel
- Communiquez les changements importants via les commentaires`
      },
      'filtrer-missions': {
        title: 'Filtrer les Missions - Guide Complet',
        content: `🔍 **FILTRAGE DES MISSIONS - DU DÉBUT À LA FIN**

**ACCÈS AUX FILTRES**
• Allez dans la section "Missions"
• Les filtres sont situés en haut de la page, dans une carte dédiée
• Tous les filtres sont combinables pour une recherche précise

**FILTRE 1 : PAR STATUT**
Sélectionnez un statut dans le menu déroulant :
• **Tous les statuts** : Affiche toutes les missions (par défaut)
• **Planifié** : Missions créées mais pas encore commencées
• **En cours** : Missions actuellement en cours d'exécution
• **En attente de validation** : Missions terminées, en attente d'approbation
• **Terminé** : Missions validées et complétées
• **En retard** : Missions dont la date d'échéance est dépassée

**FILTRE 2 : PAR PRIORITÉ**
Filtrez selon l'urgence :
• **Toutes les priorités** : Affiche toutes les missions
• **Basse** : Missions non urgentes
• **Moyenne** : Missions normales
• **Haute** : Missions urgentes nécessitant une attention immédiate

**FILTRE 3 : PAR DIRECTION/SERVICE**
• Sélectionnez une direction spécifique dans le menu déroulant
• La liste inclut toutes les directions disponibles :
  - Direction DSI
  - Service Digital
  - Service Développement et Innovation
  - Service Informatique
  - Service Opérationnel
  - Service Centre de Validation
• Seules les missions de cette direction seront affichées

**FILTRE 4 : PAR EMPLOYÉ ASSIGNÉ**
• Sélectionnez un employé ou chef de service dans le menu
• La liste se met à jour selon la direction sélectionnée
• Affiche uniquement les missions assignées à cette personne

**FILTRE 5 : RECHERCHE TEXTUELLE**
• Utilisez le champ de recherche en haut
• Tapez des mots-clés pour rechercher dans :
  - Les titres de missions
  - Les descriptions
  - Les noms des employés assignés
  - Les directions
• La recherche est en temps réel (filtre au fur et à mesure de la saisie)

**FILTRE 6 : MES TÂCHES (Pour la directrice)**
• Cochez "Mes tâches" pour voir uniquement les missions que vous avez créées
• Utile pour suivre vos propres missions

**COMBINAISON DE FILTRES**
• Vous pouvez combiner plusieurs filtres simultanément
• Exemple : "En cours" + "Haute priorité" + "Service Digital"
• Les résultats affichent uniquement les missions correspondant à TOUS les critères

**RÉINITIALISATION DES FILTRES**
• Cliquez sur l'icône "X" à côté de chaque filtre pour le réinitialiser
• Ou sélectionnez "Tous" dans les menus déroulants
• Le bouton "Réinitialiser" remet tous les filtres à zéro

**AFFICHAGE DES RÉSULTATS**
• Les missions filtrées s'affichent dans une grille responsive
• 3 cartes par ligne sur les grands écrans
• 2 cartes par ligne sur les écrans moyens
• 1 carte par ligne sur les petits écrans
• Chaque carte affiche toutes les informations importantes

**SAUVEGARDE DES FILTRES**
• Les filtres ne sont pas sauvegardés entre les sessions
• Vous devez les réappliquer à chaque visite de la page

💡 **ASTUCES :**
- Utilisez la recherche textuelle pour trouver rapidement une mission spécifique
- Combinez statut + priorité pour identifier les missions urgentes en cours
- Filtrez par direction pour voir le travail d'une équipe spécifique`
      },
      'suivre-mission': {
        title: 'Suivre une Mission - Guide Complet',
        content: `👁️ **SUIVI D'UNE MISSION - DU DÉBUT À LA FIN**

**INFORMATIONS VISIBLES SUR LA CARTE**

**1. EN-TÊTE DE LA MISSION**
• **Titre** : Nom de la mission en gras
• **Statut** : Badge coloré indiquant l'état actuel
  - Planifié : Badge bleu
  - En cours : Badge vert
  - Terminé : Badge vert foncé
  - En retard : Badge rouge
  - En attente de validation : Badge orange
• **Priorité** : Badge indiquant l'urgence (Basse, Moyenne, Haute)

**2. DESCRIPTION COMPLÈTE**
• La description complète est affichée directement sur la carte
• Pas besoin d'ouvrir une modal pour voir les détails
• Le texte est entièrement visible, sans troncature
• Les retours à la ligne sont préservés

**3. BARRE DE PROGRESSION DYNAMIQUE**
• Barre de progression visuelle (0-100%)
• **Fonctionnement dynamique selon le statut :**
  - **Planifié** : Maximum 25% (ne peut pas dépasser)
  - **En cours** : Entre 25% et 99% (minimum 25%, maximum 99%)
  - **En retard** : Maximum 99% (ne peut jamais être à 100%)
  - **Terminé / En attente de validation** : 100%
• Couleur de la barre selon la progression :
  - Vert : 100% (terminé)
  - Bleu : 50-99% (bon avancement)
  - Orange : 0-49% (début)
• Pourcentage affiché à côté de la barre
• Cliquable pour les employés (ouvre le formulaire de modification)

**4. INFORMATIONS D'ASSIGNATION**
• **Personne assignée** : Nom de l'employé ou chef responsable
• **Direction/Service** : Service concerné par la mission
• **Icône utilisateur** : Indique visuellement l'assignation

**5. DATES IMPORTANTES**
• **Date de création** : Quand la mission a été créée
• **Date d'échéance** : Date limite pour la réalisation
  - Affichée avec une icône calendrier
  - En rouge si la date est dépassée
• Calcul automatique des retards

**6. BLOCAGE (Si présent)**
• Section dédiée si un blocage est signalé
• Icône d'alerte pour attirer l'attention
• Description du blocage affichée
• Utile pour identifier les obstacles

**7. PIÈCES JOINTES**
• Liste de toutes les pièces jointes
• Icône de fichier pour chaque pièce jointe
• Nom du fichier affiché
• Bouton de téléchargement disponible
• Possibilité d'ajouter de nouvelles pièces jointes

**8. SUIVI DU TEMPS (Time Tracker)**
• Affichage du temps passé sur la mission
• Temps estimé vs temps réel
• Utile pour le suivi de productivité

**9. HISTORIQUE DES ACTIONS**
• Liste chronologique de toutes les actions effectuées
• Qui a fait quoi et quand
• Modifications, changements de statut, validations, etc.
• Traçabilité complète de la mission

**10. FEEDBACK 360**
• Commentaires et retours sur la mission
• Communication entre les parties prenantes
• Historique des échanges

**ACTIONS DISPONIBLES**
• **Modifier** : Éditer la mission (selon les permissions)
• **Valider** : Valider une mission en attente (chefs/directrice)
• **Rejeter** : Rejeter une mission avec raison (chefs/directrice)
• **Soumettre** : Soumettre pour validation (employés)
• **Supprimer** : Supprimer la mission (créateur/directrice uniquement)

**MISE À JOUR EN TEMPS RÉEL**
• Les modifications sont synchronisées automatiquement
• Pas besoin de rafraîchir la page
• Les notifications alertent des changements importants

**VUE DÉTAILLÉE**
• Cliquez sur la carte pour voir tous les détails
• Modal avec toutes les informations complètes
• Accès à toutes les fonctionnalités depuis la vue détaillée

💡 **CONSEILS DE SUIVI :**
- Vérifiez régulièrement la barre de progression
- Mettez à jour le statut pour refléter l'état réel
- Utilisez les commentaires pour communiquer
- Surveillez les dates d'échéance pour éviter les retards`
      },
      'statut-mission': {
        title: 'Changer le Statut d\'une Mission - Guide Complet',
        content: `🔄 **GESTION DES STATUTS - DU DÉBUT À LA FIN**

**LES 5 STATUTS DISPONIBLES**

**1. PLANIFIÉ**
• **Signification** : Mission créée mais pas encore commencée
• **Quand l'utiliser** : Au moment de la création ou quand une mission est mise en pause
• **Progression** : Maximum 25% (la barre ne peut pas dépasser ce seuil)
• **Couleur** : Badge bleu
• **Actions possibles** : Modifier, Supprimer, Assigner

**2. EN COURS**
• **Signification** : Mission actuellement en cours d'exécution
• **Quand l'utiliser** : Dès que le travail commence sur la mission
• **Progression** : Entre 25% et 99% (minimum 25%, maximum 99%)
• **Couleur** : Badge vert
• **Actions possibles** : Modifier progression, Ajouter commentaires, Soumettre pour validation

**3. EN ATTENTE DE VALIDATION**
• **Signification** : Mission terminée, en attente d'approbation par le supérieur
• **Quand l'utiliser** : Quand l'employé a terminé son travail et soumet pour validation
• **Progression** : 100% (automatiquement)
• **Couleur** : Badge orange
• **Actions possibles** : 
  - Pour l'employé : Aucune (en attente)
  - Pour le chef/directrice : Valider ou Rejeter
• **Workflow** : L'employé clique sur "Soumettre" → Statut change automatiquement

**4. TERMINÉ**
• **Signification** : Mission validée et complètement terminée
• **Quand l'utiliser** : Automatiquement après validation par le chef/directrice
• **Progression** : 100% (fixe)
• **Couleur** : Badge vert foncé
• **Actions possibles** : Consulter l'historique, Voir les détails

**5. EN RETARD**
• **Signification** : Mission dont la date d'échéance est dépassée
• **Quand l'utiliser** : Automatiquement calculé si la date d'échéance est passée
• **Progression** : Maximum 99% (ne peut jamais être à 100% tant qu'en retard)
• **Couleur** : Badge rouge
• **Actions possibles** : Modifier, Prolonger l'échéance, Signaler un blocage

**COMMENT CHANGER LE STATUT**

**MÉTHODE 1 : DEPUIS LA CARTE**
1. Trouvez la mission dans la liste
2. Cliquez sur la carte pour ouvrir les détails
3. Utilisez le menu déroulant "Statut" dans le formulaire
4. Sélectionnez le nouveau statut
5. Cliquez sur "Enregistrer"

**MÉTHODE 2 : SOUMETTRE POUR VALIDATION**
1. Assurez-vous que la progression est à 100%
2. Cliquez sur le bouton "Soumettre" sur la carte
3. Le statut change automatiquement à "En attente de validation"
4. Une notification est envoyée au supérieur

**MÉTHODE 3 : VALIDER/REJETER**
1. Pour les chefs/directrice : Trouvez les missions "En attente de validation"
2. Cliquez sur "Valider" → Statut devient "Terminé"
3. Ou cliquez sur "Rejeter" → Statut redevient "En cours" avec raison

**RÈGLES ET CONTRAINTES**

**Progression selon le statut :**
• Planifié : 0-25% maximum
• En cours : 25-99% (minimum 25%)
• En retard : 0-99% maximum (jamais 100%)
• En attente de validation : 100% (automatique)
• Terminé : 100% (fixe)

**Permissions :**
• **Employé** : Peut changer le statut de ses missions assignées
• **Chef** : Peut valider/rejeter les missions de son équipe
• **Directeur·trice** : Peut modifier tous les statuts et valider toutes les missions

**Changements automatiques :**
• Si date d'échéance dépassée → Statut devient "En retard" automatiquement
• Si progression à 100% + Soumettre → Statut devient "En attente de validation"
• Si validation acceptée → Statut devient "Terminé"

**Notifications :**
• Chaque changement de statut déclenche une notification
• Les parties prenantes sont informées automatiquement
• Les notifications apparaissent dans le centre de notifications

💡 **BONNES PRATIQUES :**
- Mettez à jour le statut régulièrement pour un suivi précis
- Utilisez "En attente de validation" dès que le travail est terminé
- Ne laissez pas les missions en retard sans action
- Communiquez les changements importants via les commentaires`
      }
    }
  },
  rapports: {
    message: "Sur les rapports hebdomadaires, de quoi avez-vous besoin ?",
    options: [
      { id: 'creer-rapport', label: 'Créer un rapport', icon: '📝' },
      { id: 'envoyer-rapport', label: 'Envoyer un rapport', icon: '📤' },
      { id: 'brouillon-rapport', label: 'Sauvegarder en brouillon', icon: '💾' },
      { id: 'voir-rapports', label: 'Voir mes rapports', icon: '👁️' },
      { id: 'autre-rapport', label: 'Autre besoin', icon: '💬' }
    ],
    info: {
      'creer-rapport': {
        title: 'Créer un Rapport Hebdomadaire - Guide Complet',
        content: `📝 **CRÉATION D'UN RAPPORT HEBDOMADAIRE - DU DÉBUT À LA FIN**

**ÉTAPE 1 : ACCÉDER AU FORMULAIRE**
• Allez dans la section "Rapports" depuis le menu latéral
• Cliquez sur le bouton "Nouveau Rapport" en haut de la page
• Le formulaire s'affiche avec 6 sections obligatoires

**ÉTAPE 2 : REMPLIR LA SECTION 1 - OBJECTIFS DE LA SEMAINE**
• **Objectif** : Décrivez ce que vous aviez prévu de faire cette semaine
• **Contenu à inclure** :
  - Les missions planifiées
  - Les objectifs fixés au début de la semaine
  - Les priorités définies
  - Les livrables prévus
• **Conseil** : Soyez précis et référez-vous aux missions assignées

**ÉTAPE 3 : REMPLIR LA SECTION 2 - RÉALISATIONS**
• **Objectif** : Détaillez ce que vous avez réellement accompli
• **Contenu à inclure** :
  - Les missions terminées et validées
  - Les tâches complétées avec leurs résultats
  - Les objectifs atteints
  - Les livrables remis
  - Les pourcentages de progression
• **Conseil** : Quantifiez vos réalisations (nombre de missions, heures, etc.)

**ÉTAPE 4 : REMPLIR LA SECTION 3 - DIFFICULTÉS RENCONTRÉES**
• **Objectif** : Identifiez les obstacles rencontrés
• **Contenu à inclure** :
  - Les blocages techniques ou organisationnels
  - Les retards et leurs causes
  - Les missions non terminées et pourquoi
  - Les problèmes de ressources
  - Les dépendances externes
• **Conseil** : Soyez honnête et constructif

**ÉTAPE 5 : REMPLIR LA SECTION 4 - SOLUTIONS APPORTÉES**
• **Objectif** : Expliquez comment vous avez résolu les difficultés
• **Contenu à inclure** :
  - Les actions prises pour surmonter les obstacles
  - Les alternatives trouvées
  - Les ajustements effectués
  - Les demandes d'aide faites
  - Les apprentissages tirés
• **Conseil** : Montrez votre proactivité et votre capacité d'adaptation

**ÉTAPE 6 : REMPLIR LA SECTION 5 - BESOINS IDENTIFIÉS**
• **Objectif** : Exprimez vos besoins pour la suite
• **Contenu à inclure** :
  - Les ressources nécessaires (humaines, matérielles, financières)
  - Les formations souhaitées
  - Les outils ou accès manquants
  - Les clarifications nécessaires
  - Les supports demandés
• **Conseil** : Soyez spécifique et réaliste

**ÉTAPE 7 : REMPLIR LA SECTION 6 - PERSPECTIVES**
• **Objectif** : Présentez vos plans pour la semaine suivante
• **Contenu à inclure** :
  - Les objectifs de la semaine prochaine
  - Les missions à continuer ou démarrer
  - Les priorités identifiées
  - Les échéances à venir
  - Les actions prévues
• **Conseil** : Alignez-vous avec les objectifs de l'organisation

**ÉTAPE 8 : SAUVEGARDE OU ENVOI**

**OPTION A : SAUVEGARDER EN BROUILLON**
• Cliquez sur "Sauvegarder en brouillon"
• Le rapport est enregistré mais pas envoyé
• Vous pouvez le modifier et le compléter plus tard
• Plusieurs brouillons peuvent coexister
• Utile pour travailler progressivement sur le rapport

**OPTION B : ENVOYER DIRECTEMENT**
• Vérifiez que toutes les sections sont complètes
• Cliquez sur "Envoyer le Rapport"
• Le rapport est transmis à votre supérieur hiérarchique
• Une confirmation d'envoi s'affiche
• Le rapport ne peut plus être modifié après envoi

**APRÈS L'ENVOI :**
• Le rapport apparaît dans votre historique
• Votre supérieur reçoit une notification
• Le rapport est visible dans la vue "Rapports" de la directrice
• Vous pouvez consulter vos rapports envoyés à tout moment

**FONCTIONNALITÉS AVANCÉES**
• **Génération automatique** : Utilisez le bouton "Générer" pour créer un rapport basé sur vos missions
• **Historique** : Consultez vos rapports précédents pour vous inspirer
• **Modèle** : Réutilisez la structure des rapports précédents

**FRÉQUENCE**
• Les rapports sont **hebdomadaires**
• À envoyer chaque fin de semaine
• Permettent un suivi régulier de l'avancement
• Facilite la communication avec la hiérarchie

💡 **CONSEILS POUR UN BON RAPPORT :**
- Rédigez au fur et à mesure de la semaine (ne pas tout faire le vendredi)
- Soyez concis mais complet
- Utilisez des données chiffrées
- Mettez en avant les réussites
- Identifiez clairement les besoins
- Proposez des solutions, pas seulement des problèmes`
      },
      'envoyer-rapport': {
        title: 'Envoyer un Rapport - Guide Complet',
        content: `📤 **ENVOI D'UN RAPPORT - DU DÉBUT À LA FIN**

**PRÉREQUIS AVANT L'ENVOI**
• Toutes les 6 sections doivent être remplies :
  1. Objectifs de la semaine
  2. Réalisations
  3. Difficultés rencontrées
  4. Solutions apportées
  5. Besoins identifiés
  6. Perspectives
• Vérifiez que le contenu est complet et cohérent
• Relisez pour éviter les erreurs (une fois envoyé, pas de modification possible)

**PROCESSUS D'ENVOI**

**ÉTAPE 1 : VÉRIFICATION FINALE**
• Parcourez toutes les sections une dernière fois
• Vérifiez l'orthographe et la grammaire
• Assurez-vous que les informations sont exactes
• Vérifiez que les dates et chiffres sont corrects

**ÉTAPE 2 : CLIC SUR "ENVOYER LE RAPPORT"**
• Le bouton se trouve en bas du formulaire
• Cliquez dessus pour lancer l'envoi
• Un message de confirmation apparaît

**ÉTAPE 3 : CONFIRMATION D'ENVOI**
• Une alerte confirme que le rapport a été envoyé
• Le rapport disparaît du formulaire
• Il apparaît maintenant dans votre historique

**ÉTAPE 4 : NOTIFICATION AUTOMATIQUE**
• Votre supérieur hiérarchique reçoit une notification
• Le rapport est visible dans sa vue "Rapports"
• Il peut le consulter et le commenter

**DESTINATAIRES SELON VOTRE RÔLE**

**Si vous êtes EMPLOYÉ :**
• Le rapport est envoyé à votre chef de service
• Le chef peut le consulter et le transmettre à la directrice si nécessaire

**Si vous êtes CHEF DE SERVICE :**
• Le rapport est envoyé directement à la directrice
• La directrice peut voir tous les rapports de l'équipe

**Si vous êtes DIRECTRICE :**
• Vous recevez tous les rapports
• Vous pouvez les consulter, les filtrer, les rechercher

**APRÈS L'ENVOI**

**POUR VOUS (EXPÉDITEUR) :**
• Le rapport apparaît dans votre historique avec le statut "Envoyé"
• Vous pouvez le consulter à tout moment
• Vous ne pouvez plus le modifier
• Vous pouvez voir la date et l'heure d'envoi

**POUR VOTRE SUPÉRIEUR :**
• Le rapport apparaît dans sa liste de rapports reçus
• Il peut le consulter en détail
• Il peut filtrer par employé, date, direction
• Il peut rechercher dans le contenu

**IMPORTANT : MODIFICATION IMPOSSIBLE**
⚠️ **Une fois envoyé, le rapport ne peut plus être modifié**
• C'est une règle importante pour garantir l'intégrité des rapports
• Si vous avez fait une erreur, vous devrez créer un nouveau rapport
• C'est pourquoi il est important de bien vérifier avant d'envoyer

**ALTERNATIVE : BROUILLON**
• Si vous n'êtes pas sûr, sauvegardez d'abord en brouillon
• Vous pourrez le modifier et l'envoyer plus tard
• Plusieurs brouillons peuvent coexister

**FRÉQUENCE RECOMMANDÉE**
• Les rapports sont hebdomadaires
• Envoyez votre rapport chaque fin de semaine
• Cela permet un suivi régulier de votre travail
• Facilite la communication avec la hiérarchie

💡 **CONSEILS :**
- Envoyez votre rapport le vendredi après-midi ou le lundi matin
- Ne tardez pas trop, cela montre votre professionnalisme
- Un rapport complet et bien rédigé facilite le travail de votre supérieur`
      },
      'brouillon-rapport': {
        title: 'Sauvegarder en Brouillon',
        content: `Pour sauvegarder votre rapport en brouillon :
        
1. Remplissez les sections que vous souhaitez
2. Cliquez sur "Sauvegarder en brouillon"
3. Vous pourrez reprendre votre travail plus tard
4. Les brouillons sont conservés jusqu'à envoi

💡 Astuce : Vous pouvez avoir plusieurs brouillons en cours.`
      },
      'voir-rapports': {
        title: 'Voir mes Rapports',
        content: `Pour consulter vos rapports :
        
• Employés/Chefs : Vous voyez uniquement vos propres rapports
• Directeur·trice : Vous voyez tous les rapports de l'équipe

Les rapports sont organisés par date et vous pouvez voir leur statut (brouillon, envoyé).`
      }
    }
  },
  calendrier: {
    message: "Sur le calendrier, de quoi avez-vous besoin ?",
    options: [
      { id: 'voir-calendrier', label: 'Voir le calendrier', icon: '📅' },
      { id: 'taches-jour', label: 'Tâches du jour', icon: '📆' },
      { id: 'navigation-calendrier', label: 'Naviguer dans le calendrier', icon: '⬅️➡️' },
      { id: 'autre-calendrier', label: 'Autre besoin', icon: '💬' }
    ],
    info: {
      'voir-calendrier': {
        title: 'Voir le Calendrier - Guide Complet',
        content: `📅 **CALENDRIER DES MISSIONS - DU DÉBUT À LA FIN**

**ACCÈS AU CALENDRIER**
• Cliquez sur "Calendrier" dans le menu latéral
• Le calendrier s'affiche en vue mensuelle
• Par défaut, le mois en cours est affiché

**STRUCTURE DU CALENDRIER**

**VUE MENSUELLE**
• Grille calendrier classique avec les jours de la semaine
• Chaque case représente un jour du mois
• Les jours du mois précédent/suivant sont en gris clair
• Le jour actuel est mis en évidence

**AFFICHAGE DES MISSIONS**
• Chaque jour affiche un badge avec le nombre de missions
• Le badge indique combien de missions sont prévues ce jour-là
• Les missions sont comptabilisées selon :
  - Les missions assignées à vous
  - Les missions de votre direction (pour les chefs)
  - Toutes les missions (pour la directrice)

**COULEURS ET STATUTS**
• Les missions sont représentées par des couleurs selon leur statut :
  - **Bleu** : Planifié
  - **Vert** : En cours
  - **Vert foncé** : Terminé
  - **Rouge** : En retard
  - **Orange** : En attente de validation

**INTERACTION AVEC LE CALENDRIER**

**CLIQUER SUR UN JOUR**
• Cliquez sur n'importe quel jour du calendrier
• Une modal s'ouvre avec toutes les missions de ce jour
• Vous voyez :
  - Le titre de chaque mission
  - Le statut avec badge coloré
  - La priorité
  - La personne assignée
  - La direction/service

**VOIR LES DÉTAILS D'UNE MISSION**
• Dans la modal du jour, cliquez sur une mission
• Une nouvelle modal s'ouvre avec tous les détails :
  - Description complète
  - Dates (création, échéance)
  - Progression
  - Pièces jointes
  - Commentaires
  - Historique des actions

**NAVIGATION DANS LE CALENDRIER**

**CHANGER DE MOIS**
• Utilisez les flèches ← → de chaque côté du mois/année
• Flèche gauche : Mois précédent
• Flèche droite : Mois suivant
• Le calendrier se met à jour instantanément

**RETOUR AU MOIS ACTUEL**
• Cliquez sur le bouton "Aujourd'hui" si disponible
• Ou utilisez les flèches pour revenir au mois en cours

**INFORMATIONS AFFICHÉES**

**EN-TÊTE DU CALENDRIER**
• Mois et année en cours (ex: "Décembre 2024")
• Boutons de navigation
• Nombre total de missions du mois

**DANS CHAQUE JOUR**
• Numéro du jour
• Badge avec nombre de missions
• Mise en évidence si c'est aujourd'hui
• Couleur de fond différente pour les weekends (selon configuration)

**DANS LA MODAL DU JOUR**
• Date complète (ex: "Lundi 15 Décembre 2024")
• Liste de toutes les missions de ce jour
• Pour chaque mission :
  - Titre
  - Statut avec badge
  - Priorité
  - Assigné à
  - Heure si spécifiée

**FONCTIONNALITÉS AVANCÉES**

**FILTRAGE**
• Vous pouvez filtrer les missions affichées selon :
  - Le statut
  - La priorité
  - La direction
  - L'employé assigné

**RECHERCHE**
• Utilisez la barre de recherche pour trouver des missions spécifiques
• La recherche fonctionne sur les titres et descriptions

**EXPORT (si disponible)**
• Certaines versions permettent d'exporter le calendrier
• Format iCal ou PDF selon les options

**VUE RESPONSIVE**
• Sur mobile : Vue adaptée avec navigation tactile
• Sur tablette : Vue optimisée
• Sur desktop : Vue complète avec toutes les fonctionnalités

💡 **ASTUCES :**
- Consultez le calendrier régulièrement pour planifier votre semaine
- Les jours avec beaucoup de missions sont facilement identifiables
- Utilisez les couleurs pour identifier rapidement les missions urgentes
- Cliquez sur les jours pour voir le détail de vos missions`
      },
      'taches-jour': {
        title: 'Tâches du Jour',
        content: `Pour voir les tâches d'un jour spécifique :
        
1. Naviguez vers le mois souhaité
2. Cliquez sur le jour qui vous intéresse
3. Une modal s'ouvre avec toutes les missions de ce jour
4. Vous pouvez voir les détails de chaque mission

💡 Les jours avec des missions affichent un badge avec le nombre.`
      },
      'navigation-calendrier': {
        title: 'Naviguer dans le Calendrier',
        content: `Pour naviguer dans le calendrier :
        
• Utilisez les flèches ← → pour changer de mois
• Cliquez sur le mois/année pour accéder rapidement à une date
• Le calendrier affiche toujours le mois en cours par défaut

🔄 La navigation est intuitive et rapide.`
      }
    }
  },
  notifications: {
    message: "Sur les notifications, de quoi avez-vous besoin ?",
    options: [
      { id: 'voir-notifications', label: 'Voir mes notifications', icon: '🔔' },
      { id: 'marquer-lu', label: 'Marquer comme lu', icon: '✓' },
      { id: 'types-notifications', label: 'Types de notifications', icon: '📬' },
      { id: 'autre-notification', label: 'Autre besoin', icon: '💬' }
    ],
    info: {
      'voir-notifications': {
        title: 'Voir mes Notifications - Guide Complet',
        content: `🔔 **CENTRE DE NOTIFICATIONS - DU DÉBUT À LA FIN**

**ACCÈS AU CENTRE DE NOTIFICATIONS**

**MÉTHODE 1 : ICÔNE DE CLOCHE**
• Dans le header (en haut à droite), trouvez l'icône de cloche 🔔
• Un badge rouge affiche le nombre de notifications non lues
• Cliquez sur l'icône pour ouvrir le centre de notifications

**MÉTHODE 2 : MENU (si disponible)**
• Certaines versions ont un lien "Notifications" dans le menu
• Cliquez dessus pour accéder directement

**STRUCTURE DU CENTRE DE NOTIFICATIONS**

**EN-TÊTE**
• Titre "Notifications"
• Compteur total de notifications non lues
• Bouton "Tout marquer comme lu" (si disponible)
• Bouton de fermeture

**LISTE DES NOTIFICATIONS**
• Toutes les notifications sont listées chronologiquement
• Les plus récentes en premier
• Chaque notification affiche :
  - Type d'événement (icône)
  - Titre/message
  - Date et heure
  - Statut (lu/non lu)

**TYPES DE NOTIFICATIONS**

**1. NOUVELLE MISSION ASSIGNÉE**
• **Quand** : Quand une mission vous est assignée
• **Contenu** : "Nouvelle mission : [Titre]"
• **Action** : Cliquez pour voir la mission
• **Icône** : 📋

**2. MISSION MODIFIÉE**
• **Quand** : Quand une mission qui vous concerne est modifiée
• **Contenu** : "Mission modifiée : [Titre]"
• **Action** : Cliquez pour voir les modifications
• **Icône** : ✏️

**3. MISSION TERMINÉE (POUR VALIDATION)**
• **Quand** : Quand un employé soumet une mission pour validation
• **Contenu** : "Mission en attente de validation : [Titre]"
• **Action** : Cliquez pour valider ou rejeter
• **Icône** : ⏳
• **Pour** : Chefs et directrice uniquement

**4. MISSION VALIDÉE**
• **Quand** : Quand votre mission est validée
• **Contenu** : "Mission validée : [Titre]"
• **Action** : Cliquez pour voir la mission terminée
• **Icône** : ✅

**5. MISSION REJETÉE**
• **Quand** : Quand votre mission est rejetée
• **Contenu** : "Mission rejetée : [Titre] - Raison : [Raison]"
• **Action** : Cliquez pour voir les détails et corriger
• **Icône** : ❌

**6. NOUVEAU RAPPORT REÇU**
• **Quand** : Quand un rapport vous est envoyé
• **Contenu** : "Nouveau rapport de [Nom]"
• **Action** : Cliquez pour consulter le rapport
• **Icône** : 📊
• **Pour** : Chefs et directrice

**7. COMMENTAIRE SUR MISSION**
• **Quand** : Quand quelqu'un commente une mission
• **Contenu** : "[Nom] a commenté : [Titre]"
• **Action** : Cliquez pour voir le commentaire
• **Icône** : 💬

**8. RAPPEL D'ÉCHÉANCE**
• **Quand** : Quand une mission approche de sa date d'échéance
• **Contenu** : "Rappel : [Titre] échéance le [Date]"
• **Action** : Cliquez pour voir la mission
• **Icône** : ⏰

**9. MISSION EN RETARD**
• **Quand** : Quand une mission dépasse sa date d'échéance
• **Contenu** : "Mission en retard : [Titre]"
• **Action** : Cliquez pour voir et agir
• **Icône** : 🚨

**INTERACTION AVEC LES NOTIFICATIONS**

**LIRE UNE NOTIFICATION**
• Cliquez sur une notification
• Vous êtes redirigé vers l'élément concerné :
  - Mission → Page Missions avec la mission ouverte
  - Rapport → Page Rapports avec le rapport affiché
  - Commentaire → Mission avec les commentaires visibles
• La notification est automatiquement marquée comme lue

**MARQUER COMME LU**
• Cliquez sur une notification pour la marquer comme lue
• Ou utilisez le bouton "Marquer comme lu" sur la notification
• Le badge rouge diminue automatiquement

**TOUT MARQUER COMME LU**
• Cliquez sur "Tout marquer comme lu" en haut
• Toutes les notifications sont marquées comme lues
• Le badge rouge disparaît

**FILTRER LES NOTIFICATIONS**
• Certaines versions permettent de filtrer :
  - Toutes
  - Non lues uniquement
  - Par type (missions, rapports, etc.)
  - Par date

**GESTION DES NOTIFICATIONS**

**SUPPRIMER UNE NOTIFICATION**
• Certaines versions permettent de supprimer
• Cliquez sur l'icône de suppression (corbeille)
• La notification est supprimée définitivement

**ARCHIVER**
• Certaines versions permettent d'archiver
• Les notifications archivées sont conservées mais masquées

**PARAMÈTRES DE NOTIFICATION**
• Configurez quelles notifications vous souhaitez recevoir
• Activez/désactivez les rappels
• Choisissez la fréquence des rappels

**BADGE ROUGE**
• Le badge affiche le nombre de notifications non lues
• Se met à jour en temps réel
• Disparaît quand toutes les notifications sont lues
• Utile pour savoir rapidement s'il y a de nouvelles informations

**NOTIFICATIONS EN TEMPS RÉEL**
• Les notifications apparaissent automatiquement
• Pas besoin de rafraîchir la page
• Synchronisation automatique avec le serveur

💡 **CONSEILS :**
- Consultez régulièrement vos notifications pour ne rien manquer
- Marquez comme lues celles que vous avez traitées
- Les notifications importantes (validation, rejet) nécessitent une action rapide
- Utilisez le centre de notifications comme point central pour suivre votre activité`
      },
      'marquer-lu': {
        title: 'Marquer comme Lu',
        content: `Pour marquer les notifications comme lues :
        
• Cliquez sur une notification pour la marquer comme lue
• Utilisez "Tout marquer comme lu" pour toutes les notifications
• Les notifications lues disparaissent du compteur

✅ Cela permet de garder votre centre de notifications organisé.`
      },
      'types-notifications': {
        title: 'Types de Notifications',
        content: `Vous recevez des notifications pour :
        
• Nouvelle mission assignée
• Mission modifiée
• Mission terminée (pour validation)
• Nouveau rapport reçu
• Commentaires sur vos missions
• Rappels de dates d'échéance

📬 Toutes les notifications sont importantes pour rester informé.`
      }
    }
  },
  performance: {
    message: "Sur la performance et les statistiques, de quoi avez-vous besoin ?",
    options: [
      { id: 'mes-stats', label: 'Mes performances', icon: '📊' },
      { id: 'dashboard', label: 'Tableau de bord', icon: '📈' },
      { id: 'comparaison', label: 'Comparaison employés', icon: '👥' },
      { id: 'autre-performance', label: 'Autre besoin', icon: '💬' }
    ],
    info: {
      'mes-stats': {
        title: 'Mes Performances - Guide Complet',
        content: `📊 **MES PERFORMANCES PERSONNELLES - DU DÉBUT À LA FIN**

**ACCÈS À VOS PERFORMANCES**
• Allez dans "Comparaison Employés" depuis le menu
• Si vous êtes employé ou chef, vous verrez uniquement VOS statistiques
• Les données des autres ne sont jamais visibles pour vous

**SCORE DE PERFORMANCE PRINCIPAL**

**AFFICHAGE**
• Score affiché en grand (0-100)
• Badge coloré indiquant votre niveau :
  - **Excellent** (80-100) : Badge vert
  - **Très Bien** (60-79) : Badge bleu
  - **Bien** (40-59) : Badge orange
  - **À Améliorer** (0-39) : Badge rouge
• Barre de progression visuelle avec couleur dynamique

**CALCUL DU SCORE**
Le score est calculé selon 3 critères :
• **50%** : Taux de complétion (tâches terminées / total)
• **30%** : Respect des délais (tâches à temps / total avec délai)
• **20%** : Absence de retards (tâches non en retard / total)

**STATISTIQUES DÉTAILLÉES**

**1. TOTAL TÂCHES**
• Nombre total de missions qui vous ont été assignées
• Période : Mois, Trimestre ou Année (selon filtre)
• Affiché dans une carte bleue avec icône cible

**2. TÂCHES TERMINÉES**
• Nombre de missions complétées et validées
• Indicateur de productivité
• Affiché dans une carte verte avec icône check

**3. EN COURS**
• Nombre de missions actuellement en cours d'exécution
• Montre votre charge de travail active
• Affiché dans une carte orange avec icône horloge

**4. EN RETARD**
• Nombre de missions dont la date d'échéance est dépassée
• Indicateur d'alerte (rouge si > 0)
• Affiché dans une carte rouge avec icône alerte

**OBJECTIFS ET PROGRESSION**

**TAUX DE COMPLÉTION**
• **Objectif** : 100%
• **Votre score** : Pourcentage de tâches complétées
• Barre de progression colorée :
  - Vert : ≥ 80%
  - Bleu : 60-79%
  - Orange : 40-59%
  - Rouge : < 40%
• Affichage : "X tâches complétées sur Y"

**RESPECT DES DÉLAIS**
• **Objectif** : 100%
• **Votre score** : Pourcentage de tâches terminées à temps
• Barre de progression avec même système de couleurs
• Affichage : Temps moyen de complétion en jours

**FEEDBACK ET ENCOURAGEMENT**

**MESSAGES PERSONNALISÉS**
Selon votre score :
• **≥ 80%** : "Excellent travail ! Vous maintenez un niveau remarquable."
• **60-79%** : "Très bon travail ! Vous êtes sur la bonne voie."
• **40-59%** : "Bon travail ! Il y a de la marge d'amélioration."
• **< 40%** : "Continuez vos efforts ! Chaque jour est une opportunité."

**ALERTES SPÉCIFIQUES**
• Si vous avez des tâches en retard : Message d'alerte avec conseils
• Suggestions d'amélioration personnalisées
• Encouragements pour progresser

**FILTRES DISPONIBLES**

**PÉRIODE**
• **Mois** : Statistiques du dernier mois
• **Trimestre** : Statistiques des 3 derniers mois
• **Année** : Statistiques de l'année en cours
• Changez la période pour voir l'évolution

**ACTUALISATION**
• Bouton "Actualiser" pour mettre à jour les données
• Les statistiques sont calculées en temps réel
• Basées sur vos missions actuelles

**PRIVACITÉ**
• **Vos données sont privées** : Seulement vous pouvez les voir
• Les autres employés ne voient jamais vos statistiques
• Même la directrice ne voit pas vos stats individuelles (sauf dans sa vue comparative globale)

**ÉVOLUTION DANS LE TEMPS**
• Comparez vos performances sur différentes périodes
• Identifiez les tendances (amélioration, stagnation, régression)
• Utilisez ces données pour vous améliorer

**UTILISATION PRATIQUE**

**POUR VOUS AMÉLIORER**
• Consultez régulièrement vos performances
• Identifiez les points faibles (retards, faible complétion)
• Fixez-vous des objectifs personnels
• Travaillez sur les domaines à améliorer

**POUR LA PLANIFICATION**
• Utilisez vos stats pour mieux planifier
• Identifiez vos périodes de forte productivité
• Ajustez votre charge de travail selon vos capacités

💡 **CONSEILS :**
- Consultez vos performances chaque semaine
- Fixez-vous des objectifs réalistes
- Travaillez sur les tâches en retard en priorité
- Utilisez le feedback pour vous améliorer continuellement`
      },
      'dashboard': {
        title: 'Tableau de Bord - Guide Complet',
        content: `📈 **TABLEAU DE BORD - DU DÉBUT À LA FIN**

**ACCÈS AU TABLEAU DE BORD**
• Cliquez sur "Tableau de bord" ou "Dashboard" dans le menu
• C'est généralement la première page après connexion
• Vue d'ensemble de toute votre activité

**STRUCTURE DU TABLEAU DE BORD**

**EN-TÊTE**
• Titre "Tableau de Bord"
• Bouton d'actualisation pour mettre à jour les données
• Date et période affichées

**KPIs PRINCIPAUX (INDICATEURS CLÉS)**

**1. TOTAL DES MISSIONS**
• Nombre total de missions dans le système
• Pour vous : Missions qui vous concernent
• Pour la directrice : Toutes les missions
• Affiché dans une carte avec icône

**2. TÂCHES COMPLÉTÉES**
• Nombre de missions terminées et validées
• Indicateur de productivité globale
• Pourcentage de complétion calculé
• Carte verte avec icône check

**3. TÂCHES EN COURS**
• Nombre de missions actuellement en cours
• Charge de travail active
• Répartition par direction (pour directrice)
• Carte bleue avec icône horloge

**4. TÂCHES EN RETARD**
• Nombre de missions dont l'échéance est dépassée
• Indicateur d'alerte
• Nécessite une attention immédiate
• Carte rouge avec icône alerte

**GRAPHIQUES ET VISUALISATIONS**

**1. RÉPARTITION PAR STATUT (CAMEMBERT)**
• Graphique circulaire montrant :
  - Planifié (bleu)
  - En cours (vert)
  - Terminé (vert foncé)
  - En retard (rouge)
  - En attente de validation (orange)
• Pourcentage pour chaque statut
• Cliquable pour voir les détails

**2. TÂCHES PAR SEMAINE (BARRES)**
• Graphique en barres
• Nombre de tâches créées par semaine
• Évolution sur plusieurs semaines
• Tendances visibles

**3. PERFORMANCE PAR MISSION (BARRES)**
• Graphique comparatif
• Performance de chaque mission
• Scores de complétion
• Identification des missions performantes

**4. ÉVOLUTION DE LA PRODUCTIVITÉ (COURBE)**
• Graphique linéaire
• Évolution dans le temps
• Tendances à la hausse ou à la baisse
• Périodes de forte/faible activité

**VUES SPÉCIFIQUES PAR RÔLE**

**POUR LES EMPLOYÉS**
• Vos missions personnelles uniquement
• Vos statistiques de performance
• Vos tâches en cours et à venir
• Vos rappels et échéances

**POUR LES CHEFS DE SERVICE**
• Missions de votre direction
• Performance de votre équipe
• Tâches en attente de validation
• Statistiques de votre service

**POUR LA DIRECTRICE**
• Vue globale de toute l'organisation
• Toutes les missions de toutes les directions
• Comparaison entre services
• Statistiques globales
• Graphiques agrégés

**FONCTIONNALITÉS AVANCÉES**

**FILTRES**
• Filtrez par période (semaine, mois, trimestre, année)
• Filtrez par direction (pour directrice)
• Filtrez par statut
• Filtrez par priorité

**ACTUALISATION**
• Bouton "Actualiser" pour recharger les données
• Mise à jour automatique en temps réel
• Synchronisation avec le serveur

**EXPORT (si disponible)**
• Export des données en PDF
• Export des graphiques
• Rapports personnalisés

**INFORMATIONS DÉTAILLÉES**

**MISSIONS URGENTES**
• Liste des missions à priorité haute
• Missions en retard
• Missions avec échéance proche
• Actions rapides nécessaires

**MISSIONS RÉCENTES**
• Dernières missions créées
• Dernières missions modifiées
• Activité récente

**NOTIFICATIONS IMPORTANTES**
• Rappels d'échéances
• Missions en attente de validation
• Alertes importantes

**NAVIGATION RAPIDE**
• Liens directs vers :
  - Missions
  - Calendrier
  - Rapports
  - Notifications
• Accès rapide aux fonctionnalités principales

**UTILISATION PRATIQUE**

**POUR LA PLANIFICATION**
• Utilisez les KPIs pour planifier
• Identifiez les périodes de charge
• Répartissez le travail équitablement

**POUR LE SUIVI**
• Consultez régulièrement le dashboard
• Suivez l'évolution des indicateurs
• Identifiez les tendances

**POUR LA PRISE DE DÉCISION**
• Utilisez les données pour décider
• Identifiez les problèmes rapidement
• Prenez des mesures correctives

💡 **CONSEILS :**
- Consultez le dashboard chaque matin pour démarrer la journée
- Utilisez les graphiques pour identifier les tendances
- Agissez rapidement sur les alertes (retards, urgences)
- Utilisez les filtres pour analyser des périodes spécifiques`
      },
      'comparaison': {
        title: 'Comparaison Employés',
        content: `La comparaison des employés (Directeur·trice uniquement) :
        
• Vue comparative de tous les employés
• Classement avec podium
• Graphiques analytiques
• Filtres par période et direction
• Statistiques détaillées par employé

👥 Cette vue permet d'identifier les meilleures performances.`
      }
    }
  },
  validation: {
    message: "Sur la validation des tâches, de quoi avez-vous besoin ?",
    options: [
      { id: 'valider-tache', label: 'Valider une tâche', icon: '✅' },
      { id: 'rejeter-tache', label: 'Rejeter une tâche', icon: '❌' },
      { id: 'taches-attente', label: 'Tâches en attente', icon: '⏳' },
      { id: 'autre-validation', label: 'Autre besoin', icon: '💬' }
    ],
    info: {
      'valider-tache': {
        title: 'Valider une Tâche - Guide Complet',
        content: `✅ **VALIDATION D'UNE TÂCHE - DU DÉBUT À LA FIN**

**QUI PEUT VALIDER ?**

**CHEFS DE SERVICE**
• Peuvent valider les missions de leurs employés
• Missions assignées aux membres de leur direction
• Ne peuvent pas valider leurs propres missions (c'est la directrice qui le fait)

**DIRECTRICE**
• Peut valider toutes les missions
• Missions des employés
• Missions des chefs de service
• Missions de toutes les directions

**EMPLOYÉS**
• Ne peuvent pas valider de missions
• Ils soumettent leurs missions pour validation

**QUAND VALIDER ?**

**CONDITIONS PRÉALABLES**
• La mission doit avoir le statut "En attente de validation"
• La progression doit être à 100%
• L'employé doit avoir soumis la mission
• Vous devez avoir les permissions nécessaires

**IDENTIFIER LES MISSIONS À VALIDER**
• Allez dans la section "Missions"
• Filtrez par statut "En attente de validation"
• Ou cherchez les badges orange dans la liste
• Les missions en attente sont facilement identifiables

**PROCESSUS DE VALIDATION**

**ÉTAPE 1 : EXAMINER LA MISSION**
• Cliquez sur la carte de la mission
• Vérifiez tous les détails :
  - Description complète
  - Progression à 100%
  - Pièces jointes (si présentes)
  - Commentaires et historique
  - Dates respectées

**ÉTAPE 2 : VÉRIFIER LA QUALITÉ**
• Assurez-vous que le travail est complet
• Vérifiez que les livrables sont conformes
• Consultez les pièces jointes si présentes
• Lisez les commentaires de l'employé

**ÉTAPE 3 : VALIDER**
• Cliquez sur le bouton "Valider" (vert avec icône check)
• Une confirmation vous est demandée
• Confirmez en cliquant "OK"

**ÉTAPE 4 : CONFIRMATION**
• La mission est immédiatement marquée comme "Terminé"
• Le statut change automatiquement
• La progression reste à 100%
• Une notification est envoyée à l'employé

**APRÈS LA VALIDATION**

**POUR LA MISSION**
• Statut : "Terminé" (badge vert foncé)
• Progression : 100% (fixe)
• Plus modifiable (sauf réouverture par la directrice)
• Visible dans l'historique comme terminée

**POUR L'EMPLOYÉ**
• Reçoit une notification de validation
• Peut voir que sa mission est terminée
• La mission apparaît dans ses missions terminées
• Contribue positivement à ses statistiques

**POUR VOUS (VALIDATEUR)**
• La mission disparaît de votre liste "En attente"
• Vous pouvez la voir dans les missions terminées
• Votre action est enregistrée dans l'historique

**CAS SPÉCIAUX**

**VALIDATION AVEC RÉSERVES**
• Si le travail est globalement bon mais avec des points à améliorer :
  - Validez la mission
  - Ajoutez un commentaire avec vos remarques
  - L'employé pourra en tenir compte pour les prochaines missions

**VALIDATION PARTIELLE**
• Si seule une partie est terminée :
  - Ne validez pas encore
  - Demandez à l'employé de compléter
  - Ou rejetez avec des instructions précises

**VALIDATION RAPIDE**
• Pour les missions simples et complètes :
  - Validation directe sans examen approfondi
  - Fait confiance au travail de l'employé
  - Accélère le processus

**BONNES PRATIQUES**

**VALIDATION RAPIDE**
• Validez rapidement les missions bien faites
• Cela motive les employés
• Accélère le flux de travail

**VALIDATION ATTENTIVE**
• Prenez le temps d'examiner les missions importantes
• Vérifiez les livrables complexes
• Assurez-vous de la qualité

**COMMUNICATION**
• Ajoutez un commentaire positif lors de la validation
• Encouragez les bonnes pratiques
• Donnez des retours constructifs

**CONSÉQUENCES DE LA VALIDATION**

**POUR LES STATISTIQUES**
• La mission compte comme "Terminée" dans les stats
• Améliore le taux de complétion de l'employé
• Contribue au respect des délais si à temps

**POUR LE WORKFLOW**
• La mission sort du flux de travail actif
• Libère la charge de travail de l'employé
• Permet de passer à d'autres missions

**POUR LA TRACABILITÉ**
• L'action est enregistrée dans l'historique
• Date et heure de validation
• Identité du validateur
• Traçabilité complète

💡 **CONSEILS :**
- Validez rapidement pour maintenir la motivation
- Soyez juste et cohérent dans vos validations
- Utilisez les commentaires pour donner du feedback
- Ne validez que si le travail est vraiment terminé et conforme`
      },
      'rejeter-tache': {
        title: 'Rejeter une Tâche - Guide Complet',
        content: `❌ **REJET D'UNE TÂCHE - DU DÉBUT À LA FIN**

**QUAND REJETER ?**

**RAISONS DE REJET**
• Le travail n'est pas conforme aux attentes
• Des éléments manquent ou sont incomplets
• La qualité n'est pas suffisante
• Des corrections sont nécessaires
• Les livrables ne correspondent pas aux spécifications

**QUI PEUT REJETER ?**

**CHEFS DE SERVICE**
• Peuvent rejeter les missions de leurs employés
• Missions de leur direction uniquement

**DIRECTRICE**
• Peut rejeter toutes les missions
• Missions des employés et des chefs

**PROCESSUS DE REJET**

**ÉTAPE 1 : IDENTIFIER LA MISSION**
• Allez dans "Missions"
• Filtrez par "En attente de validation"
• Trouvez la mission à rejeter
• Examinez-la attentivement avant de rejeter

**ÉTAPE 2 : EXAMINER LE TRAVAIL**
• Cliquez sur la carte de la mission
• Vérifiez tous les éléments :
  - Description et livrables
  - Pièces jointes
  - Commentaires de l'employé
  - Progression indiquée
• Identifiez précisément ce qui ne va pas

**ÉTAPE 3 : CLIQUER SUR "REJETER"**
• Cliquez sur le bouton "Rejeter" (rouge avec icône X)
• Une boîte de dialogue s'ouvre
• Vous devez obligatoirement indiquer une raison

**ÉTAPE 4 : INDIQUER LA RAISON**
• **Obligatoire** : Vous devez expliquer pourquoi vous rejetez
• Soyez clair et constructif :
  - "Le module d'authentification n'est pas fonctionnel"
  - "La documentation est incomplète"
  - "Des tests supplémentaires sont nécessaires"
  - "Le design ne correspond pas aux maquettes"
• La raison sera visible par l'employé

**ÉTAPE 5 : CONFIRMER LE REJET**
• Vérifiez que la raison est claire
• Cliquez sur "OK" pour confirmer
• Le rejet est immédiatement appliqué

**APRÈS LE REJET**

**POUR LA MISSION**
• Statut : Retourne à "En cours" (badge vert)
• Progression : Reste à 100% mais peut être modifiée
• Raison du rejet : Visible dans les détails
• Modifiable : L'employé peut corriger et resoumettre

**POUR L'EMPLOYÉ**
• Reçoit une notification de rejet
• Voit la raison du rejet clairement
• Peut consulter les détails
• Doit corriger et resoumettre

**POUR VOUS (REJETEUR)**
• La mission disparaît de "En attente"
• Reapparaît dans "En cours"
• Votre action est enregistrée dans l'historique
• Vous pouvez suivre les corrections

**BONNES PRATIQUES**

**RAISON CONSTRUCTIVE**
• Expliquez clairement ce qui ne va pas
• Indiquez ce qui doit être corrigé
• Donnez des pistes d'amélioration
• Soyez professionnel et respectueux

**EXEMPLES DE BONNES RAISONS**
✅ "Le module nécessite des tests supplémentaires avant validation"
✅ "La documentation doit être complétée avec les cas d'usage"
✅ "Le design doit être aligné avec les maquettes fournies"
✅ "Des fonctionnalités manquent par rapport aux spécifications"

**EXEMPLES DE MAUVAISES RAISONS**
❌ "Pas bon" (trop vague)
❌ "Refaire" (pas constructif)
❌ "Incomplet" (sans précision)

**COMMUNICATION**
• Utilisez un ton professionnel
• Soyez spécifique dans vos remarques
• Proposez des solutions si possible
• Encouragez l'employé à améliorer

**SUIVI APRÈS REJET**

**POUR L'EMPLOYÉ**
• Doit corriger selon la raison indiquée
• Peut poser des questions si besoin
• Doit mettre à jour la progression si nécessaire
• Doit resoumettre une fois corrigé

**POUR VOUS**
• Suivez les corrections apportées
• Vérifiez que les problèmes sont résolus
• Validez rapidement après correction
• Donnez du feedback positif si amélioration

**CAS SPÉCIAUX**

**REJET MULTIPLE**
• Si une mission est rejetée plusieurs fois :
  - Analysez les raisons récurrentes
  - Proposez une assistance si nécessaire
  - Organisez une discussion si besoin

**REJET PARTIEL**
• Si seule une partie pose problème :
  - Indiquez précisément ce qui doit être corrigé
  - Validez le reste si possible
  - Ou rejetez avec instructions précises

**REJET POUR CLARIFICATION**
• Si des informations manquent :
  - Rejetez en demandant des clarifications
  - L'employé peut répondre via commentaires
  - Validez une fois les informations obtenues

**CONSÉQUENCES DU REJET**

**POUR LES STATISTIQUES**
• La mission ne compte pas comme "Terminée"
• Le taux de complétion n'est pas affecté positivement
• Peut impacter le respect des délais si retard

**POUR LE WORKFLOW**
• La mission retourne dans le flux actif
• L'employé doit reprendre le travail
• Retarde la finalisation

**POUR LA RELATION**
• Un rejet bien expliqué est constructif
• Un rejet mal expliqué peut frustrer
• La communication est clé

💡 **CONSEILS :**
- Rejetez seulement si vraiment nécessaire
- Expliquez toujours clairement la raison
- Soyez constructif et encourageant
- Validez rapidement après correction
- Utilisez le rejet comme outil d'amélioration, pas de punition`
      },
      'taches-attente': {
        title: 'Tâches en Attente',
        content: `Les tâches en attente de validation :
        
• Sont marquées avec le statut "En attente de validation"
• Apparaissent dans votre liste de missions
• Nécessitent votre action (validation ou rejet)
• Sont visibles par les chefs et la directrice

⏳ Vérifiez régulièrement ces tâches pour maintenir le flux de travail.`
      },
      'autre-validation': {
        title: 'Autre besoin sur la validation',
        content: `Précise ton besoin pour la validation :
- Blocage d'accès ou permissions ?
- Comprendre le workflow (soumettre / valider / rejeter) ?
- Règles de statut ou progression ?

Tu peux aussi choisir une autre rubrique ou taper ta question directement.`
      }
    }
  }
}

export default function ChatAI({ isOpen, onClose }) {
  const [messages, setMessages] = useState([])
  const [currentTopic, setCurrentTopic] = useState(null)
  const [conversationPath, setConversationPath] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Initialiser la conversation au démarrage
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeData = chatbotData.welcome
      setMessages([
        {
          role: 'assistant',
          content: `${welcomeData.message}\n\n${welcomeData.question}`,
          timestamp: new Date(),
          options: welcomeData.options
        }
      ])
      setCurrentTopic('welcome')
      setConversationPath(['welcome'])
    }
  }, [isOpen])

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus sur l'input quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleOptionClick = (optionId) => {
    const path = [...conversationPath]
    const currentData = path.reduce((data, key) => data?.[key], chatbotData)
    
    if (!currentData) return

    // Ajouter le message utilisateur
    const selectedOption = currentData.options?.find(opt => opt.id === optionId)
    if (selectedOption) {
      const userMessage = {
        role: 'user',
        content: selectedOption.label,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])

      // Boutons de navigation globaux
      if (optionId === 'retour-menu') {
        handleReturnToMenu()
        return
      }
      if (optionId === 'autre-sujet') {
        const assistantMessage = {
          role: 'assistant',
          content: "Je comprends. Donne-moi plus de détails, ou choisis une autre catégorie ci-dessus.",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        return
      }

      // Vérifier si c'est "Autre sujet" ou "Autre besoin"
      if (optionId === 'autre' || optionId.startsWith('autre-')) {
        const assistantMessage = {
          role: 'assistant',
          content: "Je comprends. Pouvez-vous me donner plus de détails sur ce dont vous avez besoin ? Vous pouvez taper votre question dans le champ de saisie ci-dessous.",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        return
      }

      // Vérifier si on a des informations à afficher
      if (currentData.info && currentData.info[optionId]) {
        const info = currentData.info[optionId]
        const assistantMessage = {
          role: 'assistant',
          content: `**${info.title}**\n\n${info.content}`,
          timestamp: new Date(),
          isInfo: true
        }
        setMessages(prev => [...prev, assistantMessage])

        // Proposer de revenir au menu ou continuer
        const continueMessage = {
          role: 'assistant',
          content: "Souhaitez-vous :",
          timestamp: new Date(),
          options: [
            { id: 'retour-menu', label: 'Retour au menu principal', icon: '🏠' },
            { id: 'autre-sujet', label: 'Autre sujet', icon: '💬' }
          ]
        }
        setMessages(prev => [...prev, continueMessage])
        return
      }

      // Vérifier si on a un sous-menu
      const nextTopic = optionId
      if (chatbotData[nextTopic]) {
        const nextData = chatbotData[nextTopic]
        const assistantMessage = {
          role: 'assistant',
          content: nextData.message,
          timestamp: new Date(),
          options: nextData.options
        }
        setMessages(prev => [...prev, assistantMessage])
        setCurrentTopic(nextTopic)
        setConversationPath([nextTopic])
      }
    }
  }

  const handleReturnToMenu = () => {
    const welcomeData = chatbotData.welcome
    const assistantMessage = {
      role: 'assistant',
      content: `${welcomeData.message}\n\n${welcomeData.question}`,
      timestamp: new Date(),
      options: welcomeData.options
    }
    setMessages(prev => [...prev, assistantMessage])
    setCurrentTopic('welcome')
    setConversationPath(['welcome'])
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    const input = e.target.querySelector('input')
    if (!input || !input.value.trim()) return

    const userMessage = {
      role: 'user',
      content: input.value.trim(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    // Réponse générique pour les messages texte
    const assistantMessage = {
      role: 'assistant',
      content: "Merci pour votre question. Pour une meilleure assistance, je vous recommande d'utiliser les options proposées ci-dessus. Sinon, n'hésitez pas à contacter votre administrateur pour plus d'aide.",
      timestamp: new Date(),
      options: [
        { id: 'retour-menu', label: 'Retour au menu principal', icon: '🏠' }
      ]
    }
    setMessages(prev => [...prev, assistantMessage])
    input.value = ''
  }

  const handleClearChat = () => {
    if (window.confirm('Voulez-vous effacer l\'historique de la conversation ?')) {
      setMessages([])
      setCurrentTopic(null)
      setConversationPath([])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="flex flex-col w-full max-w-2xl h-[85vh] max-h-[800px] bg-white dark:bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-crg-primary/10 to-crg-secondary/10 dark:from-crg-primary/20 dark:to-crg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-crg-primary/20 dark:bg-crg-primary/30 rounded-lg">
              <Bot className="text-crg-primary dark:text-crg-secondary" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">CRG Assistant</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Assistant virtuel du Crédit Rural</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              className="text-xs"
            >
              Effacer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
          {messages.map((message, index) => (
            <div key={index} className="space-y-3">
              <div
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-crg-primary to-crg-secondary flex items-center justify-center shadow-md">
                    <Bot size={20} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.role === 'user'
                      ? 'bg-crg-primary text-white shadow-md'
                      : message.isError
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-2 border-red-200 dark:border-red-800'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-xs mt-2 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User size={20} className="text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </div>

              {/* Options/Boutons */}
              {message.options && message.options.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-14">
                  {message.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        if (option.id === 'retour-menu') {
                          handleReturnToMenu()
                        } else {
                          handleOptionClick(option.id)
                        }
                      }}
                      className="px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-crg-primary/30 dark:border-crg-secondary/30 rounded-xl text-sm font-medium text-gray-900 dark:text-white hover:bg-crg-primary/10 dark:hover:bg-crg-primary/20 hover:border-crg-primary dark:hover:border-crg-secondary transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Tapez votre message ou utilisez les options ci-dessus..."
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-crg-primary focus:border-transparent"
            />
            <Button
              type="submit"
              variant="primary"
              className="px-5"
            >
              <Send size={20} />
            </Button>
          </form>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            💡 Utilisez les boutons ci-dessus pour une assistance rapide
          </p>
        </div>
      </Card>
    </div>
  )
}
