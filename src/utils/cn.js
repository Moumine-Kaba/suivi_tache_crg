/**
 * Utilitaire pour combiner les classes CSS
 * @param {...string} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}


















