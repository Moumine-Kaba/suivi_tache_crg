import { cn } from '../../utils/cn'

/**
 * Composant Badge réutilisable
 * @param {Object} props
 * @param {string} props.variant - 'success' | 'warning' | 'danger' | 'info' | 'primary'
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 */
export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full'
  
  const variants = {
    success: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    warning: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    danger: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    info: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    primary: 'bg-crg-primary text-white',
    secondary: 'bg-crg-secondary text-white',
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  )
}


















