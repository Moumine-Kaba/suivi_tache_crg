/**
 * PinService - Gestion sécurisée du code PIN
 *
 * Exigences :
 * - PIN 4 à 6 chiffres
 * - Stockage avec hash (bcrypt ou équivalent côté serveur)
 * - Limitation des tentatives pour éviter les attaques par force brute
 */

import { supabase } from '../supabaseClient'

const STORAGE_KEY_ATTEMPTS = 'crg-pin-attempts'
const STORAGE_KEY_LOCKED_UNTIL = 'crg-pin-locked-until'
const MAX_PIN_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

/**
 * Vérifie si le PIN est actuellement bloqué (trop de tentatives)
 * @returns {{ locked: boolean, remainingSeconds?: number }}
 */
export function getPinLockStatus() {
  const lockedUntil = sessionStorage.getItem(STORAGE_KEY_LOCKED_UNTIL)
  if (!lockedUntil) return { locked: false }

  const until = parseInt(lockedUntil, 10)
  const now = Date.now()
  if (now < until) {
    return { locked: true, remainingSeconds: Math.ceil((until - now) / 1000) }
  }

  // Verrou expiré, réinitialiser
  sessionStorage.removeItem(STORAGE_KEY_LOCKED_UNTIL)
  sessionStorage.removeItem(STORAGE_KEY_ATTEMPTS)
  return { locked: false }
}

/**
 * Incrémente les tentatives et bloque si nécessaire
 * @returns {{ locked: boolean, attemptsLeft: number }}
 */
function recordFailedAttempt() {
  const current = parseInt(sessionStorage.getItem(STORAGE_KEY_ATTEMPTS) || '0', 10)
  const next = current + 1
  sessionStorage.setItem(STORAGE_KEY_ATTEMPTS, String(next))

  if (next >= MAX_PIN_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000
    sessionStorage.setItem(STORAGE_KEY_LOCKED_UNTIL, String(lockedUntil))
    sessionStorage.removeItem(STORAGE_KEY_ATTEMPTS)
    return { locked: true, attemptsLeft: 0 }
  }

  return { locked: false, attemptsLeft: MAX_PIN_ATTEMPTS - next }
}

/**
 * Réinitialise le compteur de tentatives (après succès)
 */
export function resetPinAttempts() {
  sessionStorage.removeItem(STORAGE_KEY_ATTEMPTS)
  sessionStorage.removeItem(STORAGE_KEY_LOCKED_UNTIL)
}

/**
 * Vérifie si l'utilisateur a un PIN défini
 * Utilise le PIN de signature (directeurs) ou le PIN rapide (tous)
 * @param {boolean} [useQuickAuth=false] - Si true, utilise quick_auth_pin (tous utilisateurs)
 * @returns {Promise<boolean>}
 */
export async function hasPin(useQuickAuth = false) {
  const rpc = useQuickAuth ? 'has_quick_auth_pin' : 'has_signature_pin'
  const { data, error } = await supabase.rpc(rpc)
  if (error) return false
  return !!data
}

/**
 * Définit le PIN (4 à 6 chiffres)
 * Le hash est effectué côté serveur (bcrypt ou md5+salt selon migration)
 * @param {string} pin - Code PIN 4 à 6 chiffres
 * @param {boolean} [useQuickAuth=false] - Si true, utilise quick_auth_pin (tous utilisateurs)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function setPin(pin, useQuickAuth = false) {
  const trimmed = String(pin || '').trim()
  if (trimmed.length < 4 || trimmed.length > 6) {
    return { success: false, error: 'Le PIN doit contenir 4 à 6 chiffres.' }
  }
  if (!/^[0-9]+$/.test(trimmed)) {
    return { success: false, error: 'Le PIN doit contenir uniquement des chiffres.' }
  }

  const rpc = useQuickAuth ? 'set_quick_auth_pin' : 'set_signature_pin'
  const { data, error } = await supabase.rpc(rpc, { p_pin: trimmed })
  if (error) {
    const msg = String(error.message || '')
    if (msg.includes('gen_salt') || msg.includes('crypt') || /does not exist/i.test(msg)) {
      return { success: false, error: 'Migration PIN requise. Exécutez supabase/apply_signature_pin.sql dans Supabase.' }
    }
    return { success: false, error: msg }
  }

  const result = data || {}
  if (result.success === false) {
    return { success: false, error: result.error || 'Erreur lors de l\'enregistrement.' }
  }

  resetPinAttempts()
  return { success: true }
}

/**
 * Vérifie le PIN
 * Gère la limitation des tentatives
 * @param {string} pin - Code PIN à vérifier
 * @param {boolean} [useQuickAuth=false] - Si true, utilise quick_auth_pin
 * @returns {Promise<{ valid: boolean, error?: string, locked?: boolean, attemptsLeft?: number }>}
 */
export async function verifyPin(pin, useQuickAuth = false) {
  const status = getPinLockStatus()
  if (status.locked) {
    return {
      valid: false,
      locked: true,
      error: `Trop de tentatives. Réessayez dans ${status.remainingSeconds} secondes.`,
    }
  }

  const trimmed = String(pin || '').trim()
  if (!trimmed) {
    return { valid: false, error: 'PIN requis.' }
  }

  const rpc = useQuickAuth ? 'verify_quick_auth_pin' : 'verify_signature_pin'
  const { data, error } = await supabase.rpc(rpc, { p_pin: trimmed })
  if (error) {
    return { valid: false, error: error.message || 'Erreur de vérification.' }
  }

  const result = data || {}
  const valid = result.valid === true

  if (valid) {
    resetPinAttempts()
    return { valid: true }
  }

  const { locked, attemptsLeft } = recordFailedAttempt()
  return {
    valid: false,
    error: result.error || 'PIN incorrect.',
    locked,
    attemptsLeft,
  }
}
