/**
 * Retourne "directeur" ou "directrice" selon le genre de l'utilisateur.
 * Utilise le champ gender si défini, sinon tente d'inférer depuis le prénom.
 * @param {Object} user - Utilisateur avec role directrice (ou admin en mode directeur)
 * @param {string} [user.gender] - 'M' ou 'F' (prioritaire)
 * @param {string} [user.nom] - Nom complet pour inférence
 * @param {string} [user.name] - Alias de nom
 * @returns {'directeur'|'directrice'|'directeur·trice'} Le titre approprié
 */
export function getDirectorLabel(user) {
  if (!user) return 'directeur·trice'

  // 1. Champ gender explicite (prioritaire)
  const gender = (user.gender || '').toUpperCase()
  if (gender === 'M') return 'directeur'
  if (gender === 'F') return 'directrice'

  // 2. Inférence depuis le prénom (premier mot du nom)
  const fullName = (user.nom || user.name || '').trim()
  const firstName = fullName.split(/\s+/)[0] || ''
  if (firstName) {
    const inferred = inferGenderFromFirstName(firstName)
    if (inferred === 'M') return 'directeur'
    if (inferred === 'F') return 'directrice'
  }

  // 3. Par défaut : forme inclusive
  return 'directeur·trice'
}

/**
 * Version avec article : "le directeur" / "la directrice" / "le directeur/la directrice"
 */
export function getDirectorLabelWithArticle(user) {
  const label = getDirectorLabel(user)
  if (label === 'directeur') return 'le directeur'
  if (label === 'directrice') return 'la directrice'
  return 'le directeur/la directrice'
}

/**
 * Infère le genre à partir du prénom (noms français et ouest-africains courants)
 */
function inferGenderFromFirstName(firstName) {
  const name = firstName.toLowerCase().trim()
  if (!name) return null

  // Prénoms féminins courants (français + Guinée / Afrique de l'Ouest)
  const femaleNames = new Set([
    'marie', 'sophie', 'anne', 'catherine', 'isabelle', 'nathalie', 'valérie',
    'fatou', 'fatoumata', 'aissatou', 'aminata', 'mariama', 'hadja', 'kadiatou',
    'adama', 'adja', 'aïcha', 'aïssatou', 'bintou', 'djeneba', 'fanta', 'kadiatou',
    'mariama', 'oumou', 'salamata', 'sira', 'tenin', 'yacine', 'yawo',
    'claire', 'julie', 'léa', 'camille', 'emma', 'chloé', 'manon', 'laura',
  ])

  // Prénoms masculins courants
  const maleNames = new Set([
    'jean', 'pierre', 'paul', 'marc', 'michel', 'andre', 'jacques', 'louis',
    'mamadou', 'ibrahima', 'mohamed', 'ousmane', 'sékou', 'alpha', 'aboubacar',
    'ahmed', 'amadou', 'bakary', 'boubacar', 'cheick', 'ibrahim', 'lansana',
    'moussa', 'sadio', 'saliou', 'souleymane', 'tierno', 'yaya', 'youssouf',
  ])

  if (femaleNames.has(name)) return 'F'
  if (maleNames.has(name)) return 'M'
  return null
}
