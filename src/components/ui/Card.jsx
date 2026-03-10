import { cn } from '../../utils/cn'

/**
 * Composant Card réutilisable
 */
export default function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'bg-card text-foreground rounded-card shadow-sm border border-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, className, ...props }) {
  return (
    <div
      className={cn('px-6 py-4 border-b border-border', className)}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Body = function CardBody({ children, className, ...props }) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

Card.Footer = function CardFooter({ children, className, ...props }) {
  return (
    <div
      className={cn('px-6 py-4 border-t border-border', className)}
      {...props}
    >
      {children}
    </div>
  )
}


















