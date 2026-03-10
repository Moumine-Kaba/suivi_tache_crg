import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, Target, Bell, Zap, FileText } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import useAuthStore from '../store/authStore'
import { Link } from 'react-router-dom'
import useDashboardStore from '../store/dashboardStore'
import useTasksStore from '../store/tasksStore'
import useNotificationsStore from '../store/notificationsStore'

export default function DirectorMode() {
  const { user } = useAuthStore()
  const [criticalAlerts, setCriticalAlerts] = useState([])
  const { stats, loadDashboard, loading: dashboardLoading } = useDashboardStore()
  const { tasks, loadTasks, loading: tasksLoading } = useTasksStore()
  const { unreadCount, loadNotifications, loading: notificationsLoading } = useNotificationsStore()

  const loading = dashboardLoading || tasksLoading || notificationsLoading

  useEffect(() => {
    if (user?.role === 'directrice' || user?.role === 'admin') {
      // Charger les données nécessaires via les stores (avec cache)
      loadDashboard().catch(() => {})
      loadTasks({}).catch(() => {})
      loadNotifications().catch(() => {})
    }
  }, [user, loadDashboard, loadTasks, loadNotifications])

  // Construire les alertes critiques dès que les données du store sont disponibles
  useEffect(() => {
    if (!stats || !Array.isArray(tasks)) {
      setCriticalAlerts([])
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const alerts = []

    // Tâches en retard critiques
    const overdueTasks = tasks.filter((t) => {
      if (t.status === 'en_retard') return true
      if (t.due_date || t.dueDate) {
        const dueDate = new Date(t.due_date || t.dueDate)
        return dueDate < today && t.status !== 'termine'
      }
      return false
    })

    if (overdueTasks.length > 0) {
      alerts.push({
        type: 'critical',
        icon: AlertTriangle,
        title: `${overdueTasks.length} tâche(s) en retard`,
        message: 'Action requise immédiatement',
        count: overdueTasks.length,
        link: '/missions?filter=overdue',
        color: 'red',
      })
    }

    // Tâches à échéance aujourd'hui
    const todayTasks = tasks.filter((t) => {
      if ((!t.due_date && !t.dueDate) || t.status === 'termine') return false
      const dueDate = new Date(t.due_date || t.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate.getTime() === today.getTime()
    })

    if (todayTasks.length > 0) {
      alerts.push({
        type: 'warning',
        icon: Clock,
        title: `${todayTasks.length} tâche(s) à échéance aujourd'hui`,
        message: 'Vérification recommandée',
        count: todayTasks.length,
        link: '/missions',
        color: 'orange',
      })
    }

    // Taux de complétion faible
    if (stats && typeof stats.completionRate === 'number' && stats.completionRate < 50) {
      alerts.push({
        type: 'warning',
        icon: Target,
        title: 'Taux de complétion faible',
        message: `${stats.completionRate}% - Objectif non atteint`,
        count: stats.completionRate,
        link: '/dashboard',
        color: 'orange',
      })
    }

    // Notifications non lues (via store)
    if (unreadCount > 0) {
      alerts.push({
        type: 'info',
        icon: Bell,
        title: `${unreadCount} notification(s) non lue(s)`,
        message: 'Nouvelles informations disponibles',
        count: unreadCount,
        link: '/notifications',
        color: 'blue',
      })
    }

    setCriticalAlerts(alerts)
  }, [stats, tasks, unreadCount])

  if (user?.role !== 'directrice' && user?.role !== 'admin') {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto text-yellow-500 mb-3" size={48} />
            <p className="text-gray-600 dark:text-gray-400">
              Accès réservé au directeur/directrice
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center py-8 text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="text-crg-primary dark:text-crg-secondary" size={28} />
          Mode Direction
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Vue ultra-simplifiée - 5 indicateurs essentiels
        </p>
      </div>

      {/* 5 Indicateurs principaux */}
      {stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Taux de complétion */}
          <Card className="p-4 hover:shadow-xl transition-all duration-300 border-l-4 border-crg-primary">
            <div className="flex items-center justify-between mb-2">
              <Target className="text-crg-primary dark:text-crg-secondary" size={20} />
              <Badge variant={stats.completionRate >= 80 ? 'success' : stats.completionRate >= 50 ? 'info' : 'warning'}>
                {stats.completionRate}%
              </Badge>
            </div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Complétion</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.tasksCompleted}/{stats.totalTasks}
            </p>
          </Card>

          {/* Tâches en retard */}
          <Card className="p-4 hover:shadow-xl transition-all duration-300 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
              {stats.tasksOverdue > 0 && (
                <Badge variant="danger">{stats.tasksOverdue}</Badge>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">En retard</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.tasksOverdue}
            </p>
          </Card>

          {/* Total tâches */}
          <Card className="p-4 hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <Clock className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Total tâches</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalTasks}
            </p>
          </Card>

          {/* Tâches terminées */}
          <Card className="p-4 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Terminées</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.tasksCompleted}
            </p>
          </Card>

          {/* Santé globale */}
          <Card className="p-4 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-purple-600 dark:text-purple-400" size={20} />
              <Badge variant={
                stats.completionRate >= 80 && stats.tasksOverdue === 0 ? 'success' :
                stats.completionRate >= 50 && stats.tasksOverdue < 3 ? 'info' : 'warning'
              }>
                {stats.completionRate >= 80 && stats.tasksOverdue === 0 ? 'Excellent' :
                 stats.completionRate >= 50 && stats.tasksOverdue < 3 ? 'Bon' : 'Attention'}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Santé</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.completionRate >= 80 && stats.tasksOverdue === 0 ? '🟢' :
               stats.completionRate >= 50 && stats.tasksOverdue < 3 ? '🟡' : '🔴'}
            </p>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="text-center py-8 text-gray-500">
            Impossible de charger les statistiques
          </div>
        </Card>
      )}

      {/* Alertes critiques uniquement */}
      {criticalAlerts.length > 0 && (
        <Card className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 p-5">
          <div className="flex items-center gap-2 mb-4 px-1">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Alertes Critiques ({criticalAlerts.length})
            </h3>
          </div>
          <div className="space-y-3">
            {criticalAlerts.map((alert, index) => {
              const Icon = alert.icon
              return (
                <Link
                  key={index}
                  to={alert.link}
                  className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className={`text-${alert.color}-600 dark:text-${alert.color}-400 flex-shrink-0`} size={18} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          {alert.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                    <Badge variant={alert.type === 'critical' ? 'danger' : alert.type === 'warning' ? 'warning' : 'info'} className="flex-shrink-0">
                      {alert.count}
                    </Badge>
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/employee-comparison">
          <Card className="p-4 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-crg-primary">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  Comparaison Employés
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Voir les performances
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/missions">
          <Card className="p-4 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-crg-primary">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  Gérer les Tâches
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Voir toutes les missions
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/reports">
          <Card className="p-4 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-crg-primary">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <FileText className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  Rapports
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Consulter les rapports
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}

