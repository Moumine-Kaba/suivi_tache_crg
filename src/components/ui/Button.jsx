import { cn } from '../../utils/cn'

/**
 * Composant Button réutilisable
 * @param {Object} props
 * @param {string} props.variant - 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost'
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-crg-primary hover:bg-crg-dark text-white focus:ring-crg-primary',
    secondary: 'bg-card border border-border text-foreground hover:bg-muted focus:ring-crg-primary',
    accent: 'bg-crg-primary hover:bg-crg-dark text-white focus:ring-crg-primary',
    outline: 'border-2 border-crg-primary text-crg-primary hover:bg-crg-primary hover:text-white focus:ring-crg-primary',
    ghost: 'text-foreground hover:bg-muted focus:ring-crg-primary',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}


















