import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { cn } from '../../utils/cn'
import useAuthStore from '../../store/authStore'

/**
 * Layout principal de l'application
 * Contient la Sidebar et le Header
 */
export default function Layout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const location = useLocation()
  const isFactures = location.pathname === '/factures'
  const isDirections = location.pathname === '/directions'
  const { isAuthenticated, refreshProfile } = useAuthStore()

  // Rafraîchir le profil depuis Supabase à chaque chargement (rôle à jour après SQL)
  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile()
    }
  }, [isAuthenticated, refreshProfile])

  useEffect(() => {
    const handleSidebarCollapsed = (event) => {
      setIsSidebarCollapsed(event.detail)
    }

    window.addEventListener('sidebarCollapsed', handleSidebarCollapsed)
    return () => {
      window.removeEventListener('sidebarCollapsed', handleSidebarCollapsed)
    }
  }, [])

  return (
    <div className={cn(
      'min-h-screen bg-background text-foreground w-full overflow-x-hidden transition-all duration-300',
      isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64',
      (isFactures || isDirections) && 'h-screen flex flex-col'
    )}>
      <Sidebar />
      <div className={cn('w-full', (isFactures || isDirections) && 'flex-1 flex flex-col min-h-0 min-w-0')}>
        <Header />
        <main className={cn(
          'p-0 w-full',
          isFactures ? 'flex-1 min-h-0 overflow-hidden flex flex-col min-w-0 max-w-none' : isDirections ? 'flex-1 min-h-0 overflow-hidden flex flex-col min-w-0' : 'overflow-x-hidden overflow-y-auto'
        )}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

