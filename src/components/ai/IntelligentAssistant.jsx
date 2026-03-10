import { useEffect, useState } from 'react'
import { Sparkles, AlertTriangle, TrendingUp, Clock, Users, Lightbulb, X } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { tasksService } from '../../services/api'
import useAuthStore from '../../store/authStore'

export default function IntelligentAssistant() {
  const { user } = useAuthStore()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (user?.role === 'directrice' || user?.role === 'admin') {
      loadSuggestions()
    }
  }, [user])

  const loadSuggestions = async () => {
    setLoading(true)
    try {
      const allTasks = await tasksService.getAll()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const newSuggestions = []

      // 1. Détection des retards imminents (3 jours avant échéance)
      const threeDaysFromNow = new Date(today)
      threeDaysFromNow.setDate(today.getDate() + 3)
      
      const upcomingDeadlines = allTasks.filter(t => {
        if (!t.dueDate || t.status === 'termine' || t.status === 'en_attente_validation') return false
        const dueDate = new Date(t.dueDate)
        return dueDate >= today && dueDate <= threeDaysFromNow && t.status !== 'en_retard'
      })

      if (upcomingDeadlines.length > 0) {
        newSuggestions.push({
          type: 'warning',
          priority: 'high',
          icon: Clock,
          title: `${upcomingDeadlines.length} tâche(s) approchant de l'échéance`,
          message: `Ces tâches arrivent à échéance dans les 3 prochains jours. Vérifiez leur avancement.`,
          tasks: upcomingDeadlines.slice(0, 5),
          action: 'Vérifier les tâches',
        })
      }

      // 2. Identification des employés surchargés
      const employeeWorkload = {}
      allTasks.forEach(t => {
        if (t.assignedToId && t.status !== 'termine') {
          if (!employeeWorkload[t.assignedToId]) {
            employeeWorkload[t.assignedToId] = {
              id: t.assignedToId,
              name: t.assignedTo,
              tasks: [],
              overdue: 0,
            }
          }
          employeeWorkload[t.assignedToId].tasks.push(t)
          if (t.status === 'en_retard' || (t.dueDate && new Date(t.dueDate) < today)) {
            employeeWorkload[t.assignedToId].overdue++
          }
        }
      })

      const overloadedEmployees = Object.values(employeeWorkload)
        .filter(emp => emp.tasks.length >= 5 || emp.overdue >= 2)
        .sort((a, b) => b.tasks.length - a.tasks.length)

      if (overloadedEmployees.length > 0) {
        newSuggestions.push({
          type: 'info',
          priority: 'medium',
          icon: Users,
          title: `${overloadedEmployees.length} employé(s) surchargé(s)`,
          message: `Ces employés ont beaucoup de tâches en cours ou plusieurs tâches en retard. Envisagez une redistribution.`,
          employees: overloadedEmployees,
          action: 'Voir les détails',
        })
      }

      // 3. Tâches bloquées nécessitant une attention
      const blockedTasks = allTasks.filter(t => {
        try {
          const metadata = t.metadata ? (typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata) : {}
          return metadata.blocked === true
        } catch (e) {
          return false
        }
      })

      if (blockedTasks.length > 0) {
        newSuggestions.push({
          type: 'critical',
          priority: 'high',
          icon: AlertTriangle,
          title: `${blockedTasks.length} tâche(s) bloquée(s)`,
          message: `Ces tâches nécessitent votre intervention pour être débloquées.`,
          tasks: blockedTasks,
          action: 'Résoudre les blocages',
        })
      }

      // 4. Tâches en attente de validation depuis plus de 2 jours
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(today.getDate() - 2)
      
      const pendingValidation = allTasks.filter(t => {
        if (t.status !== 'en_attente_validation') return false
        if (t.updatedAt) {
          const updatedDate = new Date(t.updatedAt)
          return updatedDate <= twoDaysAgo
        }
        return false
      })

      if (pendingValidation.length > 0) {
        newSuggestions.push({
          type: 'warning',
          priority: 'medium',
          icon: Clock,
          title: `${pendingValidation.length} tâche(s) en attente de validation depuis plus de 2 jours`,
          message: `Ces tâches attendent votre validation depuis plusieurs jours.`,
          tasks: pendingValidation,
          action: 'Valider les tâches',
        })
      }

      // 5. Suggestion de réaffectation pour tâches en retard
      const overdueTasks = allTasks.filter(t => {
        if (t.status === 'en_retard') return true
        if (t.dueDate) {
          const dueDate = new Date(t.dueDate)
          return dueDate < today && t.status !== 'termine' && t.status !== 'en_attente_validation'
        }
        return false
      })

      if (overdueTasks.length >= 3) {
        // Trouver des employés moins chargés
        const lessLoadedEmployees = Object.values(employeeWorkload)
          .filter(emp => emp.tasks.length < 3)
          .sort((a, b) => a.tasks.length - b.tasks.length)

        if (lessLoadedEmployees.length > 0) {
          newSuggestions.push({
            type: 'suggestion',
            priority: 'low',
            icon: TrendingUp,
            title: 'Suggestion de réaffectation',
            message: `${overdueTasks.length} tâches en retard. Envisagez de réaffecter certaines tâches aux employés moins chargés.`,
            employees: lessLoadedEmployees.slice(0, 3),
            action: 'Voir les options',
          })
        }
      }

      // 6. Résumé intelligent de la semaine
      const thisWeekStart = new Date(today)
      thisWeekStart.setDate(today.getDate() - today.getDay())
      const thisWeekEnd = new Date(thisWeekStart)
      thisWeekEnd.setDate(thisWeekStart.getDate() + 7)

      const weekTasks = allTasks.filter(t => {
        if (!t.dueDate) return false
        const dueDate = new Date(t.dueDate)
        return dueDate >= thisWeekStart && dueDate <= thisWeekEnd
      })

      const criticalWeekTasks = weekTasks.filter(t => {
        if (t.status === 'en_retard') return true
        if (t.priority === 'haute' && t.status !== 'termine') return true
        try {
          const metadata = t.metadata ? (typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata) : {}
          return metadata.blocked === true
        } catch (e) {
          return false
        }
      })

      if (criticalWeekTasks.length > 0) {
        newSuggestions.push({
          type: 'summary',
          priority: 'medium',
          icon: Lightbulb,
          title: 'Résumé de la semaine',
          message: `Cette semaine, ${criticalWeekTasks.length} tâche(s) critique(s) nécessitent une attention particulière.`,
          tasks: criticalWeekTasks.slice(0, 5),
          action: 'Voir le résumé',
        })
      }

      // Trier par priorité
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      newSuggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])

      setSuggestions(newSuggestions)
    } catch (error) {
      if (error?.message === 'Utilisateur non authentifié') {
        // Au démarrage ou après déconnexion, ignorer l'erreur
      } else {
        console.error('Erreur lors du chargement des suggestions:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const getSuggestionColor = (type) => {
    switch (type) {
      case 'critical':
        return 'red'
      case 'warning':
        return 'orange'
      case 'info':
        return 'blue'
      case 'suggestion':
        return 'purple'
      case 'summary':
        return 'indigo'
      default:
        return 'gray'
    }
  }

  if (user?.role !== 'directrice' && user?.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <Card>
        <div className="text-center py-4 text-gray-500">Analyse en cours...</div>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card className="border-l-4 border-green-500">
        <div className="flex items-center gap-3 p-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <Sparkles className="text-green-600 dark:text-green-400" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              ✅ Tout va bien !
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Aucune action urgente requise pour le moment.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-l-4 border-indigo-500">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
              <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Assistant Intelligent
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {suggestions.length} suggestion(s) disponible(s)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            {isExpanded ? <X size={18} /> : <Sparkles size={18} />}
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-3 mt-4">
            {suggestions.map((suggestion, index) => {
              const Icon = suggestion.icon
              const color = getSuggestionColor(suggestion.type)
              
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 bg-${color}-50 dark:bg-${color}-900/20 border-${color}-500`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`text-${color}-600 dark:text-${color}-400 flex-shrink-0 mt-0.5`} size={18} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {suggestion.title}
                        </h4>
                        <Badge variant={suggestion.priority === 'high' ? 'danger' : suggestion.priority === 'medium' ? 'warning' : 'info'} size="sm">
                          {suggestion.priority === 'high' ? 'Urgent' : suggestion.priority === 'medium' ? 'Important' : 'Info'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                        {suggestion.message}
                      </p>
                      
                      {/* Afficher les tâches concernées */}
                      {suggestion.tasks && suggestion.tasks.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {suggestion.tasks.slice(0, 3).map((task) => (
                            <div key={task.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <span>•</span>
                              <span className="truncate">{task.title}</span>
                            </div>
                          ))}
                          {suggestion.tasks.length > 3 && (
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              + {suggestion.tasks.length - 3} autre(s)
                            </div>
                          )}
                        </div>
                      )}

                      {/* Afficher les employés concernés */}
                      {suggestion.employees && suggestion.employees.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {suggestion.employees.map((emp) => (
                            <div key={emp.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <span>•</span>
                              <span>{emp.name}: {emp.tasks.length} tâche(s) en cours</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!isExpanded && suggestions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <AlertTriangle size={14} />
              <span>
                {suggestions.filter(s => s.priority === 'high').length} suggestion(s) urgente(s)
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

