/**
 * Domaine email autorisé - Personnel Crédit Rural de Guinée uniquement
 * Seuls les emails @creditruralgn.com peuvent s'inscrire ou être créés
 */
export const ALLOWED_EMAIL_DOMAIN = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || 'creditruralgn.com').replace(/^@/, '')
export const isEmailAllowed = (email) => (email || '').toLowerCase().endsWith('@' + ALLOWED_EMAIL_DOMAIN.toLowerCase())
export const INSCRIPTION_RESERVEE_MSG = 'Inscription réservée au personnel de Crédit Rural de Guinée'
