import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from '../../../components/ui/Badge'

describe('Badge Component', () => {
  it('devrait rendre le contenu du badge', () => {
    render(<Badge>Test Badge</Badge>)
    expect(screen.getByText('Test Badge')).toBeInTheDocument()
  })

  it('devrait appliquer les variantes de couleur', () => {
    const { rerender } = render(<Badge variant="primary">Primary</Badge>)
    let badge = screen.getByText('Primary')
    expect(badge.className).toContain('bg-crg-primary')

    rerender(<Badge variant="success">Success</Badge>)
    badge = screen.getByText('Success')
    expect(badge.className).toContain('bg-green-100')

    rerender(<Badge variant="danger">Danger</Badge>)
    badge = screen.getByText('Danger')
    expect(badge.className).toContain('bg-red-100')

    rerender(<Badge variant="info">Info</Badge>)
    badge = screen.getByText('Info')
    expect(badge.className).toContain('bg-blue-100')
  })

  it('devrait appliquer les tailles', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>)
    let badge = screen.getByText('Small')
    expect(badge.className).toContain('text-xs')

    rerender(<Badge size="lg">Large</Badge>)
    badge = screen.getByText('Large')
    expect(badge.className).toContain('text-base')
  })
})

