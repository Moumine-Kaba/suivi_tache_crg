import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  FileText,
  Bell,
  Users,
  LogOut,
  Menu,
  X,
  BarChart3,
  Zap,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Archive,
  MessageSquare,
  Building2,
} from 'lucide-react'
import { useState } from 'react'
import useAuthStore from '../../store/authStore'
import { cn } from '../../utils/cn'
import { getDirectorLabel } from '../../utils/directorLabel'
import logoCRG from '../../assets/logo_crg.png'

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/missions', label: 'Missions', icon: ClipboardList },
  { path: '/archives', label: 'Archives', icon: Archive },
  { path: '/messages', label: 'Messages', icon: MessageSquare },
  { path: '/calendar', label: 'Calendrier', icon: Calendar },
  { path: '/reports', label: 'Rapports', icon: FileText },
  { path: '/factures', label: 'Factures', icon: Receipt },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings', label: 'Paramètres', icon: SlidersHorizontal },
]

// Menu réservé à la directrice uniquement
const directriceMenuItems = [
  { path: '/director-mode', label: 'Mode Direction', icon: Zap },
  { path: '/employee-comparison', label: 'Comparaison Employés', icon: BarChart3 },
]

// Menu réservé au Service Gestion
const gestionMenuItems = [
  { path: '/gestion', label: 'Tableau de bord Gestion', icon: BarChart3 },
]

// Menu réservé à l'Admin uniquement
const adminMenuItems = [
  { path: '/directions', label: 'Directions', icon: Building2 },
  { path: '/users', label: 'Utilisateurs', icon: Users },
]

export default function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const roleLabels = {
    admin: 'Admin',
    directrice: () => {
      const label = getDirectorLabel(user)
      return label.charAt(0).toUpperCase() + label.slice(1)
    },
    chef: 'Chef',
    employe: 'Employé',
    comptable: 'Comptable',
    gestion: 'Service Gestion',
    lecture: 'Lecture',
  }
  const roleLabel = user?.role
    ? (typeof roleLabels[user.role.toLowerCase()] === 'function'
      ? roleLabels[user.role.toLowerCase()]()
      : roleLabels[user.role.toLowerCase()] || user.role)
    : 'Invité'
  const userName =
    user?.name ||
    user?.nom ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'Invité'
  const userEmail = user?.email || '---'
  const userInitial = (userName?.[0] || '?').toUpperCase()

  const isActive = (path) => location.pathname === path

  const canAccessAdmin = user?.role === 'admin'
  const canAccessDirectrice = user?.role === 'directrice' || user?.role === 'admin'
  const canAccessGestion = user?.role === 'gestion' || user?.role === 'admin'

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const toggleCollapse = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsCollapsed(!isCollapsed)
    // Émettre un événement pour informer le Layout du changement
    window.dispatchEvent(new CustomEvent('sidebarCollapsed', { detail: !isCollapsed }))
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-card rounded-lg shadow-md border border-border"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? (
          <X size={20} className="text-foreground" />
        ) : (
          <Menu size={20} className="text-foreground" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen z-40 overflow-hidden flex flex-col border-r border-border shadow-2xl',
          'bg-card',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Logo Section - Design moderne */}
        <div className={cn(
          'relative border-b border-border bg-card/80 backdrop-blur-xl overflow-hidden',
          isCollapsed ? 'p-4 pb-4' : 'p-6 pb-5'
        )}>

          <Link 
            to="/dashboard" 
            className={cn(
              'flex items-center transition-all duration-200',
              isCollapsed ? 'justify-center' : 'gap-4'
            )}
            onClick={() => setIsMobileOpen(false)}
          >
            {/* Logo avec conteneur arrondi */}
            <div className={cn(
              'flex-shrink-0 rounded-xl overflow-hidden bg-card shadow-lg border-2 border-crg-primary/40',
              isCollapsed ? 'w-12 h-12' : 'w-16 h-16'
            )}>
              <img
                src={logoCRG}
                alt="CRG Logo"
                className="w-full h-full object-contain p-1"
              />
            </div>
            
            {/* Texte */}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight">
                  Crédit Rural
                </h1>
                <p className="text-base font-bold text-crg-primary dark:text-crg-secondary leading-tight mt-0.5">
                  De Guinée
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation - Design épuré et cohérent */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {!isCollapsed && (
            <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
              <span>Navigation</span>
              <span className="h-[1px] flex-1 ml-3 bg-gradient-to-r from-border via-border/60 to-transparent" />
            </div>
          )}
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <div key={item.path} className="relative group/tooltip">
                <Link
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'group flex items-center rounded-xl text-sm font-medium relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-crg-primary/40 focus:ring-offset-0',
                    isCollapsed ? 'justify-center px-3 py-2' : 'gap-3 px-4 py-2',
                    active
                      ? 'bg-gradient-to-r from-crg-primary to-crg-secondary text-white shadow-md shadow-crg-primary/20 ring-1 ring-crg-primary/40'
                      : 'text-foreground bg-transparent border border-transparent hover:bg-muted/60 hover:border-border hover:-translate-y-0.5 hover:shadow-lg hover:shadow-crg-primary/10'
                  )}
                >
                  {active && !isCollapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                  )}
                  {active && isCollapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                  )}
                  <Icon
                    size={20}
                    className={cn(
                      'flex-shrink-0',
                      active 
                        ? 'text-white' 
                        : 'text-muted-foreground'
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate font-medium">
                      {item.label}
                    </span>
                  )}
                </Link>
                {/* Tooltip simple pour mode collapsed */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-card text-foreground text-xs font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 whitespace-nowrap z-50 border border-border">
                    <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[6px] border-r-border"></div>
                    <span>{item.label}</span>
                  </div>
                )}
              </div>
            )
          })}

          {/* Menu directrice */}
          {canAccessDirectrice && (
            <>
              {!isCollapsed && (
                <div className="px-2.5 py-2 mt-3 mb-1">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    Accès Direction
                    <span className="h-[1px] flex-1 bg-gradient-to-r from-gray-200 via-gray-100 to-transparent dark:from-gray-700 dark:via-gray-800" />
                  </p>
                </div>
              )}
              {directriceMenuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <div key={item.path} className="relative group/tooltip">
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        'group flex items-center rounded-xl text-sm font-medium relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-crg-primary/40 focus:ring-offset-0',
                        isCollapsed ? 'justify-center px-3 py-1.5' : 'gap-3 px-4 py-2',
                        active
                          ? 'bg-gradient-to-r from-crg-primary to-crg-secondary text-white shadow-md shadow-crg-primary/25 ring-1 ring-crg-primary/40'
                          : 'text-gray-700 dark:text-gray-300 bg-transparent border border-transparent hover:bg-gray-100/60 dark:hover:bg-gray-800/70 hover:border-gray-200/70 dark:hover:border-gray-700/70 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-crg-primary/10'
                      )}
                    >
                      {active && !isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                      )}
                      {active && isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                      )}
                      <Icon
                        size={18}
                        className={cn(
                          'flex-shrink-0',
                          active 
                            ? 'text-white' 
                            : 'text-gray-600 dark:text-gray-400'
                        )}
                      />
                      {!isCollapsed && (
                        <span className="truncate font-medium">
                          {item.label}
                        </span>
                      )}
                    </Link>
                    {/* Tooltip premium pour mode collapsed */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-4 py-2.5 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-white text-xs font-semibold rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-0 transition-all duration-300 whitespace-nowrap z-50 backdrop-blur-sm border border-white/10">
                        {/* Effet de brillance */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-500" />
                        
                        {/* Flèche élégante */}
                        <div className="absolute right-full top-1/2 -translate-y-1/2">
                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-gray-900 dark:border-r-gray-950 drop-shadow-lg"></div>
                        </div>
                        
                        {/* Contenu avec effet de glow */}
                        <span className="relative z-10 drop-shadow-md bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                          {item.label}
                        </span>
                        
                        {/* Halo externe */}
                        <div className="absolute -inset-1 bg-gradient-to-br from-crg-primary/30 via-crg-secondary/20 to-crg-primary/30 rounded-xl blur-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-300 -z-10"></div>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Menu Service Gestion */}
          {canAccessGestion && (
            <>
              {!isCollapsed && (
                <div className="px-2.5 py-2 mt-3 mb-1">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    Service Gestion
                    <span className="h-[1px] flex-1 bg-gradient-to-r from-gray-200 via-gray-100 to-transparent dark:from-gray-700 dark:via-gray-800" />
                  </p>
                </div>
              )}
              {gestionMenuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <div key={item.path} className="relative group/tooltip">
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        'group flex items-center rounded-xl text-sm font-medium relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-crg-primary/40 focus:ring-offset-0',
                        isCollapsed ? 'justify-center px-3 py-1.5' : 'gap-3 px-4 py-2',
                        active
                          ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-md shadow-violet-500/25 ring-1 ring-violet-500/40'
                          : 'text-gray-700 dark:text-gray-300 bg-transparent border border-transparent hover:bg-violet-100/60 dark:hover:bg-violet-900/20 hover:border-violet-200/70 dark:hover:border-violet-700/70 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/10'
                      )}
                    >
                      {active && !isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                      )}
                      {active && isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                      )}
                      <Icon size={18} className={cn('flex-shrink-0', active ? 'text-white' : 'text-violet-600 dark:text-violet-400')} />
                      {!isCollapsed && <span className="truncate font-medium">{item.label}</span>}
                    </Link>
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-card text-foreground text-xs font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 whitespace-nowrap z-50 border border-border">
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[6px] border-r-border" />
                        <span>{item.label}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Menu admin */}
          {canAccessAdmin && (
            <>
              {!isCollapsed && (
                <div className="px-2.5 py-2 mt-3 mb-1">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Administration
                  </p>
                </div>
              )}
              {adminMenuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <div key={item.path} className="relative group/tooltip">
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        'group flex items-center rounded-xl text-sm font-medium relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-crg-primary/40 focus:ring-offset-0',
                        isCollapsed ? 'justify-center px-3 py-1.5' : 'gap-3 px-4 py-2',
                        active
                          ? 'bg-gradient-to-r from-crg-primary to-crg-secondary text-white shadow-md shadow-crg-primary/25 ring-1 ring-crg-primary/40'
                          : 'text-gray-700 dark:text-gray-300 bg-transparent border border-transparent hover:bg-gray-100/60 dark:hover:bg-gray-800/70 hover:border-gray-200/70 dark:hover:border-gray-700/70 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-crg-primary/10'
                      )}
                    >
                      {active && !isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                      )}
                      {active && isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                      )}
                      <Icon
                        size={18}
                        className={cn(
                          'flex-shrink-0',
                          active 
                            ? 'text-white' 
                            : 'text-gray-600 dark:text-gray-400'
                        )}
                      />
                      {!isCollapsed && (
                        <span className="truncate font-medium">
                          {item.label}
                        </span>
                      )}
                    </Link>
                    {/* Tooltip premium pour mode collapsed */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-4 py-2.5 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-white text-xs font-semibold rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-0 transition-all duration-300 whitespace-nowrap z-50 backdrop-blur-sm border border-white/10">
                        {/* Effet de brillance */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-500" />
                        
                        {/* Flèche élégante */}
                        <div className="absolute right-full top-1/2 -translate-y-1/2">
                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-gray-900 dark:border-r-gray-950 drop-shadow-lg"></div>
                        </div>
                        
                        {/* Contenu avec effet de glow */}
                        <span className="relative z-10 drop-shadow-md bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                          {item.label}
                        </span>
                        
                        {/* Halo externe */}
                        <div className="absolute -inset-1 bg-gradient-to-br from-crg-primary/30 via-crg-secondary/20 to-crg-primary/30 rounded-xl blur-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-300 -z-10"></div>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </nav>

        {/* Section déconnexion */}
        <div className={cn(
          'border-t border-border bg-card/80 backdrop-blur-xl',
          'px-3 py-3'
        )}>
          <div className="flex flex-col gap-2.5">
            {/* Profil utilisateur en bas */}
            <div className="relative group/tooltip">
              {!isCollapsed ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-card/90 border border-border shadow-[0_10px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-crg-primary to-crg-secondary text-white flex items-center justify-center font-semibold shadow-md shadow-crg-primary/25 ring-2 ring-white/10">
                    {userInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {userName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {userEmail}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-foreground border border-border shadow-sm">
                    {roleLabel}
                  </span>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-crg-primary to-crg-secondary text-white flex items-center justify-center font-semibold shadow-md shadow-crg-primary/25 ring-2 ring-white/10">
                    {userInitial}
                  </div>
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-card text-foreground text-xs font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 whitespace-nowrap z-50 border border-border">
                    <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[6px] border-r-border"></div>
                    <span className="block font-semibold">{userName}</span>
                    <span className="block text-[11px] text-muted-foreground">{userEmail}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 rounded-2xl bg-card/80 border border-border px-2.5 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.12)] backdrop-blur-xl">
              {/* Bouton de menu pour réduire/agrandir */}
              <button
                onClick={toggleCollapse}
                className={cn(
                  'hidden lg:flex w-full items-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-crg-primary/35 focus:ring-offset-0',
                  'bg-transparent border border-transparent text-foreground',
                  'hover:bg-muted/70 hover:border-border hover:-translate-y-0.5 hover:shadow-md hover:shadow-crg-primary/10',
                  isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2.5'
                )}
                title={isCollapsed ? 'Agrandir la sidebar' : 'Réduire la sidebar'}
              >
                {!isCollapsed && (
                  <span className="text-sm font-medium text-foreground">Réduire</span>
                )}
                <ChevronLeft 
                  size={18} 
                  className={cn(
                    'text-muted-foreground transition-transform duration-200',
                    isCollapsed ? 'rotate-180' : ''
                  )} 
                />
              </button>

              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              
              <div className="relative group/tooltip">
                <button
                  onClick={(event) => {
                    event.preventDefault()
                    handleLogout()
                  }}
                  className={cn(
                    'w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/35 focus:ring-offset-0',
                    'bg-transparent border border-transparent text-red-500 shadow-none',
                    'hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:via-red-600 hover:to-red-700 hover:shadow-lg hover:-translate-y-0.5 hover:shadow-red-400/20 hover:border-transparent',
                    isCollapsed ? 'justify-center px-3 py-2.5' : 'justify-between px-3 py-2.5'
                  )}
                >
                  {!isCollapsed && (
                    <span className="text-sm font-medium">Déconnexion</span>
                  )}
                  <LogOut size={18} />
                </button>
              {/* Tooltip simple pour mode collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-red-600 dark:bg-red-700 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 whitespace-nowrap z-50">
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[6px] border-r-red-600 dark:border-r-red-700"></div>
                  <span>Déconnexion</span>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay pour mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
