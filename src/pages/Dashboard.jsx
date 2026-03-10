import { useEffect, useState } from 'react'
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  Users,
  FileText,
  Calendar,
  Award,
  PlayCircle,
  CheckCircle,
  Circle,
  ArrowRight,
  Plus,
  Eye,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import Card from '../components/ui/Card'
import { tasksService, reportsService, usersService } from '../services/api'
import useAuthStore from '../store/authStore'
import useDashboardStore from '../store/dashboardStore'
import useTasksStore from '../store/tasksStore'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import IntelligentAssistant from '../components/ai/IntelligentAssistant'
import PerformanceForecast from '../components/analytics/PerformanceForecast'
import StressIndex from '../components/analytics/StressIndex'
import ProductivityHeatmap from '../components/analytics/ProductivityHeatmap'

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const {
    stats,
    charts: chartData,
    loading: dashboardLoading,
    error: dashboardError,
    loadDashboard,
  } = useDashboardStore()
  const {
    tasks: allTasks,
    loadTasks: loadTasksFromStore,
  } = useTasksStore()

  // États dérivés pour l'utilisateur courant
  const [myTasks, setMyTasks] = useState([])
  const [urgentTasks, setUrgentTasks] = useState([])
  const [todayTasks, setTodayTasks] = useState([])
  const [thisWeekTasks, setThisWeekTasks] = useState([])
  const [projectHealth, setProjectHealth] = useState(null)
  
  // États pour les chefs de service
  const [teamMembers, setTeamMembers] = useState([])
  const [teamWorkload, setTeamWorkload] = useState([])
  const [criticalTasks48h, setCriticalTasks48h] = useState([])
  const [pendingValidationTasks, setPendingValidationTasks] = useState([])
  const [chartPeriod, setChartPeriod] = useState('week') // 'week', 'month', 'quarter'

  // Fonction pour recharger toutes les données du dashboard
  const refreshDashboard = async () => {
    if (!user) return
    
    const forceReload = user.role === 'employe' || user.role === 'chef'
    
    // Charger les données du dashboard (force le rechargement pour employés et chefs)
    await loadDashboard({ force: true }).catch(() => {})
    // Charger les tâches globales dans le store pour les dérivés
    await loadTasksFromStore({ force: true }).catch(() => {})
    
    // Pour les chefs, charger les membres de l'équipe
    if (user.role === 'chef' && user.direction) {
      await loadTeamMembers(user.direction).catch(() => {})
    }
  }

  useEffect(() => {
    if (!user) return
    
    // Pour les employés et chefs, forcer le rechargement des données depuis la base
    // pour s'assurer que les statistiques sont toujours à jour
    const forceReload = user.role === 'employe' || user.role === 'chef'
    
    // Charger les données du dashboard (force le rechargement pour employés et chefs)
    refreshDashboard()
    
    // Pour les chefs, recharger plus fréquemment (toutes les 15 secondes au lieu de 30)
    const refreshInterval = user.role === 'chef' ? 15000 : 30000
    
    if (forceReload) {
      const interval = setInterval(() => {
        refreshDashboard()
      }, refreshInterval)
      
      return () => clearInterval(interval)
    }
  }, [user, loadDashboard, loadTasksFromStore])

  // Recharger le dashboard quand la page redevient visible (pour les chefs)
  useEffect(() => {
    if (!user || user.role !== 'chef') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Page visible, rechargement du dashboard pour le chef')
        refreshDashboard()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, loadDashboard, loadTasksFromStore])

  // Recharger le dashboard quand on reçoit une notification (pour les chefs)
  useEffect(() => {
    if (!user || user.role !== 'chef') return

    const handleNotificationReceived = () => {
      console.log('🔔 Notification reçue, rechargement du dashboard pour le chef')
      refreshDashboard()
    }

    window.addEventListener('notificationReceived', handleNotificationReceived)
    
    return () => {
      window.removeEventListener('notificationReceived', handleNotificationReceived)
    }
  }, [user, loadDashboard, loadTasksFromStore])
  
  // Charger les membres de l'équipe pour les chefs
  const loadTeamMembers = async (direction) => {
    try {
      const allUsers = await usersService.getAll()
      const members = allUsers.filter(u => 
        u.direction === direction && 
        (u.role === 'employe' || u.role === 'chef')
      )
      setTeamMembers(members)
    } catch (error) {
      console.error('Erreur lors du chargement des membres de l\'équipe:', error)
      setTeamMembers([])
    }
  }
  
  // Calculer la charge de travail par collaborateur
  useEffect(() => {
    if (user?.role !== 'chef' || !allTasks || allTasks.length === 0 || teamMembers.length === 0) {
      setTeamWorkload([])
      return
    }
    
    const workload = teamMembers.map(member => {
      const memberTasks = allTasks.filter(t => 
        (t.assignedToId === member.id || t.assigned_to === member.id) &&
        t.status !== 'termine'
      )
      
      const inProgress = memberTasks.filter(t => t.status === 'en_cours').length
      const overdue = memberTasks.filter(t => {
        if (t.status === 'en_retard') return true
        if (t.dueDate || t.due_date) {
          const dueDate = new Date(t.dueDate || t.due_date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          return dueDate < today
        }
        return false
      }).length
      
      return {
        id: member.id,
        name: member.name || member.nom || member.email,
        totalTasks: memberTasks.length,
        inProgress,
        overdue,
        status: memberTasks.length === 0 ? 'available' :
                overdue > 0 ? 'overloaded' :
                memberTasks.length > 5 ? 'busy' : 'normal'
      }
    })
    
    setTeamWorkload(workload)
  }, [allTasks, teamMembers, user])
  
  // Calculer les tâches critiques (expirant dans 48h)
  useEffect(() => {
    if (!allTasks || allTasks.length === 0) {
      setCriticalTasks48h([])
      return
    }
    
    const now = new Date()
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    
    const critical = allTasks.filter(task => {
      if (task.status === 'termine' || task.status === 'en_attente_validation') return false
      if (!task.dueDate && !task.due_date) return false
      
      const dueDate = new Date(task.dueDate || task.due_date)
      return dueDate >= now && dueDate <= in48Hours
    })
    
    setCriticalTasks48h(critical.slice(0, 5)) // Limiter à 5 pour l'affichage
  }, [allTasks])
  
  // Calculer les tâches en attente de validation
  useEffect(() => {
    if (!allTasks || allTasks.length === 0) {
      setPendingValidationTasks([])
      return
    }
    
    const pending = allTasks.filter(t => t.status === 'en_attente_validation')
    setPendingValidationTasks(pending)
  }, [allTasks])

  // Dériver les tâches (mes tâches, urgentes, aujourd'hui, cette semaine) à partir du cache tasksStore
  useEffect(() => {
    if (!allTasks || allTasks.length === 0) {
      setMyTasks([])
      setUrgentTasks([])
      setTodayTasks([])
      setThisWeekTasks([])
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(today)
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()))

    // Toutes mes tâches non terminées (assignées à l'utilisateur)
    const activeTasks = allTasks.filter(t => {
      // Pour la directrice, elle peut voir toutes les tâches OU uniquement les siennes
      // Par défaut, on affiche uniquement ses propres tâches dans "Mes Tâches Actives"
      if (user?.role === 'directrice' || user?.role === 'admin') {
        // La directrice voit ses propres tâches dans "Mes Tâches Actives"
        return (t.assignedToId === user?.id || t.assigned_to === user?.id) && t.status !== 'termine'
      }
      // Pour les autres rôles, afficher uniquement leurs tâches assignées
      return (t.assignedToId === user?.id || t.assigned_to === user?.id) && t.status !== 'termine'
    })
    setMyTasks(activeTasks)

    // Tâches urgentes (en retard ou échéance aujourd'hui)
    const urgent = allTasks.filter(task => {
      if (task.status === 'en_retard') return true
      if (task.dueDate || task.due_date) {
        const dueDate = new Date(task.dueDate || task.due_date)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate.getTime() === today.getTime() && task.status !== 'termine'
      }
      return false
    })
    setUrgentTasks(urgent.slice(0, 5))

    // Tâches d'aujourd'hui
    const todayList = allTasks.filter(task => {
      if (!task.dueDate && !task.due_date) return false
      const dueDate = new Date(task.dueDate || task.due_date)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate.getTime() === today.getTime() && task.status !== 'termine'
    })
    setTodayTasks(todayList)

    // Tâches de cette semaine
    const weekTasks = allTasks.filter(task => {
      if (!task.dueDate && !task.due_date) return false
      const dueDate = new Date(task.dueDate || task.due_date)
      return dueDate >= today && dueDate <= endOfWeek && task.status !== 'termine'
    })
    setThisWeekTasks(weekTasks)
  }, [allTasks])

  // Calculer l'indicateur de santé des projets à partir des tâches en cache
  useEffect(() => {
    if (!allTasks || allTasks.length === 0) {
      setProjectHealth(null)
      return
    }
    if (user?.role !== 'directrice' && user?.role !== 'admin') {
      setProjectHealth(null)
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter(t => t.status === 'termine').length
    const overdueTasks = allTasks.filter(t => {
      if (t.status === 'en_retard') return true
      if (t.dueDate || t.due_date) {
        const dueDate = new Date(t.dueDate || t.due_date)
        return dueDate < today && t.status !== 'termine' && t.status !== 'en_attente_validation'
      }
      return false
    }).length

    const blockedTasks = allTasks.filter(t => {
      try {
        const metadata = t.metadata ? (typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata) : {}
        return metadata.blocked === true
      } catch (e) {
        return false
      }
    }).length

    const pendingValidation = allTasks.filter(t => t.status === 'en_attente_validation').length

    let healthScore = 100
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100
    const overdueRate = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0
    const blockedRate = totalTasks > 0 ? (blockedTasks / totalTasks) * 100 : 0

    healthScore = completionRate * 0.5
    healthScore -= overdueRate * 2
    healthScore -= blockedRate * 1.5
    healthScore -= (pendingValidation / totalTasks) * 100 * 0.3
    healthScore = Math.max(0, Math.min(100, healthScore))

    let status = 'excellent'
    let statusColor = 'green'
    let statusLabel = 'Excellent'

    if (healthScore < 40) {
      status = 'critical'
      statusColor = 'red'
      statusLabel = 'Critique'
    } else if (healthScore < 70) {
      status = 'warning'
      statusColor = 'orange'
      statusLabel = 'Attention'
    } else if (healthScore < 85) {
      status = 'good'
      statusColor = 'yellow'
      statusLabel = 'Bon'
    }

    setProjectHealth({
      score: Math.round(healthScore),
      status,
      statusColor,
      statusLabel,
      metrics: {
        totalTasks,
        completedTasks,
        overdueTasks,
        blockedTasks,
        pendingValidation,
        completionRate: Math.round(completionRate),
        overdueRate: Math.round(overdueRate),
        blockedRate: Math.round(blockedRate),
      },
    })
  }, [allTasks, user])

  if (dashboardLoading && !stats && !chartData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
      </div>
    )
  }

  // Bannière d'erreur réseau
  const showNetworkBanner = dashboardError?.includes('Connexion interrompue')

  // KPIs adaptés selon le rôle
  const getKpiCards = () => {
    const isEmployee = user?.role === 'employe'
    const isChef = user?.role === 'chef'
    
    if (isEmployee) {
      return [
        {
          title: 'Mes Tâches Actives',
          value: myTasks.length,
          icon: ClipboardList,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          link: '/missions',
        },
        {
          title: 'Urgentes',
          value: urgentTasks.length,
          icon: AlertTriangle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          link: '/missions?filter=urgent',
        },
        {
          title: "Aujourd'hui",
          value: todayTasks.length,
          icon: Calendar,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          link: '/calendar',
        },
        {
          title: 'Cette Semaine',
          value: thisWeekTasks.length,
          icon: Clock,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/20',
          link: '/calendar',
        },
      ]
    } else if (isChef) {
      return [
        {
          title: 'Tâches Service',
          value: stats?.totalTasks || 0,
          icon: ClipboardList,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          link: '/missions',
        },
        {
          title: 'Terminées',
          value: stats?.tasksCompleted || 0,
          icon: CheckCircle2,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
        },
        {
          title: 'Taux Complétion',
          value: `${stats?.completionRate || 0}%`,
          icon: Target,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/20',
        },
        {
          title: 'En Retard',
          value: stats?.tasksOverdue || 0,
          icon: AlertTriangle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          link: '/missions?filter=overdue',
        },
        {
          title: 'À Valider',
          value: pendingValidationTasks.length,
          icon: Eye,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          link: '/missions?filter=validation',
        },
      ]
    } else {
      return [
        {
          title: 'Total Missions',
          value: stats?.totalMissions || 0,
          icon: ClipboardList,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
        },
        {
          title: 'Total Tâches',
          value: stats?.totalTasks || 0,
          icon: ClipboardList,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/20',
        },
        {
          title: 'Tâches Terminées',
          value: `${stats?.completionRate || 0}%`,
          icon: CheckCircle2,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
        },
        {
          title: 'Tâches en Retard',
          value: stats?.tasksOverdue || 0,
          icon: AlertTriangle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
        },
      ]
    }
  }

  const kpiCards = getKpiCards()

  const getStatusIcon = (status) => {
    switch (status) {
      case 'termine':
        return <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
      case 'en_cours':
        return <PlayCircle size={16} className="text-blue-600 dark:text-blue-400" />
      case 'en_retard':
        return <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
      default:
        return <Circle size={16} className="text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'termine':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
      case 'en_cours':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
      case 'en_retard':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  // Fonction pour filtrer les données du graphique selon la période
  const getFilteredChartData = (chartData, period) => {
    if (!chartData || !chartData.weeklyData) return []
    
    const now = new Date()
    const tasks = allTasks || []
    
    if (period === 'week') {
      // Retourner les données hebdomadaires existantes
      return chartData.weeklyData
    } else if (period === 'month') {
      // Données mensuelles (4 derniers mois)
      const monthlyData = []
      for (let i = 3; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        
        const monthTasks = tasks.filter((t) => {
          if (!t.created_at && !t.createdAt) return false
          const taskDate = new Date(t.created_at || t.createdAt)
          return taskDate >= monthStart && taskDate <= monthEnd
        })
        
        monthlyData.push({
          week: monthDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          tasks: monthTasks.length,
        })
      }
      return monthlyData
    } else if (period === 'quarter') {
      // Données trimestrielles (4 derniers trimestres)
      const quarterData = []
      for (let i = 3; i >= 0; i--) {
        const quarterDate = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
        const quarter = Math.floor(quarterDate.getMonth() / 3)
        const quarterStart = new Date(quarterDate.getFullYear(), quarter * 3, 1)
        const quarterEnd = new Date(quarterDate.getFullYear(), quarter * 3 + 3, 0)
        
        const quarterTasks = tasks.filter((t) => {
          if (!t.created_at && !t.createdAt) return false
          const taskDate = new Date(t.created_at || t.createdAt)
          return taskDate >= quarterStart && taskDate <= quarterEnd
        })
        
        quarterData.push({
          week: `T${quarter + 1} ${quarterDate.getFullYear()}`,
          tasks: quarterTasks.length,
        })
      }
      return quarterData
    }
    
    return chartData.weeklyData
  }

  return (
    <div className="space-y-3 p-2 sm:p-3 lg:p-4 w-full max-w-full overflow-x-hidden overflow-y-visible">

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${user?.role === 'chef' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-2.5 sm:gap-3`}>
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon
          const CardContent = (
            <Card className="p-3 sm:p-4 border border-gray-200/70 dark:border-gray-700/70 bg-white dark:bg-gray-800 hover:border-crg-primary/40 dark:hover:border-crg-primary/50 transition-colors duration-200 cursor-pointer">
              
              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                    {kpi.title}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {kpi.value}
                  </p>
                </div>
                <div
                  className={`${kpi.bgColor} ${kpi.color} p-2 rounded-lg flex-shrink-0`}
                >
                  <Icon size={18} className="sm:w-5 sm:h-5" />
                </div>
              </div>
              {kpi.link && (
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-crg-primary/10 dark:bg-crg-secondary/20 p-1 rounded-md">
                    <ArrowRight size={14} className="text-crg-primary dark:text-crg-secondary" />
                  </div>
                </div>
              )}
            </Card>
          )
          
          return kpi.link ? (
            <Link key={index} to={kpi.link}>
              {CardContent}
            </Link>
          ) : (
            <div key={index}>{CardContent}</div>
          )
        })}
      </div>

      {/* Dashboard pour Employés - Vue simplifiée et actionnable */}
      {user?.role === 'employe' && (
        <div className="space-y-3">
          {/* Tâches urgentes */}
          {urgentTasks.length > 0 && (
            <Card className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 p-5">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <AlertTriangle className="text-red-600 dark:text-red-400" size={16} />
                  Tâches Urgentes ({urgentTasks.length})
                </h3>
                <Link to="/missions">
                  <Button variant="primary" size="xs" className="text-[11px] px-3 py-1.5">Voir toutes</Button>
                </Link>
              </div>
              <div className="space-y-3 px-2">
                {urgentTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate('/missions')}
                    className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {getStatusIcon(task.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            {task.title}
                          </p>
                          {task.dueDate || task.due_date ? (
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                                {new Date(task.dueDate || task.due_date).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <Badge variant="danger" size="sm" className="flex-shrink-0 ml-2">Urgent</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Mes Tâches Actives */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <ClipboardList className="text-crg-primary dark:text-crg-secondary" size={16} />
                Mes Tâches Actives ({myTasks.length})
              </h3>
              <div className="flex items-center gap-2.5">
                <Link to="/missions">
                  <Button variant="secondary" size="xs" className="text-[11px] px-3 py-1.5">Voir tout</Button>
                </Link>
                {user?.role === 'employe' && (
                  <Link to="/reports">
                    <Button variant="primary" size="xs" className="flex items-center gap-1.5 text-[11px] px-3 py-1.5">
                      <FileText size={12} />
                      Rapport
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="space-y-3 px-2">
              {myTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Aucune tâche active. Excellent travail !
                  </p>
                </div>
              ) : (
                myTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate('/missions')}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-crg-primary hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {getStatusIcon(task.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            {task.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-1">
                            {task.description || 'Aucune description'}
                          </p>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className={`text-xs px-2.5 py-1 rounded-full ${getStatusColor(task.status)}`}>
                              {task.status === 'termine' ? 'Terminé' :
                               task.status === 'en_cours' ? 'En cours' :
                               task.status === 'en_retard' ? 'En retard' :
                               task.status === 'planifie' ? 'Planifié' : task.status}
                            </span>
                            {task.priority && (
                              <span className={`text-xs px-2.5 py-1 rounded-full ${
                                task.priority === 'haute' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                                task.priority === 'moyenne' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              }`}>
                                {task.priority === 'haute' ? 'Haute' :
                                 task.priority === 'moyenne' ? 'Moyenne' : 'Basse'}
                              </span>
                            )}
                            {task.dueDate || task.due_date ? (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                <Calendar size={10} className="flex-shrink-0" />
                                {new Date(task.dueDate || task.due_date).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Dashboard pour Chefs - Vue équipe améliorée */}
      {user?.role === 'chef' && (
        <div className="space-y-3">
          {/* Alertes critiques - Tâches expirant dans 48h */}
          {criticalTasks48h.length > 0 && (
            <Card className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/10 animate-pulse p-5">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                  <AlertTriangle className="text-orange-600 dark:text-orange-400 animate-pulse" size={18} />
                  Tâches Critiques - Expirent dans 48h ({criticalTasks48h.length})
                </h3>
                <Link to="/missions?filter=critical">
                  <Button variant="primary" size="xs" className="text-xs px-3 py-1.5">Voir toutes</Button>
                </Link>
              </div>
              <div className="space-y-3 px-2">
                {criticalTasks48h.map((task) => (
                  <Link
                    key={task.id}
                    to="/missions"
                    className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          {task.title}
                        </p>
                        {task.dueDate || task.due_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-orange-600 dark:text-orange-400 flex-shrink-0" />
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              {new Date(task.dueDate || task.due_date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <Badge variant="warning" size="sm" className="animate-pulse flex-shrink-0 ml-2">48h</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Tâches à Valider */}
          {pendingValidationTasks.length > 0 && (
            <Card className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 p-5">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                  <Eye className="text-yellow-600 dark:text-yellow-400" size={18} />
                  Tâches à Valider ({pendingValidationTasks.length})
                </h3>
                <Link to="/missions?filter=validation">
                  <Button variant="secondary" size="xs" className="text-xs px-3 py-1.5">Voir toutes</Button>
                </Link>
              </div>
              <div className="space-y-3 px-2">
                {pendingValidationTasks.slice(0, 3).map((task) => (
                  <Link
                    key={task.id}
                    to="/missions"
                    className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Assignée à: {task.assignedTo || 'Non assigné'}
                        </p>
                      </div>
                      <Badge variant="warning" size="sm" className="flex-shrink-0 ml-2">En attente</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Widget Charge de l'équipe */}
          {teamWorkload.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-5 px-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="text-crg-primary dark:text-crg-secondary" size={20} />
                  Charge de l'équipe
                </h3>
                <Link to="/employee-comparison">
                  <Button variant="secondary" size="sm">Voir détails</Button>
                </Link>
              </div>
              <div className="space-y-3 px-2">
                {teamWorkload.map((member) => {
                  const statusColors = {
                    available: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
                    normal: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
                    busy: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
                    overloaded: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
                  }
                  
                  return (
                    <div
                      key={member.id}
                      className={`p-4 rounded-lg border ${
                        member.status === 'overloaded' ? 'border-red-300 dark:border-red-700' :
                        member.status === 'busy' ? 'border-yellow-300 dark:border-yellow-700' :
                        member.status === 'normal' ? 'border-blue-300 dark:border-blue-700' :
                        'border-green-300 dark:border-green-700'
                      } ${statusColors[member.status]}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm mb-2">{member.name}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="flex-shrink-0">{member.totalTasks} tâche(s)</span>
                            {member.inProgress > 0 && (
                              <span className="flex items-center gap-1.5 flex-shrink-0">
                                <PlayCircle size={12} />
                                {member.inProgress} en cours
                              </span>
                            )}
                            {member.overdue > 0 && (
                              <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-bold flex-shrink-0">
                                <AlertTriangle size={12} />
                                {member.overdue} en retard
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={
                            member.status === 'overloaded' ? 'danger' :
                            member.status === 'busy' ? 'warning' :
                            member.status === 'normal' ? 'info' : 'success'
                          }
                          size="sm"
                          className="flex-shrink-0 ml-3"
                        >
                          {member.status === 'available' ? 'Disponible' :
                           member.status === 'normal' ? 'Normal' :
                           member.status === 'busy' ? 'Chargé' : 'Surchargé'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Vue d'ensemble du Service */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5 px-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="text-crg-primary dark:text-crg-secondary" size={20} />
                Vue d'ensemble du Service
              </h3>
              <Link to="/missions">
                <Button variant="secondary" size="sm">Gérer les tâches</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
              <div className="p-5 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Tâches en cours</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {allTasks.filter(t => t.status === 'en_cours').length}
                </p>
              </div>
              <div className="p-5 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Tâches terminées</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats?.tasksCompleted || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Assistant Intelligent (Directeur·trice uniquement) */}
      {(user?.role === 'directrice' || user?.role === 'admin') && (
        <IntelligentAssistant />
      )}

      {/* Prévision des Performances (Directeur·trice uniquement) */}
      {(user?.role === 'directrice' || user?.role === 'admin') && (
        <PerformanceForecast />
      )}

      {/* Indice de Stress & Surcharge (Directeur·trice uniquement) */}
      {(user?.role === 'directrice' || user?.role === 'admin') && (
        <StressIndex />
      )}

      {/* Heatmap de Productivité (Directeur·trice uniquement) */}
      {(user?.role === 'directrice' || user?.role === 'admin') && (
        <ProductivityHeatmap />
      )}

      {/* Indicateur de Santé des Projets (Directeur·trice uniquement) */}
      {projectHealth && (user?.role === 'directrice' || user?.role === 'admin') && (
        <Card className="border-l-4 border-transparent hover:shadow-2xl transition-all duration-300 overflow-hidden bg-gradient-to-br from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-900/10">
          <Card.Header className={`bg-gradient-to-r ${
            projectHealth.statusColor === 'green' ? 'from-green-500 via-green-600 to-green-700 dark:from-green-600 dark:via-green-700 dark:to-green-800' :
            projectHealth.statusColor === 'orange' ? 'from-orange-500 via-orange-600 to-orange-700 dark:from-orange-600 dark:via-orange-700 dark:to-orange-800' :
            projectHealth.statusColor === 'yellow' ? 'from-yellow-500 via-yellow-600 to-yellow-700 dark:from-yellow-600 dark:via-yellow-700 dark:to-yellow-800' :
            'from-red-500 via-red-600 to-red-700 dark:from-red-600 dark:via-red-700 dark:to-red-800'
          } px-4 py-3 shadow-lg`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full bg-white/90 shadow-lg animate-pulse ${
                  projectHealth.statusColor === 'green' ? 'bg-green-200' :
                  projectHealth.statusColor === 'orange' ? 'bg-orange-200' :
                  projectHealth.statusColor === 'yellow' ? 'bg-yellow-200' :
                  'bg-red-200'
                }`}></div>
                <span className="drop-shadow-sm">Santé Globale des Projets</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white drop-shadow-sm">
                  {projectHealth.status === 'excellent' ? '🟢' :
                   projectHealth.status === 'good' ? '🟡' :
                   projectHealth.status === 'warning' ? '🟠' : '🔴'}
                </span>
                <span className="text-lg font-bold text-white drop-shadow-sm">
                  {projectHealth.score}/100
                </span>
              </div>
            </div>
          </Card.Header>
          <Card.Body className="pt-4 px-4 pb-4 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
            <div className="space-y-3">
              {/* Barre de progression */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                    projectHealth.statusColor === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                    projectHealth.statusColor === 'orange' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                    projectHealth.statusColor === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    'bg-gradient-to-r from-red-500 to-red-600'
                  }`}
                  style={{ width: `${projectHealth.score}%` }}
                ></div>
              </div>
              
              {/* Métriques détaillées */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Complétion</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {projectHealth.metrics.completionRate}%
                  </p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">En retard</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    {projectHealth.metrics.overdueTasks}
                  </p>
                </div>
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Bloquées</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    {projectHealth.metrics.blockedTasks}
                  </p>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">En attente</p>
                  <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    {projectHealth.metrics.pendingValidation}
                  </p>
                </div>
              </div>
              
              {/* Recommandations */}
              {projectHealth.status !== 'excellent' && (
                <div className={`mt-4 p-3 rounded-lg border-l-4 ${
                  projectHealth.statusColor === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500' :
                  projectHealth.statusColor === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
                  'bg-red-50 dark:bg-red-900/20 border-red-500'
                }`}>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                    ⚠️ Recommandations :
                  </p>
                  <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                    {projectHealth.metrics.overdueTasks > 0 && (
                      <li>• {projectHealth.metrics.overdueTasks} tâche(s) en retard nécessitent une attention immédiate</li>
                    )}
                    {projectHealth.metrics.blockedTasks > 0 && (
                      <li>• {projectHealth.metrics.blockedTasks} tâche(s) bloquée(s) nécessitent une résolution</li>
                    )}
                    {projectHealth.metrics.pendingValidation > 0 && (
                      <li>• {projectHealth.metrics.pendingValidation} tâche(s) en attente de validation</li>
                    )}
                    {projectHealth.metrics.completionRate < 70 && (
                      <li>• Taux de complétion faible ({projectHealth.metrics.completionRate}%) - Révision des priorités recommandée</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Charts */}
      {chartData && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
          {/* Graphique en barres horizontales - Statut des tâches */}
          <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800 overflow-hidden bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10">
            <Card.Header className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 px-4 py-3 shadow-lg">
              <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/90 shadow-lg animate-pulse"></div>
                <span className="drop-shadow-sm">Statut des Tâches</span>
              </h3>
            </Card.Header>
            <Card.Body className="pt-4 px-4 pb-4 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
              <div className="w-full space-y-3">
                {chartData.statusData.map((entry, index) => {
                  const total = chartData.statusData.reduce((sum, item) => sum + item.value, 0)
                  const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0
                  const statusLabels = {
                    'Terminé': 'Terminé',
                    'En cours': 'En cours',
                    'En retard': 'En retard',
                    'Planifié': 'Planifié'
                  }
                  
                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: entry.fill }}
                          ></div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {statusLabels[entry.name] || entry.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">{entry.value}</span>
                          <span className="text-gray-500 dark:text-gray-400 font-medium">{percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 shadow-sm"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: entry.fill,
                            backgroundImage: `linear-gradient(90deg, ${entry.fill} 0%, ${entry.fill}dd 100%)`
                          }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Statistiques globales */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {chartData.statusData.reduce((sum, item) => sum + item.value, 0)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Terminées</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {chartData.statusData.find(item => item.name === 'Terminé')?.value || 0}
                    </p>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Bar Chart - Tâches par semaine avec filtre de période */}
          <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-200 dark:hover:border-green-800 overflow-hidden bg-gradient-to-br from-white to-green-50/30 dark:from-gray-800 dark:to-green-900/10">
            <Card.Header className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 dark:from-green-600 dark:via-green-700 dark:to-green-800 px-4 py-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/90 shadow-lg animate-pulse"></div>
                  <span className="drop-shadow-sm">Tâches par Période</span>
                </h3>
                {/* Filtre de période dynamique */}
                {(user?.role === 'chef' || user?.role === 'directrice' || user?.role === 'admin') && (
                  <select
                    value={chartPeriod}
                    onChange={(e) => setChartPeriod(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all cursor-pointer"
                  >
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                    <option value="quarter">Trimestre</option>
                  </select>
                )}
              </div>
            </Card.Header>
            <Card.Body className="pt-4 px-4 pb-4 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
              <div className="w-full" style={{ minHeight: '280px', height: '280px' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={getFilteredChartData(chartData, chartPeriod)} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: '500' }}
                    stroke="var(--text-muted)"
                    tickLine={{ stroke: 'var(--text-muted)' }}
                  />
                  <YAxis 
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: '500' }}
                    stroke="var(--text-muted)"
                    tickLine={{ stroke: 'var(--text-muted)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                    cursor={{ fill: 'rgb(var(--accent-primary-rgb) / 0.12)' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '16px', fontSize: '13px', fontWeight: '600' }}
                    formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
                  />
                  <Bar 
                    dataKey="tasks" 
                    fill="url(#colorGradient)"
                    radius={[12, 12, 0, 0]}
                    animationDuration={800}
                    animationBegin={0}
                  >
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={1}/>
                        <stop offset="100%" stopColor="var(--accent-primary-hover)" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>

        </div>
      )}
    </div>
  )
}

