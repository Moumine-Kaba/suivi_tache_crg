import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Clock, Target, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { tasksService } from '../../services/api'
import useAuthStore from '../../store/authStore'

export default function PerformanceForecast() {
  const { user } = useAuthStore()
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === 'directrice' || user?.role === 'admin') {
      loadForecast()
    }
  }, [user])

  const loadForecast = async () => {
    setLoading(true)
    try {
      const allTasks = await tasksService.getAll()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Calculer les statistiques de performance
      const completedTasks = allTasks.filter(t => t.status === 'termine')
      const inProgressTasks = allTasks.filter(t => t.status === 'en_cours' || t.status === 'en_attente_validation')
      const overdueTasks = allTasks.filter(t => {
        if (t.status === 'termine') return false
        if (t.dueDate) {
          const dueDate = new Date(t.dueDate)
          return dueDate < today
        }
        return false
      })

      // Calculer le temps moyen de complétion pour les tâches terminées
      let avgCompletionTime = 0
      let completionTimeData = []
      
      completedTasks.forEach(task => {
        if (task.createdAt && task.updatedAt) {
          const created = new Date(task.createdAt)
          const completed = new Date(task.updatedAt)
          const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24))
          completionTimeData.push(days)
        }
      })

      if (completionTimeData.length > 0) {
        avgCompletionTime = completionTimeData.reduce((a, b) => a + b, 0) / completionTimeData.length
      }

      // Estimer le temps restant pour les tâches en cours
      const estimatedRemainingTime = inProgressTasks.map(task => {
        if (!task.createdAt || !task.dueDate) return null
        
        const created = new Date(task.createdAt)
        const due = new Date(task.dueDate)
        const progress = task.progress || 0
        const elapsedDays = Math.ceil((today - created) / (1000 * 60 * 60 * 24))
        const totalDays = Math.ceil((due - created) / (1000 * 60 * 60 * 24))
        
        // Estimer le temps restant basé sur la progression actuelle
        let estimatedRemaining = 0
        if (progress > 0) {
          const estimatedTotal = elapsedDays / (progress / 100)
          estimatedRemaining = estimatedTotal - elapsedDays
        } else {
          // Si pas de progression, utiliser la moyenne historique
          estimatedRemaining = avgCompletionTime || totalDays
        }

        return {
          task,
          estimatedRemaining: Math.max(0, Math.ceil(estimatedRemaining)),
          totalDays,
          elapsedDays,
          progress,
          onTrack: estimatedRemaining <= (totalDays - elapsedDays) * 1.2, // 20% de marge
        }
      }).filter(Boolean)

      // Calculer le taux de succès prévu
      const tasksWithDueDate = allTasks.filter(t => t.dueDate && t.status !== 'termine')
      const onTrackCount = estimatedRemainingTime.filter(e => e.onTrack).length
      const predictedSuccessRate = tasksWithDueDate.length > 0
        ? Math.round((onTrackCount / tasksWithDueDate.length) * 100)
        : 100

      // Identifier les employés surchargés
      const employeeWorkload = {}
      allTasks.forEach(t => {
        if (t.assignedToId && t.status !== 'termine') {
          if (!employeeWorkload[t.assignedToId]) {
            employeeWorkload[t.assignedToId] = {
              id: t.assignedToId,
              name: t.assignedTo,
              tasks: [],
              estimatedHours: 0,
            }
          }
          employeeWorkload[t.assignedToId].tasks.push(t)
          
          // Estimer les heures nécessaires (basé sur la priorité et le type)
          const baseHours = t.priority === 'haute' ? 8 : t.priority === 'moyenne' ? 4 : 2
          const remainingProgress = (100 - (t.progress || 0)) / 100
          employeeWorkload[t.assignedToId].estimatedHours += baseHours * remainingProgress
        }
      })

      const overloadedEmployees = Object.values(employeeWorkload)
        .filter(emp => emp.estimatedHours > 40 || emp.tasks.length >= 5)
        .sort((a, b) => b.estimatedHours - a.estimatedHours)

      // Comparer planifié vs réel
      const plannedVsActual = {
        planned: allTasks.length,
        completed: completedTasks.length,
        inProgress: inProgressTasks.length,
        overdue: overdueTasks.length,
        completionRate: allTasks.length > 0
          ? Math.round((completedTasks.length / allTasks.length) * 100)
          : 0,
        onTimeRate: completedTasks.length > 0
          ? Math.round(((completedTasks.length - overdueTasks.length) / completedTasks.length) * 100)
          : 0,
      }

      setForecast({
        avgCompletionTime: Math.round(avgCompletionTime),
        estimatedRemainingTime,
        predictedSuccessRate,
        overloadedEmployees,
        plannedVsActual,
        completionTimeData,
      })
    } catch (error) {
      if (error?.message === 'Utilisateur non authentifié') {
        // Au démarrage ou après déconnexion, ne rien logguer
      } else {
        console.error('Erreur lors du chargement de la prévision:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'directrice' && user?.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <Card>
        <div className="text-center py-4 text-gray-500">Calcul de la prévision...</div>
      </Card>
    )
  }

  if (!forecast) {
    return null
  }

  return (
    <Card className="overflow-hidden border border-gray-200/70 dark:border-gray-800/60 bg-gradient-to-br from-white via-gray-50 to-slate-100 dark:from-gray-900 dark:via-gray-900/80 dark:to-slate-900 shadow-xl shadow-black/5">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Prévision & Performance
            </h3>
          </div>
          <Badge variant="info" size="sm">
            {forecast.estimatedRemainingTime.length} tâches analysées
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Succès prévu</span>
              <Badge
                variant={forecast.predictedSuccessRate >= 80 ? 'success' : forecast.predictedSuccessRate >= 60 ? 'warning' : 'danger'}
                size="sm"
              >
                {forecast.predictedSuccessRate}%
              </Badge>
            </div>
            <div className="mt-2 h-2 rounded-full bg-blue-100 dark:bg-blue-800/60 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  forecast.predictedSuccessRate >= 80 ? 'bg-green-500' :
                  forecast.predictedSuccessRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${forecast.predictedSuccessRate}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
              Basé sur les tâches en cours
            </p>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Clock size={14} className="text-purple-600 dark:text-purple-400" />
                Temps moyen
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">terminées</span>
            </div>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">
              {forecast.avgCompletionTime} j
            </p>
            <p className="text-[11px] text-gray-600 dark:text-gray-400">
              Référence de vélocité
            </p>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Target size={14} className="text-indigo-600 dark:text-indigo-400" />
                Respect des délais
              </span>
              <Badge
                variant={forecast.plannedVsActual.onTimeRate >= 80 ? 'success' : forecast.plannedVsActual.onTimeRate >= 60 ? 'warning' : 'danger'}
                size="sm"
              >
                {forecast.plannedVsActual.onTimeRate}%
              </Badge>
            </div>
            <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">
              {forecast.plannedVsActual.completionRate}% complété
            </p>
            <p className="text-[11px] text-gray-600 dark:text-gray-400">
              {forecast.plannedVsActual.completed} / {forecast.plannedVsActual.planned} tâches
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2">
              Planifié vs Réel
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Planifié</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {forecast.plannedVsActual.planned} tâches
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-green-500" />
                  Terminées
                </span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {forecast.plannedVsActual.completed} ({forecast.plannedVsActual.completionRate}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">En cours</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {forecast.plannedVsActual.inProgress}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <AlertTriangle size={12} className="text-red-500" />
                  En retard
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {forecast.plannedVsActual.overdue}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200/80 dark:border-orange-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white">Charge & Stress</span>
              <Badge variant={forecast.overloadedEmployees.length > 0 ? 'warning' : 'success'} size="sm">
                {forecast.overloadedEmployees.length > 0 ? 'Surveillance' : 'Stable'}
              </Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Employés surchargés</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  {forecast.overloadedEmployees.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Tâches à risque</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {forecast.estimatedRemainingTime.filter(e => !e.onTrack).length}
                </span>
              </div>
              {forecast.overloadedEmployees[0] && (
                <div className="pt-1 border-t border-orange-200 dark:border-orange-800">
                  <p className="text-[11px] text-gray-700 dark:text-gray-300">
                    Focus : {forecast.overloadedEmployees[0].name} (~{Math.round(forecast.overloadedEmployees[0].estimatedHours)}h / {forecast.overloadedEmployees[0].tasks.length} tâche(s))
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Employés surchargés */}
          <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800/70 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-orange-600 dark:text-orange-400" />
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                Employés surchargés ({forecast.overloadedEmployees.length})
              </h4>
            </div>
            {forecast.overloadedEmployees.length === 0 ? (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Aucun signal de surcharge.</p>
            ) : (
              <div className="space-y-2">
                {forecast.overloadedEmployees.slice(0, 4).map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                      {emp.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        {emp.tasks.length} tâche(s)
                      </span>
                      <Badge variant="danger" size="sm">
                        ~{Math.round(emp.estimatedHours)}h
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tâches à risque */}
          <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800/70 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={14} className="text-red-600 dark:text-red-400" />
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                Tâches à risque ({forecast.estimatedRemainingTime.filter(e => !e.onTrack).length})
              </h4>
            </div>
            {forecast.estimatedRemainingTime.filter(e => !e.onTrack).length === 0 ? (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Aucune tâche critique détectée.</p>
            ) : (
              <div className="space-y-1">
                {forecast.estimatedRemainingTime
                  .filter(e => !e.onTrack)
                  .slice(0, 4)
                  .map((est, idx) => (
                    <div key={idx} className="text-[11px] text-gray-700 dark:text-gray-300 flex justify-between gap-2">
                      <span className="truncate">• {est.task.title || 'Tâche'}</span>
                      <span className="text-red-600 dark:text-red-400 whitespace-nowrap">
                        ~{est.estimatedRemaining} j
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

