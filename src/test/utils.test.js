import { describe, it, expect } from 'vitest'
import { cn } from '../utils/cn'

describe('Utils - cn (classNames)', () => {
  it('devrait combiner plusieurs classes', () => {
    expect(cn('class1', 'class2', 'class3')).toBe('class1 class2 class3')
  })

  it('devrait ignorer les valeurs falsy', () => {
    expect(cn('class1', null, 'class2', undefined, false, 'class3')).toBe('class1 class2 class3')
  })

  it('devrait gérer les chaînes vides', () => {
    expect(cn('class1', '', 'class2')).toBe('class1 class2')
  })

  it('devrait retourner une chaîne vide si aucune classe valide', () => {
    expect(cn(null, undefined, false, '')).toBe('')
  })

  it('devrait gérer un seul argument', () => {
    expect(cn('class1')).toBe('class1')
  })

  it('devrait gérer aucun argument', () => {
    expect(cn()).toBe('')
  })
})













