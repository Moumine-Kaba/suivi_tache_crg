/**
 * Configuration des rôles - Responsabilités et accès
 * Chaque rôle sait ce qu'il doit faire
 */

export const ROLES_CONFIG = {
  admin: {
    label: 'Admin',
    description: 'Administration complète du système',
    responsibilities: [
      'Gérer tous les utilisateurs',
      'Configurer les directions et services',
      'Créer et assigner des tâches (comme la directrice)',
      'Accès total à toutes les fonctionnalités',
    ],
    direction: null,
    canCreateTasks: true,
    canCreateReports: false,
    canSubmitInvoices: false,
  },

  directrice: {
    label: 'Directeur·trice',
    description: 'Pilotage de la direction',
    responsibilities: [
      'Créer les tâches et les assigner aux employés et chefs (individuellement ou par service)',
      'Signer ou rejeter les factures soumises',
      'Valider les missions des employés et chefs',
      'Consulter les rapports hebdomadaires',
      'Vue d\'ensemble et tableaux de bord',
    ],
    direction: 'DSI ou Direction Financière',
    canCreateTasks: true,
    canCreateReports: false,
    canSubmitInvoices: false,
  },

  chef: {
    label: 'Chef de Service',
    description: 'Supervision d\'un service',
    responsibilities: [
      'Exécuter les tâches assignées par la directrice',
      'Valider les missions des employés de son service',
      'Rédiger les rapports hebdomadaires',
      'Soumettre les factures du service',
    ],
    direction: 'Service (DSI)',
    canCreateTasks: false,
    canCreateReports: true,
    canSubmitInvoices: true,
  },

  employe: {
    label: 'Employé',
    description: 'Exécution des missions',
    responsibilities: [
      'Exécuter les tâches assignées par la directrice',
      'Rédiger les rapports hebdomadaires',
      'Soumettre les factures',
    ],
    direction: 'Service (DSI)',
    canCreateTasks: false,
    canCreateReports: true,
    canSubmitInvoices: true,
  },

  comptable: {
    label: 'Comptable',
    description: 'Direction Financière – Service Comptable',
    responsibilities: [
      'Valider les factures (imputation comptable)',
      'Traiter les factures transmises par le Service Gestion',
      'Apposer le visa et le cachet, exécuter les virements',
    ],
    direction: 'Direction Financière – Service Comptable',
    canCreateTasks: false,
    canCreateReports: false,
    canSubmitInvoices: false,
  },

  gestion: {
    label: 'Service Gestion',
    description: 'Direction Financière – Contrôle et pilotage financier',
    responsibilities: [
      'Contrôle des factures : validation ou rejet',
      'Suivi budgétaire et analyse des dépenses',
      'Reporting financier et prévisions budgétaires',
      'Suivi des paiements et tableaux de bord',
      'Transférer au Service Financier après contrôle',
    ],
    direction: 'Direction Financière – Service Gestion',
    canCreateTasks: false,
    canCreateReports: false,
    canSubmitInvoices: false,
  },

  lecture: {
    label: 'Lecture seule',
    description: 'Consultation sans modification',
    responsibilities: [
      'Consulter les missions, factures et rapports',
      'Aucune modification possible',
    ],
    direction: null,
    canCreateTasks: false,
    canCreateReports: false,
    canSubmitInvoices: false,
  },
}

/** Rôles appartenant à la Direction Financière */
export const FINANCE_ROLES = ['comptable', 'gestion']

/** Rôles qui créent les rapports hebdomadaires */
export const REPORT_CREATOR_ROLES = ['employe', 'chef']

/** Rôles qui soumettent les factures */
export const INVOICE_SUBMITTER_ROLES = ['employe', 'chef']

/** Rôles qui créent et assignent les tâches */
export const TASK_CREATOR_ROLES = ['directrice', 'admin']
