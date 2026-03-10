import { Bell, User, Search, Plus, Filter, Calendar, TrendingUp, Clock, ClipboardList, AlertCircle, CheckCircle2, Info, X, Bot, Receipt, RefreshCw } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useNotificationsStore from '../../store/notificationsStore'
import useTasksStore from '../../store/tasksStore'
import ChatAI from '../chat/ChatAI'

export default function Header() {
  const { user, refreshProfile } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const { notifications, unreadCount, loadNotifications, markAsRead, loading: loadingNotifications } = useNotificationsStore()
  const { tasks, loadTasks } = useTasksStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false)
  const [showChatAI, setShowChatAI] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [quickStats, setQuickStats] = useState({ today: 0, pending: 0 })
  const notificationsMenuRef = useRef(null)

  // Rafraîchir le profil au chargement (récupère le rôle à jour après modification en SQL)
  useEffect(() => {
    if (user?.id) refreshProfile().catch(() => {})
  }, [user?.id, refreshProfile])

  // Charger les notifications réelles
  useEffect(() => {
    if (!user) return

    loadNotifications().catch(() => {})
    loadTasks({}).catch(() => {})
    
    // Recharger les notifications toutes les 30 secondes
    const interval = setInterval(() => {
      loadNotifications({ force: true }).catch(() => {})
    }, 30000)

    return () => clearInterval(interval)
  }, [user])

  // Fermer le menu notifications si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target)) {
        setShowNotificationsMenu(false)
      }
    }

    if (showNotificationsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotificationsMenu])

  // Recalculer les stats rapides à partir du cache des tâches
  useEffect(() => {
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayTasks = tasks.filter((task) => {
      const rawDate = task.due_date || task.dueDate
      if (!rawDate) return false
      const taskDate = new Date(rawDate)
      taskDate.setHours(0, 0, 0, 0)
      return taskDate.getTime() === today.getTime()
    })

    const pendingTasks = tasks.filter(
      (task) => task.status === 'planifie' || task.status === 'en_cours'
    )

    setQuickStats({
      today: todayTasks.length,
      pending: pendingTasks.length,
    })
  }, [tasks, user])

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation()
    try {
      await markAsRead(id)
      // Le store met déjà à jour automatiquement, pas besoin de recharger
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error)
    }
  }

  const handleNotificationClick = (notification) => {
    if (notification.taskId) {
      navigate('/missions')
      window.dispatchEvent(new CustomEvent('notificationReceived'))
    } else if (notification.reportId) {
      navigate('/reports')
      window.dispatchEvent(new CustomEvent('reloadReports'))
    } else if (notification.invoiceId || (notification.type === 'invoice')) {
      navigate('/factures')
      window.dispatchEvent(new CustomEvent('reloadFactures'))
    }
    setShowNotificationsMenu(false)
    if (!notification.read) {
      handleMarkAsRead(notification.id)
    }
  }

  const getNotificationIcon = (type) => {
    const icons = {
      task: ClipboardList,
      invoice: Receipt,
      warning: AlertCircle,
      success: CheckCircle2,
      info: Info,
    }
    return icons[type] || Bell
  }

  const getNotificationColor = (type) => {
    const colors = {
      task: 'from-blue-500 to-blue-600',
      invoice: 'from-emerald-500 to-emerald-600',
      warning: 'from-yellow-500 to-orange-500',
      success: 'from-green-500 to-green-600',
      info: 'from-gray-500 to-gray-600',
    }
    return colors[type] || 'from-gray-500 to-gray-600'
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Rediriger vers la page missions avec recherche
      window.location.href = `/missions?search=${encodeURIComponent(searchQuery)}`
    }
  }

  const handleQuickAction = (action) => {
    switch (action) {
      case 'new-task':
        window.location.href = '/missions?action=create'
        break
      case 'today':
        window.location.href = '/calendar'
        break
      default:
        break
    }
  }

  const getPageInfo = () => {
    const path = location.pathname
    switch (path) {
      case '/dashboard':
        return {
          title: 'Dashboard',
          description: "Vue d'ensemble de vos missions et performances"
        }
      case '/missions':
        return {
          title: 'Missions',
          description: 'Gérez vos tâches et missions'
        }
      case '/calendar':
        return {
          title: 'Calendrier',
          description: 'Visualisez vos tâches par date'
        }
      case '/reports':
        return {
          title: 'Rapports',
          description: 'Rapports hebdomadaires et analyses'
        }
      case '/notifications':
        return {
          title: 'Notifications',
          description: 'Centre de notifications'
        }
      case '/users':
        return {
          title: 'Utilisateurs',
          description: 'Gérez les utilisateurs de l\'application'
        }
      case '/profile':
        return {
          title: 'Mon Profil',
          description: 'Gérez vos informations personnelles'
        }
      default:
        return {
          title: 'Dashboard',
          description: "Vue d'ensemble de vos missions et performances"
        }
    }
  }

  const pageInfo = getPageInfo()

  return (
    <header className="sticky top-0 z-20 w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-3 sm:px-4 lg:px-6">
          {/* Section gauche - Titre et description */}
          <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
            {/* Indicateur vertical coloré */}
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <div className="h-2 w-2 rounded-full bg-gradient-to-br from-crg-primary via-crg-secondary to-crg-accent shadow-md"></div>
              <div className="h-8 w-0.5 bg-gradient-to-b from-crg-primary via-crg-secondary to-transparent rounded-full"></div>
            </div>
            
            {/* Contenu texte */}
            <div className="min-w-0 flex-shrink">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-white truncate">
                  {pageInfo.title}
                </h1>
                <div className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 hidden sm:flex shadow-sm">
                  <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                    {location.pathname.replace('/', '') || 'dashboard'}
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                {pageInfo.description}
              </p>
            </div>
          </div>

          {/* Section centrale - Recherche et actions rapides */}
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap justify-center">
            {/* Barre de recherche */}
            <form onSubmit={handleSearch} className="w-full sm:w-64 lg:w-80 max-w-full">
              <div className="relative rounded-full bg-muted/70 shadow-sm px-0.5">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-9 pr-3 py-2 bg-card/90 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-crg-primary transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Section droite - Actions utilisateur */}
          <div className="flex items-center gap-1.5 lg:gap-2 pr-2 lg:pr-4 min-w-0">
            {/* Chat IA */}
            <button
              onClick={() => setShowChatAI(true)}
              className="relative p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 flex-shrink-0"
              title="Assistant IA"
            >
              <Bot size={16} />
            </button>

            {/* Notifications */}
            <div className="relative flex-shrink-0" ref={notificationsMenuRef}>
              <button
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                className="relative p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 flex-shrink-0"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md ring-1 ring-white dark:ring-gray-800">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Menu déroulant des notifications */}
              {showNotificationsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowNotificationsMenu(false)}
                  />
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                    {/* En-tête */}
                    <div className="px-4 py-3 bg-gradient-to-r from-crg-primary/10 to-crg-secondary/10 dark:from-crg-primary/20 dark:to-crg-secondary/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={18} className="text-crg-primary dark:text-crg-secondary" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          Notifications
                          {unreadCount > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </h3>
                      </div>
                      <Link
                        to="/notifications"
                        onClick={() => setShowNotificationsMenu(false)}
                        className="text-xs font-medium text-crg-primary dark:text-crg-secondary hover:underline"
                      >
                        Voir tout
                      </Link>
                    </div>

                    {/* Liste des notifications */}
                    <div className="max-h-96 overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="p-8 text-center">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-crg-primary"></div>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Chargement...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">Aucune notification</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {notifications.slice(0, 5).map((notification) => {
                            const Icon = getNotificationIcon(notification.type)
                            const iconColor = getNotificationColor(notification.type)
                            
                            return (
                              <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`p-3 cursor-pointer transition-all ${
                                  !notification.read
                                    ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${iconColor} flex items-center justify-center text-white`}>
                                    <Icon size={14} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'} truncate`}>
                                          {notification.title}
                                        </p>
                                        <p className={`text-xs mt-0.5 ${!notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400'} line-clamp-2`}>
                                          {notification.message}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                          <Clock size={10} />
                                          <span>
                                            {new Date(notification.createdAt).toLocaleString('fr-FR', {
                                              day: '2-digit',
                                              month: 'short',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        </div>
                                      </div>
                                      {!notification.read && (
                                        <div className="w-2 h-2 rounded-full bg-crg-primary flex-shrink-0 mt-1"></div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 5 && (
                      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-center">
                        <Link
                          to="/notifications"
                          onClick={() => setShowNotificationsMenu(false)}
                          className="text-xs font-medium text-crg-primary dark:text-crg-secondary hover:underline"
                        >
                          Voir toutes les notifications ({notifications.length})
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* User menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 px-1 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-crg-primary via-crg-secondary to-crg-accent rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden lg:block text-left min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                    {user?.role === 'directrice' ? 'Directeur·trice' : 
                     user?.role === 'chef' ? 'Chef' :
                     user?.role === 'employe' ? 'Employé' :
                     user?.role === 'lecture' ? 'Lecture' :
                     user?.role === 'comptable' ? 'Comptable' :
                     user?.role === 'gestion' ? 'Service Gestion' :
                     user?.role === 'admin' ? 'Admin' : user?.role}
                  </p>
                </div>
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-crg-primary/20 dark:border-crg-secondary/30 z-20 overflow-hidden backdrop-blur-md">
                    {/* En-tête profil */}
                    <div className="px-5 py-4 bg-gradient-to-br from-crg-primary/8 via-crg-secondary/8 to-crg-primary/8 dark:from-crg-primary/15 dark:via-crg-secondary/15 dark:to-crg-primary/15 border-b border-crg-primary/10 dark:border-crg-secondary/15">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-crg-primary dark:text-crg-secondary mb-2">
                        Profil utilisateur
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-crg-primary via-crg-secondary to-crg-accent rounded-full flex items-center justify-center text-white text-base font-bold shadow-lg ring-2 ring-white/70 dark:ring-gray-900 flex-shrink-0">
                          {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {user?.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-gray-900/70 shadow-sm ring-1 ring-crg-primary/20 dark:ring-crg-secondary/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-crg-primary dark:bg-crg-secondary" />
                        <span className="text-[11px] font-semibold text-crg-primary dark:text-crg-secondary capitalize">
                          {user?.role === 'directrice' ? 'Directeur·trice' : 
                           user?.role === 'chef' ? 'Chef de Service' :
                           user?.role === 'employe' ? 'Employé' :
                           user?.role === 'lecture' ? 'Lecture seule' :
                           user?.role === 'comptable' ? 'Comptable' :
                           user?.role === 'gestion' ? 'Service Gestion' :
                           user?.role === 'admin' ? 'Admin' : user?.role}
                        </span>
                      </div>
                    </div>
                    {/* Liens d'actions */}
                    <div className="py-2">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-crg-primary/10 hover:to-crg-secondary/10 dark:hover:from-crg-primary/25 dark:hover:to-crg-secondary/25 transition-all duration-200"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-crg-primary/10 dark:bg-crg-secondary/20 flex items-center justify-center flex-shrink-0">
                          <User size={16} className="text-crg-primary dark:text-crg-secondary" />
                        </div>
                        <span>Mon Profil</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          refreshProfile().then(() => {
                            setShowUserMenu(false)
                            window.location.reload()
                          })
                        }}
                        className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-crg-primary/10 hover:to-crg-secondary/10 dark:hover:from-crg-primary/25 dark:hover:to-crg-secondary/25 transition-all duration-200"
                      >
                        <RefreshCw size={16} className="text-crg-primary dark:text-crg-secondary flex-shrink-0" />
                        <span>Rafraîchir le profil</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat IA Modal */}
      <ChatAI isOpen={showChatAI} onClose={() => setShowChatAI(false)} />
    </header>
  )
}
