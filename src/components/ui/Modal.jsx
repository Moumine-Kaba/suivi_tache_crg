import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

/**
 * Composant Modal réutilisable
 * Utilise createPortal pour éviter les erreurs "insertBefore" sur Node
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
  overlayClassName,
  disableBodyScroll = false,
}) {
  const contentRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (!disableBodyScroll) {
        document.body.style.overflow = 'hidden'
      }
      // Scroll en haut à l'ouverture pour afficher tous les champs
      requestAnimationFrame(() => {
        if (contentRef.current) contentRef.current.scrollTop = 0
      })
    } else {
      if (!disableBodyScroll) {
        document.body.style.overflow = 'unset'
      }
    }
    return () => {
      if (!disableBodyScroll) {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen, disableBodyScroll])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }

  const modalContent = (
    <div
      className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/60', overlayClassName)}
      onClick={onClose}
    >
      <div
        ref={contentRef}
        className={cn(
          'bg-card text-foreground rounded-card shadow-xl border border-border',
          sizes[size],
          'w-full mx-4 max-h-[90vh] overflow-y-auto',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}


















