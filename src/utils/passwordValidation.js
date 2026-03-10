/**
 * Validation robuste des mots de passe
 * Règles : min 8 caractères, majuscule, minuscule, chiffre, caractère spécial
 */

const MIN_LENGTH = 8
const RULES = {
  minLength: { test: (p) => p.length >= MIN_LENGTH, message: `Au moins ${MIN_LENGTH} caractères` },
  uppercase: { test: (p) => /[A-Z]/.test(p), message: 'Au moins une majuscule' },
  lowercase: { test: (p) => /[a-z]/.test(p), message: 'Au moins une minuscule' },
  number: { test: (p) => /\d/.test(p), message: 'Au moins un chiffre' },
  special: { test: (p) => /[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(p), message: 'Au moins un caractère spécial (!@#$%^&*...)', },
}

/**
 * Valide un mot de passe et retourne { valid, message, rules }
 * @param {string} password
 * @returns {{ valid: boolean, message?: string, rules?: string[] }}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Le mot de passe est requis', rules: [] }
  }
  const failed = []
  for (const [key, { test, message }] of Object.entries(RULES)) {
    if (!test(password)) failed.push(message)
  }
  if (failed.length === 0) return { valid: true }
  return {
    valid: false,
    message: failed.length === 1 ? failed[0] : `Le mot de passe doit contenir : ${failed.join(', ')}`,
    rules: failed,
  }
}

/**
 * Règles pour affichage (aide à la saisie) – version courte
 */
export const PASSWORD_RULES = [
  `Min. ${MIN_LENGTH} car.`,
  '1 majuscule',
  '1 minuscule',
  '1 chiffre',
  '1 caractère spécial (!@#$...)',
]

/**
 * Retourne le statut de chaque règle pour affichage en temps réel
 * @param {string} password
 * @returns {{ label: string, met: boolean }[]}
 */
export function getPasswordRulesStatus(password) {
  const p = password || ''
  return [
    { label: `Min. ${MIN_LENGTH} caractères`, met: p.length >= MIN_LENGTH },
    { label: '1 majuscule', met: /[A-Z]/.test(p) },
    { label: '1 minuscule', met: /[a-z]/.test(p) },
    { label: '1 chiffre', met: /\d/.test(p) },
    { label: '1 caractère spécial (!@#$...)', met: /[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(p) },
  ]
}

/**
 * Règles en une ligne pour placeholder / hint
 */
export const PASSWORD_RULES_SHORT = `Min ${MIN_LENGTH} car., maj., min., chiffre, spécial`

/**
 * Pour react-hook-form : validate: (v) => validatePassword(v).valid || validatePassword(v).message
 */
export function passwordValidator(value) {
  const { valid, message } = validatePassword(value)
  return valid || message
}

/**
 * Génère un mot de passe temporaire sécurisé (respecte les règles de validation)
 * Utilisé lors de la création d'utilisateur par l'administrateur
 */
export function generateTemporaryPassword() {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'
  const numbers = '23456789'
  const special = '!@#$%&*'
  const randomChar = (str) => str[Math.floor(Math.random() * str.length)]
  const base = [
    randomChar(uppercase),
    randomChar(lowercase),
    randomChar(numbers),
    randomChar(special),
  ]
  const all = uppercase + lowercase + numbers + special
  for (let i = 0; i < 5; i++) {
    base.push(all[Math.floor(Math.random() * all.length)])
  }
  return base.sort(() => Math.random() - 0.5).join('')
}
