import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../../../components/ui/Button'

describe('Button Component', () => {
  it('devrait rendre un bouton avec le texte fourni', () => {
    render(<Button>Cliquer ici</Button>)
    expect(screen.getByRole('button', { name: /cliquer ici/i })).toBeInTheDocument()
  })

  it('devrait appeler onClick quand on clique', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Cliquer</Button>)
    
    const button = screen.getByRole('button')
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('devrait être désactivé si disabled=true', () => {
    render(<Button disabled>Bouton désactivé</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('devrait appliquer les variantes de style', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    let button = screen.getByRole('button')
    expect(button.className).toContain('bg-crg-primary')

    rerender(<Button variant="secondary">Secondary</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('bg-crg-secondary')

    rerender(<Button variant="outline">Outline</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('border-crg-primary')
  })

  it('devrait appliquer les tailles', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    let button = screen.getByRole('button')
    expect(button.className).toContain('text-sm')

    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('text-lg')
  })

  it('devrait accepter des classes personnalisées', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button').className).toContain('custom-class')
  })
})

