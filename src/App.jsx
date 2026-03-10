import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/authStore'
import useTasksStore from './store/tasksStore'
import useDashboardStore from './store/dashboardStore'
import useNotificationsStore from './store/notificationsStore'
import { supabase } from './services/supabaseClient'
import ProtectedRoute from './components/guards/ProtectedRoute'
import Layout from './components/layout/Layout'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Missions from './pages/Missions'
import Calendar from './pages/Calendar'
import Reports from './pages/Reports'
import Notifications from './pages/Notifications'
import Users from './pages/Users'
import Directions from './pages/Directions'
import Profile from './pages/Profile'
import EmployeeComparison from './pages/EmployeeComparison'
import DirectorMode from './pages/DirectorMode'
import Settings from './pages/Settings'
import Factures from './pages/Factures'
import Messages from './pages/Messages'
import Archives from './pages/Archives'
import ResetPassword from './pages/ResetPassword'
import ChangePasswordInitiale from './pages/ChangePasswordInitiale'
import GestionDashboard from './pages/GestionDashboard'

function App() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const { loadTasks } = useTasksStore()
  const { loadDashboard } = useDashboardStore()
  const { loadNotifications } = useNotificationsStore()

  // Pré-chargement global des données après connexion
  useEffect(() => {
    if (!isAuthenticated) return

    // Charger les tâches visibles pour l'utilisateur (cache global)
    loadTasks({}).catch(() => {
      // Erreur déjà gérée dans le store
    })

    // Charger les stats et graphiques du dashboard (cache global)
    loadDashboard().catch(() => {
      // Erreur déjà gérée dans le store
    })

    // Charger les notifications (cloche + page Notifications)
    loadNotifications().catch(() => {
      // Erreur déjà gérée dans le store
    })
  }, [isAuthenticated, loadTasks, loadDashboard, loadNotifications])

  // Souscription Realtime : recharge automatique des données quand Supabase change
  useEffect(() => {
    if (!isAuthenticated) return

    // Optionnel : n'activer la mise à jour automatique de la vue Direction
    // que pour la directrice / les admins
    const isDirection = user?.role === 'directrice' || user?.role === 'admin'

    const channels = []

    try {
      // Écoute des changements sur la table tasks
      const tasksChannel = supabase
        .channel('public:tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          // Recharge le cache des tâches pour tout le monde
          loadTasks({}, { force: true }).catch(() => {})
          // Pour la direction, on met aussi à jour le dashboard
          if (isDirection) {
            loadDashboard({ force: true }).catch(() => {})
          }
        })
        .subscribe()

      channels.push(tasksChannel)

      // Écoute des changements sur la table reports (impacte surtout la direction)
      const reportsChannel = supabase
        .channel('public:reports')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
          if (isAuthenticated) {
            loadDashboard({ force: true }).catch(() => {})
          }
        })
        .subscribe()

      channels.push(reportsChannel)

      // SÉCURITÉ : Écoute des changements sur users pour déconnecter si compte désactivé
      const usersChannel = supabase
        .channel('public:users-security')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
          if (user?.id && payload.new?.id === user.id && payload.new?.is_active === false) {
            console.warn('⚠️ Compte désactivé par l\'administrateur, déconnexion')
            logout()
          }
        })
        .subscribe()
      channels.push(usersChannel)

      // Écoute des notifications (utile surtout pour la direction)
      const notificationsChannel = supabase
        .channel('public:notifications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          if (isAuthenticated) {
            loadNotifications({ force: true }).catch(() => {})
          }
        })
        .subscribe()

      channels.push(notificationsChannel)
    } catch (e) {
      console.warn('⚠️ Impossible d’initialiser le Realtime Supabase:', e)
    }

    return () => {
      channels.forEach((ch) => {
        try {
          supabase.removeChannel(ch)
        } catch {
          // ignore cleanup errors
        }
      })
    }
  }, [isAuthenticated, user, logout, loadTasks, loadDashboard, loadNotifications])

  // Vérifier si une déconnexion explicite a été effectuée
  // Si oui, ne pas rediriger automatiquement vers le dashboard
  const explicitLogout = sessionStorage.getItem('crg-explicit-logout')
  const shouldRedirect = isAuthenticated && explicitLogout !== 'true'

  return (
    <BrowserRouter>
      <Routes>
        {/* Routes publiques */}
        <Route
          path="/login"
          element={
            shouldRedirect ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/change-password-initiale" element={<ChangePasswordInitiale />} />

        {/* Routes protégées */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="missions" element={<Missions />} />
          <Route path="archives" element={<Archives />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="reports" element={<Reports />} />
          <Route path="factures" element={<Factures />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="messages" element={<Messages />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="directions"
            element={
              <ProtectedRoute requiredRole="admin">
                <Directions />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute requiredRole="admin">
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="employee-comparison"
            element={
              <ProtectedRoute requiredRole={['directrice', 'admin']}>
                <EmployeeComparison />
              </ProtectedRoute>
            }
          />
          <Route
            path="director-mode"
            element={
              <ProtectedRoute requiredRole={['directrice', 'admin']}>
                <DirectorMode />
              </ProtectedRoute>
            }
          />
          <Route
            path="gestion"
            element={
              <ProtectedRoute requiredRole={['gestion', 'admin']}>
                <GestionDashboard />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Route par défaut */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
