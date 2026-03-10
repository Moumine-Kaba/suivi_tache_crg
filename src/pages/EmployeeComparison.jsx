import { useEffect, useState, useMemo } from 'react'
import { 
  Users, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle, Award, 
  Target, Calendar, BarChart3, RefreshCw, Search, Building2, Zap, Trophy,
  Activity, ArrowUpRight, ArrowDownRight, Star, Medal, Crown
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from 'recharts'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { usersService } from '../services/api'
import useAuthStore from '../store/authStore'
import useTasksStore from '../store/tasksStore'

export default function EmployeeComparison() {
  const { user } = useAuthStore()
  const { tasks, loadTasks } = useTasksStore()
  const [employees, setEmployees] = useState([])
  const [personalStats, setPersonalStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [searchTerm, setSearchTerm] = useState('')
  const [directionFilter, setDirectionFilter] = useState('')
  const [viewMode, setViewMode] = useState('ranking') // ranking, analytics

  // Déterminer le type de vue
  const isEmployeeView = user?.role === 'employe' || user?.role === 'chef'
  const isDirectionView = user?.role === 'directrice' || user?.role === 'admin'

  useEffect(() => {
    // Charger les tâches pour tous les utilisateurs autorisés
    if (isEmployeeView || isDirectionView) {
      loadTasks({}).catch(() => {})
    }
  }, [user, loadTasks, isEmployeeView, isDirectionView])

  useEffect(() => {
    // Charger les données selon la vue
    if (isDirectionView) {
      loadEmployeeData()
    } else if (isEmployeeView) {
      loadEmployeePersonalData()
    }
  }, [user, period, tasks, isEmployeeView, isDirectionView])

  const loadEmployeeData = async () => {
    setLoading(true)
    try {
      const allUsers = await usersService.getAll()
      // Inclure les employés ET les chefs de service (ils sont aussi des employés de la directrice)
      const employeesList = allUsers.filter(u => u.role === 'employe' || u.role === 'chef')
      
      const allTasks = tasks || []
      const today = new Date()
      
      const employeesWithStats = await Promise.all(
        employeesList.map(async (employee) => {
          const employeeTasks = allTasks.filter(t => 
            t.assignedToId === employee.id || 
            t.assigned_to === employee.id ||
            (t.assignedTo && (t.assignedTo.includes(employee.nom) || t.assignedTo.includes(employee.name)))
          )
          
          const periodStart = new Date(today)
          if (period === 'month') {
            periodStart.setMonth(today.getMonth() - 1)
          } else if (period === 'quarter') {
            periodStart.setMonth(today.getMonth() - 3)
          } else {
            periodStart.setFullYear(today.getFullYear() - 1)
          }
          
          const periodTasks = employeeTasks.filter(t => {
            const createdDate = t.created_at || t.createdAt || t.created
            if (!createdDate) return false
            return new Date(createdDate) >= periodStart
          })
          
          const completed = periodTasks.filter(t => t.status === 'termine' || t.status === 'terminé').length
          const inProgress = periodTasks.filter(t => t.status === 'en_cours' || t.status === 'en cours').length
          const pending = periodTasks.filter(t => t.status === 'en_attente_validation' || t.status === 'en attente').length
          const overdue = periodTasks.filter(t => {
            if (t.status === 'en_retard' || t.status === 'en retard') return true
            const dueDate = t.due_date || t.dueDate || t.due
            if (dueDate) {
              const due = new Date(dueDate)
              return due < today && t.status !== 'termine' && t.status !== 'terminé'
            }
            return false
          }).length
          
          const total = periodTasks.length
          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
          
          const tasksWithDueDate = periodTasks.filter(t => t.due_date || t.dueDate || t.due)
          const onTime = tasksWithDueDate.filter(t => {
            if (t.status !== 'termine' && t.status !== 'terminé') return false
            const dueDate = new Date(t.due_date || t.dueDate || t.due)
            const completedDate = t.updated_at || t.updatedAt || t.updated || t.completed_at || t.completedAt
            if (!completedDate) return false
            return new Date(completedDate) <= dueDate
          }).length
          const onTimeRate = tasksWithDueDate.length > 0 ? Math.round((onTime / tasksWithDueDate.length) * 100) : 100
          
          const performanceScore = Math.round((completionRate * 0.5) + (onTimeRate * 0.3) + ((total - overdue) / Math.max(total, 1) * 100 * 0.2))
          
          const completedTasks = periodTasks.filter(t => t.status === 'termine' || t.status === 'terminé')
          let avgCompletionTime = 0
          if (completedTasks.length > 0) {
            const totalDays = completedTasks.reduce((sum, t) => {
              const created = new Date(t.created_at || t.createdAt || t.created)
              const completed = new Date(t.updated_at || t.updatedAt || t.updated || t.completed_at || t.completedAt || new Date())
              const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24))
              return sum + Math.max(0, days)
            }, 0)
            avgCompletionTime = Math.round(totalDays / completedTasks.length)
          }
          
          return {
            ...employee,
            stats: {
              total,
              completed,
              inProgress,
              pending,
              overdue,
              completionRate,
              onTimeRate,
              performanceScore,
              avgCompletionTime,
            }
          }
        })
      )
      
      employeesWithStats.sort((a, b) => b.stats.performanceScore - a.stats.performanceScore)
      setEmployees(employeesWithStats)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  // Charger les données personnelles de l'employé
  const loadEmployeePersonalData = async () => {
    setLoading(true)
    try {
      if (!user) return
      
      const allTasks = tasks || []
      const today = new Date()
      
      const periodStart = new Date(today)
      if (period === 'month') {
        periodStart.setMonth(today.getMonth() - 1)
      } else if (period === 'quarter') {
        periodStart.setMonth(today.getMonth() - 3)
      } else {
        periodStart.setFullYear(today.getFullYear() - 1)
      }
      
      // Filtrer les tâches de l'utilisateur connecté
      const employeeTasks = allTasks.filter(t => 
        t.assignedToId === user.id || 
        t.assigned_to === user.id ||
        (t.assignedTo && (t.assignedTo.includes(user.nom) || t.assignedTo.includes(user.name) || t.assignedTo.includes(user.email)))
      )
      
      const periodTasks = employeeTasks.filter(t => {
        const createdDate = t.created_at || t.createdAt || t.created
        if (!createdDate) return false
        return new Date(createdDate) >= periodStart
      })
      
      const completed = periodTasks.filter(t => t.status === 'termine' || t.status === 'terminé').length
      const inProgress = periodTasks.filter(t => t.status === 'en_cours' || t.status === 'en cours').length
      const pending = periodTasks.filter(t => t.status === 'en_attente_validation' || t.status === 'en attente').length
      const overdue = periodTasks.filter(t => {
        if (t.status === 'en_retard' || t.status === 'en retard') return true
        const dueDate = t.due_date || t.dueDate || t.due
        if (dueDate) {
          const due = new Date(dueDate)
          return due < today && t.status !== 'termine' && t.status !== 'terminé'
        }
        return false
      }).length
      
      const total = periodTasks.length
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
      
      const tasksWithDueDate = periodTasks.filter(t => t.due_date || t.dueDate || t.due)
      const onTime = tasksWithDueDate.filter(t => {
        if (t.status !== 'termine' && t.status !== 'terminé') return false
        const dueDate = new Date(t.due_date || t.dueDate || t.due)
        const completedDate = t.updated_at || t.updatedAt || t.updated || t.completed_at || t.completedAt
        if (!completedDate) return false
        return new Date(completedDate) <= dueDate
      }).length
      const onTimeRate = tasksWithDueDate.length > 0 ? Math.round((onTime / tasksWithDueDate.length) * 100) : 100
      
      const performanceScore = Math.round((completionRate * 0.5) + (onTimeRate * 0.3) + ((total - overdue) / Math.max(total, 1) * 100 * 0.2))
      
      const completedTasks = periodTasks.filter(t => t.status === 'termine' || t.status === 'terminé')
      let avgCompletionTime = 0
      if (completedTasks.length > 0) {
        const totalDays = completedTasks.reduce((sum, t) => {
          const created = new Date(t.created_at || t.createdAt || t.created)
          const completed = new Date(t.updated_at || t.updatedAt || t.updated || t.completed_at || t.completedAt || new Date())
          const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24))
          return sum + Math.max(0, days)
        }, 0)
        avgCompletionTime = Math.round(totalDays / completedTasks.length)
      }
      
      setPersonalStats({
        total,
        completed,
        inProgress,
        pending,
        overdue,
        completionRate,
        onTimeRate,
        performanceScore,
        avgCompletionTime,
        periodTasks
      })
    } catch (error) {
      console.error('Erreur lors du chargement des données personnelles:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const name = (emp.nom || emp.name || emp.email || '').toLowerCase()
      const direction = (emp.direction || '').toLowerCase()
      const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase())
      const matchesDirection = !directionFilter || direction === directionFilter.toLowerCase()
      return matchesSearch && matchesDirection
    })
  }, [employees, searchTerm, directionFilter])

  const directions = useMemo(() => {
    const dirs = [...new Set(employees.map(e => e.direction).filter(Boolean))]
    return dirs.sort()
  }, [employees])

  // Données pour les graphiques
  const chartData = useMemo(() => {
    return filteredEmployees.slice(0, 10).map(emp => ({
      name: (emp.nom || emp.name || emp.email || '').substring(0, 15),
      performance: emp.stats.performanceScore,
      completion: emp.stats.completionRate,
      onTime: emp.stats.onTimeRate,
      total: emp.stats.total,
    }))
  }, [filteredEmployees])

  const radarData = useMemo(() => {
    if (filteredEmployees.length === 0) return []
    const top3 = filteredEmployees.slice(0, 3)
    return top3.map(emp => ({
      employee: (emp.nom || emp.name || emp.email || '').substring(0, 10),
      performance: emp.stats.performanceScore,
      completion: emp.stats.completionRate,
      onTime: emp.stats.onTimeRate,
      productivity: Math.min(100, (emp.stats.completed / Math.max(emp.stats.total, 1)) * 100),
      speed: Math.max(0, 100 - emp.stats.avgCompletionTime),
    }))
  }, [filteredEmployees])

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-blue-600 dark:text-blue-400'
    if (score >= 40) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getPerformanceBadge = (score) => {
    if (score >= 80) return 'success'
    if (score >= 60) return 'info'
    if (score >= 40) return 'warning'
    return 'danger'
  }

  // Si ni employé ni direction, accès refusé
  if (!isEmployeeView && !isDirectionView) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto text-yellow-500 mb-3" size={48} />
            <p className="text-gray-600 dark:text-gray-400">Accès non autorisé</p>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-crg-primary"></div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement des données...</p>
          </div>
        </Card>
      </div>
    )
  }

  // VUE EMPLOYÉ : Stats personnelles uniquement
  if (isEmployeeView) {
    return (
      <div className="space-y-6 p-4">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Target className="text-crg-primary dark:text-crg-secondary" size={32} />
              Mes Performances
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Suivez vos objectifs personnels et votre progression
            </p>
          </div>
          <Button
            onClick={() => loadEmployeePersonalData()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Actualiser
          </Button>
        </div>

        {personalStats ? (
          <>
            {/* Score de Performance Principal */}
            <Card className="p-8 bg-gradient-to-br from-crg-primary/10 via-crg-secondary/10 to-crg-primary/5 dark:from-crg-primary/20 dark:via-crg-secondary/20 dark:to-crg-primary/10 border-2 border-crg-primary/30">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Votre Score de Performance</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Basé sur votre complétion, respect des délais et qualité du travail
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-6xl font-black ${getPerformanceColor(personalStats.performanceScore)}`}>
                    {personalStats.performanceScore}
                  </div>
                  <Badge variant={getPerformanceBadge(personalStats.performanceScore)} className="text-lg font-bold mt-2 px-4 py-1">
                    {personalStats.performanceScore >= 80 ? 'Excellent' :
                     personalStats.performanceScore >= 60 ? 'Très Bien' :
                     personalStats.performanceScore >= 40 ? 'Bien' : 'À Améliorer'}
                  </Badge>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    personalStats.performanceScore >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                    personalStats.performanceScore >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    personalStats.performanceScore >= 40 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-600'
                  }`}
                  style={{ width: `${personalStats.performanceScore}%` }}
                ></div>
              </div>
            </Card>

            {/* Statistiques détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Tâches</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{personalStats.total}</p>
                  </div>
                  <Target className="text-blue-600 dark:text-blue-400" size={32} />
                </div>
              </Card>
              <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Terminées</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">{personalStats.completed}</p>
                  </div>
                  <CheckCircle2 className="text-green-600 dark:text-green-400" size={32} />
                </div>
              </Card>
              <Card className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">En Cours</p>
                    <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{personalStats.inProgress}</p>
                  </div>
                  <Clock className="text-orange-600 dark:text-orange-400" size={32} />
                </div>
              </Card>
              {personalStats.overdue > 0 && (
                <Card className="p-5 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">En Retard</p>
                      <p className="text-3xl font-bold text-red-900 dark:text-red-100">{personalStats.overdue}</p>
                    </div>
                    <AlertTriangle className="text-red-600 dark:text-red-400" size={32} />
                  </div>
                </Card>
              )}
            </div>

            {/* Objectifs et Progression */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Target className="text-crg-primary" size={24} />
                  Taux de Complétion
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Objectif: 100%</span>
                      <span className={`text-2xl font-bold ${getPerformanceColor(personalStats.completionRate)}`}>
                        {personalStats.completionRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          personalStats.completionRate >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          personalStats.completionRate >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                          personalStats.completionRate >= 40 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-600'
                        }`}
                        style={{ width: `${personalStats.completionRate}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {personalStats.completed} tâche{personalStats.completed > 1 ? 's' : ''} complétée{personalStats.completed > 1 ? 's' : ''} sur {personalStats.total}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="text-crg-primary" size={24} />
                  Respect des Délais
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Objectif: 100%</span>
                      <span className={`text-2xl font-bold ${getPerformanceColor(personalStats.onTimeRate)}`}>
                        {personalStats.onTimeRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          personalStats.onTimeRate >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          personalStats.onTimeRate >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                          personalStats.onTimeRate >= 40 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-600'
                        }`}
                        style={{ width: `${personalStats.onTimeRate}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Temps moyen de complétion: {personalStats.avgCompletionTime} jour{personalStats.avgCompletionTime > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Feedback et Encouragement */}
            <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-400/20 rounded-full">
                  <Star className="text-yellow-600 dark:text-yellow-400" size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Feedback & Encouragement</h3>
                  {personalStats.performanceScore >= 80 ? (
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong className="text-green-600 dark:text-green-400">Excellent travail !</strong> Vous maintenez un niveau de performance remarquable. Continuez sur cette lancée !
                    </p>
                  ) : personalStats.performanceScore >= 60 ? (
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong className="text-blue-600 dark:text-blue-400">Très bon travail !</strong> Vous êtes sur la bonne voie. Quelques ajustements et vous atteindrez l'excellence.
                    </p>
                  ) : personalStats.performanceScore >= 40 ? (
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong className="text-orange-600 dark:text-orange-400">Bon travail !</strong> Il y a de la marge d'amélioration. Concentrez-vous sur la complétion des tâches dans les délais.
                    </p>
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong className="text-red-600 dark:text-red-400">Continuez vos efforts !</strong> Chaque jour est une nouvelle opportunité de progresser. Fixez-vous des objectifs réalisables et travaillez étape par étape.
                    </p>
                  )}
                  {personalStats.overdue > 0 && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        <AlertTriangle size={16} className="inline mr-2" />
                        Vous avez {personalStats.overdue} tâche{personalStats.overdue > 1 ? 's' : ''} en retard. Priorisez ces tâches pour améliorer votre score.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-8 text-center">
            <Users className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={64} />
            <p className="text-lg text-gray-600 dark:text-gray-400">Aucune donnée disponible pour cette période.</p>
          </Card>
        )}
      </div>
    )
  }

  // VUE DIRECTION : Comparaison globale
  return (
    <div className="space-y-6 p-4">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="text-crg-primary dark:text-crg-secondary" size={32} />
            Analyse Comparative des Employés
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Vue d'ensemble des performances et productivité de l'équipe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => loadEmployeeData()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher un employé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-crg-primary/50"
            />
          </div>
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-crg-primary/50"
          >
            <option value="">Toutes les directions</option>
            {directions.map(dir => (
              <option key={dir} value={dir}>{dir}</option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-crg-primary/50"
          >
            <option value="month">Dernier mois</option>
            <option value="quarter">Dernier trimestre</option>
            <option value="year">Dernière année</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('ranking')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'ranking'
                  ? 'bg-crg-primary text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Trophy size={16} className="inline mr-2" />
              Classement
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'analytics'
                  ? 'bg-crg-primary text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <BarChart3 size={16} className="inline mr-2" />
              Analytics
            </button>
          </div>
        </div>
      </Card>

      {/* Statistiques globales */}
      {filteredEmployees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Employés</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{filteredEmployees.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Users className="text-blue-600 dark:text-blue-400" size={28} />
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Tâches Complétées</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {filteredEmployees.reduce((sum, e) => sum + e.stats.completed, 0)}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-xl">
                <CheckCircle2 className="text-green-600 dark:text-green-400" size={28} />
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">En Cours</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {filteredEmployees.reduce((sum, e) => sum + e.stats.inProgress, 0)}
                </p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <Clock className="text-orange-600 dark:text-orange-400" size={28} />
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">En Retard</p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                  {filteredEmployees.reduce((sum, e) => sum + e.stats.overdue, 0)}
                </p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertTriangle className="text-red-600 dark:text-red-400" size={28} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Vue Classement avec Podium */}
      {viewMode === 'ranking' && (
        <div className="space-y-6">
          {/* Podium Top 3 - Design amélioré */}
          {filteredEmployees.length >= 3 && (
            <Card className="p-8 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-2 border-gray-200 dark:border-gray-700">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-3">
                  <Trophy className="text-yellow-500" size={32} />
                  Podium des Performances
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Les trois meilleurs employés de la période</p>
              </div>
              <div className="flex items-end justify-center gap-6 px-4">
                {/* 2ème place */}
                <div className="flex flex-col items-center flex-1 max-w-[200px]">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gray-400 rounded-full blur-xl opacity-30"></div>
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-2xl ring-4 ring-gray-200 dark:ring-gray-700">
                      <Medal className="text-white" size={36} />
                    </div>
                  </div>
                  <div className="w-full h-28 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-t-2xl flex items-center justify-center mb-3 shadow-lg border-2 border-gray-200 dark:border-gray-600">
                    <span className="text-5xl font-black text-gray-800 dark:text-gray-200">2</span>
                  </div>
                  <div className="text-center w-full">
                    <p className="font-bold text-lg text-gray-900 dark:text-white mb-2 px-2">
                      {filteredEmployees[1]?.nom || filteredEmployees[1]?.name || filteredEmployees[1]?.email}
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Building2 size={14} className="text-gray-500" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {filteredEmployees[1]?.direction || 'Sans service'}
                      </p>
                    </div>
                    <Badge variant="info" className="text-lg font-bold px-4 py-1.5">
                      {filteredEmployees[1]?.stats.performanceScore} pts
                    </Badge>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs px-2">
                        <span className="text-gray-600 dark:text-gray-400">Terminées:</span>
                        <span className="font-bold text-green-600">{filteredEmployees[1]?.stats.completed}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs px-2">
                        <span className="text-gray-600 dark:text-gray-400">Complétion:</span>
                        <span className="font-bold text-blue-600">{filteredEmployees[1]?.stats.completionRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1ère place */}
                <div className="flex flex-col items-center flex-1 max-w-[240px]">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 flex items-center justify-center shadow-2xl ring-4 ring-yellow-300 dark:ring-yellow-500">
                      <Crown className="text-white" size={48} />
                    </div>
                  </div>
                  <div className="w-full h-40 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 dark:from-yellow-600 dark:via-yellow-700 dark:to-yellow-800 rounded-t-2xl flex items-center justify-center mb-3 shadow-2xl border-2 border-yellow-300 dark:border-yellow-500">
                    <span className="text-7xl font-black text-white drop-shadow-lg">1</span>
                  </div>
                  <div className="text-center w-full">
                    <p className="font-bold text-xl text-gray-900 dark:text-white mb-2 px-2">
                      {filteredEmployees[0]?.nom || filteredEmployees[0]?.name || filteredEmployees[0]?.email}
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Building2 size={14} className="text-gray-500" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {filteredEmployees[0]?.direction || 'Sans service'}
                      </p>
                    </div>
                    <Badge variant="success" className="text-xl font-bold px-5 py-2">
                      {filteredEmployees[0]?.stats.performanceScore} pts
                    </Badge>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs px-2">
                        <span className="text-gray-600 dark:text-gray-400">Terminées:</span>
                        <span className="font-bold text-green-600">{filteredEmployees[0]?.stats.completed}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs px-2">
                        <span className="text-gray-600 dark:text-gray-400">Complétion:</span>
                        <span className="font-bold text-blue-600">{filteredEmployees[0]?.stats.completionRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3ème place */}
                <div className="flex flex-col items-center flex-1 max-w-[200px]">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-orange-400 rounded-full blur-xl opacity-30"></div>
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-2xl ring-4 ring-orange-200 dark:ring-orange-700">
                      <Award className="text-white" size={36} />
                    </div>
                  </div>
                  <div className="w-full h-24 bg-gradient-to-b from-orange-300 to-orange-400 dark:from-orange-600 dark:to-orange-700 rounded-t-2xl flex items-center justify-center mb-3 shadow-lg border-2 border-orange-200 dark:border-orange-600">
                    <span className="text-5xl font-black text-orange-800 dark:text-orange-200">3</span>
                  </div>
                  <div className="text-center w-full">
                    <p className="font-bold text-lg text-gray-900 dark:text-white mb-2 px-2">
                      {filteredEmployees[2]?.nom || filteredEmployees[2]?.name || filteredEmployees[2]?.email}
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Building2 size={14} className="text-gray-500" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {filteredEmployees[2]?.direction || 'Sans service'}
                      </p>
                    </div>
                    <Badge variant="warning" className="text-lg font-bold px-4 py-1.5">
                      {filteredEmployees[2]?.stats.performanceScore} pts
                    </Badge>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs px-2">
                        <span className="text-gray-600 dark:text-gray-400">Terminées:</span>
                        <span className="font-bold text-green-600">{filteredEmployees[2]?.stats.completed}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs px-2">
                        <span className="text-gray-600 dark:text-gray-400">Complétion:</span>
                        <span className="font-bold text-blue-600">{filteredEmployees[2]?.stats.completionRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Liste complète du classement - Design amélioré */}
          <Card className="overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-crg-primary/5 to-crg-secondary/5 dark:from-crg-primary/10 dark:to-crg-secondary/10 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <BarChart3 className="text-crg-primary dark:text-crg-secondary" size={28} />
                Classement Complet
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {filteredEmployees.length} employé{filteredEmployees.length > 1 ? 's' : ''} classé{filteredEmployees.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEmployees.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={64} />
                  <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Aucun employé trouvé</p>
                </div>
              ) : (
                filteredEmployees.map((employee, index) => (
                  <div
                    key={employee.id}
                    className={`group transition-all duration-300 ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-50/50 via-yellow-50/30 to-transparent dark:from-yellow-900/20 dark:via-yellow-900/10 dark:to-transparent border-l-4 border-yellow-400'
                        : index < 3
                        ? 'bg-gray-50/50 dark:bg-gray-800/30 border-l-4 border-gray-300 dark:border-gray-600'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/30 border-l-4 border-transparent hover:border-crg-primary/30'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-center gap-5">
                        {/* Position */}
                        <div className="flex-shrink-0 w-16 text-center">
                          {index === 0 ? (
                            <div className="relative">
                              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-lg opacity-30"></div>
                              <Crown className="relative text-yellow-500 mx-auto" size={28} />
                            </div>
                          ) : index === 1 ? (
                            <div className="relative">
                              <div className="absolute inset-0 bg-gray-400 rounded-full blur-lg opacity-30"></div>
                              <Medal className="relative text-gray-400 mx-auto" size={28} />
                            </div>
                          ) : index === 2 ? (
                            <div className="relative">
                              <div className="absolute inset-0 bg-orange-400 rounded-full blur-lg opacity-30"></div>
                              <Award className="relative text-orange-500 mx-auto" size={28} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mx-auto">
                              <span className="text-lg font-bold text-gray-600 dark:text-gray-300">#{index + 1}</span>
                            </div>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                          index === 0 
                            ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 ring-2 ring-yellow-300' 
                            : 'bg-gradient-to-br from-crg-primary/20 to-crg-secondary/20'
                        }`}>
                          {index === 0 ? (
                            <Trophy className="text-yellow-600 dark:text-yellow-400" size={28} />
                          ) : (
                            <Users size={24} className="text-crg-primary dark:text-crg-secondary" />
                          )}
                        </div>

                        {/* Informations */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-bold text-lg text-gray-900 dark:text-white">
                              {employee.nom || employee.name || employee.email}
                            </p>
                            {index === 0 && (
                              <Badge variant="success" className="text-xs">Champion</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Building2 size={14} className="text-gray-400" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {employee.direction || 'Sans service'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Target size={14} className="text-gray-400" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {employee.stats.total} tâche{employee.stats.total > 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="text-green-500" />
                              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                {employee.stats.completed} terminée{employee.stats.completed > 1 ? 's' : ''}
                              </p>
                            </div>
                            {employee.stats.overdue > 0 && (
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle size={14} className="text-red-500" />
                                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                  {employee.stats.overdue} en retard
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Score et barre de progression */}
                        <div className="flex items-center gap-6 flex-shrink-0">
                          <div className="text-right min-w-[100px]">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Score Performance</p>
                            <Badge 
                              variant={getPerformanceBadge(employee.stats.performanceScore)} 
                              className="text-lg font-bold px-4 py-1.5"
                            >
                              {employee.stats.performanceScore}
                            </Badge>
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <span className="text-gray-500 dark:text-gray-400">Complétion:</span>
                              <span className={`font-bold ${
                                employee.stats.completionRate >= 80 ? 'text-green-600' :
                                employee.stats.completionRate >= 60 ? 'text-blue-600' :
                                employee.stats.completionRate >= 40 ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                {employee.stats.completionRate}%
                              </span>
                            </div>
                          </div>
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${
                                employee.stats.performanceScore >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                employee.stats.performanceScore >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                employee.stats.performanceScore >= 40 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-600'
                              }`}
                              style={{ width: `${employee.stats.performanceScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Vue Analytics avec Graphiques */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          {/* Statistiques rapides en haut */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Score Moyen</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {filteredEmployees.length > 0 
                      ? Math.round(filteredEmployees.reduce((sum, e) => sum + e.stats.performanceScore, 0) / filteredEmployees.length)
                      : 0}
                  </p>
                </div>
                <TrendingUp className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Taux Complétion Moyen</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {filteredEmployees.length > 0 
                      ? Math.round(filteredEmployees.reduce((sum, e) => sum + e.stats.completionRate, 0) / filteredEmployees.length)
                      : 0}%
                  </p>
                </div>
                <CheckCircle2 className="text-green-600 dark:text-green-400" size={32} />
              </div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Temps Moyen</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {filteredEmployees.length > 0 
                      ? Math.round(filteredEmployees.reduce((sum, e) => sum + parseFloat(e.stats.avgCompletionTime || 0), 0) / filteredEmployees.length)
                      : 0}j
                  </p>
                </div>
                <Clock className="text-purple-600 dark:text-purple-400" size={32} />
              </div>
            </Card>
          </div>

          {/* Graphique en barres - Performance amélioré */}
          <Card className="p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <BarChart3 className="text-crg-primary dark:text-crg-secondary" size={28} />
                Comparaison des Performances
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Analyse comparative des scores de performance, taux de complétion et respect des délais</p>
            </div>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-muted)" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '2px solid var(--border-color)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  cursor={{ fill: 'rgb(var(--accent-primary-rgb) / 0.12)' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar 
                  dataKey="performance" 
                  fill="var(--accent-primary)" 
                  name="Score Performance" 
                  radius={[8, 8, 0, 0]}
                  stroke="var(--accent-primary-hover)"
                  strokeWidth={1}
                />
                <Bar 
                  dataKey="completion" 
                  fill="var(--accent-primary-hover)" 
                  name="Taux Complétion" 
                  radius={[8, 8, 0, 0]}
                  stroke="var(--accent-primary-hover)"
                  strokeWidth={1}
                />
                <Bar 
                  dataKey="onTime" 
                  fill="var(--accent-success)" 
                  name="Respect Délais" 
                  radius={[8, 8, 0, 0]}
                  stroke="var(--accent-success)"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Graphique Radar - Top 3 amélioré */}
          {radarData.length > 0 && (
            <Card className="p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                  <Activity className="text-crg-primary dark:text-crg-secondary" size={28} />
                  Analyse Multi-Critères (Top 3)
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Profil de performance détaillé des trois meilleurs employés</p>
              </div>
              <ResponsiveContainer width="100%" height={450}>
                <RadarChart data={radarData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <PolarGrid stroke="var(--border-color)" opacity={0.5} />
                  <PolarAngleAxis 
                    dataKey="employee" 
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 11 }}
                  />
                  <Radar 
                    name="Performance" 
                    dataKey="performance" 
                    stroke="var(--accent-primary)" 
                    fill="var(--accent-primary)" 
                    fillOpacity={0.7}
                    strokeWidth={2}
                  />
                  <Radar 
                    name="Complétion" 
                    dataKey="completion" 
                    stroke="var(--accent-primary-hover)" 
                    fill="var(--accent-primary-hover)" 
                    fillOpacity={0.7}
                    strokeWidth={2}
                  />
                  <Radar 
                    name="Respect Délais" 
                    dataKey="onTime" 
                    stroke="var(--accent-success)" 
                    fill="var(--accent-success)" 
                    fillOpacity={0.7}
                    strokeWidth={2}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-card)', 
                      border: '2px solid var(--border-color)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Graphique comparatif - Total tâches amélioré */}
          <Card className="p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <Target className="text-crg-primary dark:text-crg-secondary" size={28} />
                Volume de Tâches par Employé
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Répartition du nombre total de tâches assignées à chaque employé</p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
                <XAxis 
                  type="number" 
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="var(--text-muted)" 
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '2px solid var(--border-color)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  cursor={{ fill: 'rgb(var(--accent-primary-rgb) / 0.12)' }}
                />
                <Bar 
                  dataKey="total" 
                  fill="var(--accent-primary)" 
                  name="Total Tâches" 
                  radius={[0, 8, 8, 0]}
                  stroke="var(--accent-primary-hover)"
                  strokeWidth={1}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="var(--accent-primary)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Graphique en ligne - Évolution */}
          <Card className="p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <TrendingUp className="text-crg-primary dark:text-crg-secondary" size={28} />
                Comparaison des Statistiques Détaillées
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Vue d'ensemble des métriques clés par employé</p>
            </div>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-muted)" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '2px solid var(--border-color)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  cursor={{ fill: 'rgb(var(--accent-primary-rgb) / 0.12)' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar 
                  dataKey="completed" 
                  fill="var(--accent-success)" 
                  name="Tâches Complétées" 
                  radius={[8, 8, 0, 0]}
                  stroke="var(--accent-success)"
                  strokeWidth={1}
                />
                <Bar 
                  dataKey="inProgress" 
                  fill="var(--accent-primary)" 
                  name="En Cours" 
                  radius={[8, 8, 0, 0]}
                  stroke="var(--accent-primary-hover)"
                  strokeWidth={1}
                />
                <Bar 
                  dataKey="overdue" 
                  fill="var(--accent-error)" 
                  name="En Retard" 
                  radius={[8, 8, 0, 0]}
                  stroke="var(--accent-error)"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  )
}
