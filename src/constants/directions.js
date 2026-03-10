/**
 * Directions et services - Structure organisationnelle
 * DSI : Direction des Systèmes d'Information (services techniques)
 * Direction Financière : Service Comptable, Service Gestion
 */

// Directions (pour directeur·trice) - chaque direction a ses services
export const DIRECTIONS = {
  DSI: {
    label: 'Direction DSI',
    value: 'DSI',
    services: [
      'Service Digital',
      'Service Développement et Innovation',
      'Service Informatique',
      'Service Opérationnel',
      'Service Centre de Validation',
    ],
  },
  Direction_Financiere: {
    label: 'Direction Financière',
    value: 'Direction_Financiere',
    services: [
      'Service Comptable',
      'Service Gestion',
    ],
  },
}

// Liste des services de la DSI (pour chef, employé)
export const DSI_SERVICES = [
  { value: 'Service Digital', label: 'Service Digital' },
  { value: 'Service Développement et Innovation', label: 'Service Développement et Innovation' },
  { value: 'Service Informatique', label: 'Service Informatique' },
  { value: 'Service Opérationnel', label: 'Service Opérationnel' },
  { value: 'Service Centre de Validation', label: 'Service Centre de Validation' },
]

// Services de la Direction Financière (comptable, gestion)
export const FINANCE_SERVICES = [
  { value: 'Service Comptable', label: 'Service Comptable' },
  { value: 'Service Gestion', label: 'Service Gestion' },
]

// Services spécifiques comptabilité (rétrocompatibilité)
export const COMPTA_SERVICES = [
  { value: 'Service Comptable', label: 'Service Comptable' },
]

// Options direction pour directeur·trice
export const DIRECTION_OPTIONS = [
  { value: 'DSI', label: 'DSI (Direction des Systèmes d\'Information)' },
  { value: 'Direction_Financiere', label: 'Direction Financière' },
]

// Options service pour chef/employé (tous sous DSI)
export const getServiceOptions = (includeCompta = false) => {
  const services = [...DSI_SERVICES]
  if (includeCompta) {
    services.push(...COMPTA_SERVICES)
  }
  return services
}

// Vérifier si un service appartient à une direction
export const isServiceInDirection = (service, direction) => {
  const dir = DIRECTIONS[direction] || DIRECTIONS.DSI
  return dir?.services?.includes(service) ?? false
}
