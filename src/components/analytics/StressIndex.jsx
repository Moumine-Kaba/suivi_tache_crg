import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, TrendingUp, Users, Clock, Zap } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { tasksService } from '../../services/api'
import useAuthStore from '../../store/authStore'

export default function StressIndex() {
  const { user } = useAuthStore()
  const [stressData, setStressData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === 'directrice' || user?.role === 'admin') {
      loadStressData()
    }
  }, [user])

  const loadStressData = async () => {
    setLoading(true)
    try {
      const allTasks = await tasksService.getAll()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Calculer l'indice de stress global
      const totalTasks = allTasks.length
      const overdueTasks = allTasks.filter(t => {
        if (t.status === 'termine') return false
        if (t.dueDate) {
          const dueDate = new Date(t.dueDate)
          return dueDate < today
        }
        return false
      })
      const blockedTasks = allTasks.filter(t => {
        try {
          const metadata = t.metadata ? (typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata) : {}
          return metadata.blocked === true
        } catch (e) {
          return false
        }
      })
      const highPriorityTasks = allTasks.filter(t => t.priority === 'haute' && t.status !== 'termine')

      // Calculer le score de stress (0-100)
      let stressScore = 0
      
      // Impact des tâches en retard (40% du score)
      const overdueRate = totalTasks > 0 ? (overdueTasks.length / totalTasks) * 100 : 0
      stressScore += overdueRate * 0.4

      // Impact des tâches bloquées (30% du score)
      const blockedRate = totalTasks > 0 ? (blockedTasks.length / totalTasks) * 100 : 0
      stressScore += blockedRate * 0.3

      // Impact des tâches haute priorité (20% du score)
      const highPriorityRate = totalTasks > 0 ? (highPriorityTasks.length / totalTasks) * 100 : 0
      stressScore += highPriorityRate * 0.2

      // Impact des délais serrés (10% du score)
      const urgentDeadlines = allTasks.filter(t => {
        if (t.status === 'termine' || !t.dueDate) return false
        const dueDate = new Date(t.dueDate)
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
        return daysUntilDue <= 2 && daysUntilDue >= 0
      })
      const urgentRate = totalTasks > 0 ? (urgentDeadlines.length / totalTasks) * 100 : 0
      stressScore += urgentRate * 0.1

      stressScore = Math.min(100, Math.max(0, stressScore))

      // Déterminer le niveau de stress
      let stressLevel = 'low'
      let stressColor = 'green'
      let stressMessage = 'Niveau de stress faible. Tout va bien !'
      let recommendations = []

      if (stressScore >= 70) {
        stressLevel = 'critical'
        stressColor = 'red'
        stressMessage = 'Niveau de stress critique. Intervention urgente requise !'
        recommendations = [
          'Réévaluer les priorités et délais',
          'Redistribuer les tâches si nécessaire',
          'Résoudre immédiatement les blocages',
          'Envisager des ressources supplémentaires',
        ]
      } else if (stressScore >= 50) {
        stressLevel = 'high'
        stressColor = 'orange'
        stressMessage = 'Niveau de stress élevé. Attention requise.'
        recommendations = [
          'Surveiller les tâches en retard',
          'Prioriser la résolution des blocages',
          'Vérifier la charge de travail des équipes',
        ]
      } else if (stressScore >= 30) {
        stressLevel = 'medium'
        stressColor = 'yellow'
        stressMessage = 'Niveau de stress modéré. Surveillance recommandée.'
        recommendations = [
          'Maintenir un suivi régulier',
          'Anticiper les risques potentiels',
        ]
      } else {
        recommendations = [
          'Maintenir les bonnes pratiques',
          'Continuer le suivi régulier',
        ]
      }

      // Analyser la charge par employé
      const employeeStress = {}
      allTasks.forEach(t => {
        if (t.assignedToId && t.status !== 'termine') {
          if (!employeeStress[t.assignedToId]) {
            employeeStress[t.assignedToId] = {
              id: t.assignedToId,
              name: t.assignedTo,
              tasks: [],
              overdue: 0,
              blocked: 0,
              highPriority: 0,
              totalHours: 0,
            }
          }
          employeeStress[t.assignedToId].tasks.push(t)
          
          if (t.dueDate) {
            const dueDate = new Date(t.dueDate)
            if (dueDate < today) {
              employeeStress[t.assignedToId].overdue++
            }
          }
          
          try {
            const metadata = t.metadata ? (typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata) : {}
            if (metadata.blocked === true) {
              employeeStress[t.assignedToId].blocked++
            }
          } catch (e) {}
          
          if (t.priority === 'haute') {
            employeeStress[t.assignedToId].highPriority++
          }

          // Estimer les heures
          const baseHours = t.priority === 'haute' ? 8 : t.priority === 'moyenne' ? 4 : 2
          const remainingProgress = (100 - (t.progress || 0)) / 100
          employeeStress[t.assignedToId].totalHours += baseHours * remainingProgress
        }
      })

      // Calculer le score de stress par employé
      const employeeStressScores = Object.values(employeeStress).map(emp => {
        let empStressScore = 0
        
        // Tâches en retard (40%)
        if (emp.tasks.length > 0) {
          empStressScore += (emp.overdue / emp.tasks.length) * 100 * 0.4
        }
        
        // Tâches bloquées (30%)
        if (emp.tasks.length > 0) {
          empStressScore += (emp.blocked / emp.tasks.length) * 100 * 0.3
        }
        
        // Charge de travail (30%)
        const workloadScore = Math.min(100, (emp.totalHours / 40) * 100) // 40h = 100%
        empStressScore += workloadScore * 0.3

        return {
          ...emp,
          stressScore: Math.min(100, Math.max(0, empStressScore)),
        }
      }).sort((a, b) => b.stressScore - a.stressScore)

      // Identifier les employés en surcharge
      const overloadedEmployees = employeeStressScores.filter(emp => emp.stressScore >= 60 || emp.totalHours > 40)

      setStressData({
        globalScore: Math.round(stressScore),
        level: stressLevel,
        color: stressColor,
        message: stressMessage,
        recommendations,
        metrics: {
          totalTasks,
          overdueTasks: overdueTasks.length,
          blockedTasks: blockedTasks.length,
          highPriorityTasks: highPriorityTasks.length,
          urgentDeadlines: urgentDeadlines.length,
          overdueRate: overdueRate.toFixed(1),
          blockedRate: blockedRate.toFixed(1),
        },
        employeeStress: employeeStressScores,
        overloadedEmployees,
      })
    } catch (error) {
      if (error?.message === 'Utilisateur non authentifié') {
        // Au démarrage ou après déconnexion, ne rien logguer
      } else {
        console.error('Erreur lors du chargement de l\'indice de stress:', error)
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
        <div className="text-center py-4 text-gray-500">Calcul de l'indice de stress...</div>
      </Card>
    )
  }

  if (!stressData) {
    return null
  }

  const getBorderColor = () => {
    switch (stressData.color) {
      case 'red': return 'border-red-500'
      case 'orange': return 'border-orange-500'
      case 'yellow': return 'border-yellow-500'
      default: return 'border-green-500'
    }
  }

  return (
    <Card className={`border-l-4 ${getBorderColor()}`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className={
            stressData.color === 'red' ? 'text-red-600 dark:text-red-400' :
            stressData.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
            stressData.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
            'text-green-600 dark:text-green-400'
          } size={20} />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Indice de Stress & Surcharge
          </h3>
        </div>

        <div className="space-y-4">
          {/* Score global */}
          <div className={`p-4 rounded-lg ${
            stressData.color === 'red' ? 'bg-red-50 dark:bg-red-900/20' :
            stressData.color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20' :
            stressData.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
            'bg-green-50 dark:bg-green-900/20'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Score Global
              </span>
              <Badge
                variant={stressData.level === 'critical' ? 'danger' : stressData.level === 'high' ? 'warning' : 'info'}
                size="sm"
              >
                {stressData.globalScore}/100
              </Badge>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
              <div
                className={`h-3 rounded-full transition-all ${
                  stressData.color === 'red' ? 'bg-red-500' :
                  stressData.color === 'orange' ? 'bg-orange-500' :
                  stressData.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${stressData.globalScore}%` }}
              />
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              {stressData.message}
            </p>
          </div>

          {/* Métriques détaillées */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle size={12} className="text-red-600 dark:text-red-400" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  En retard
                </span>
              </div>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {stressData.metrics.overdueTasks}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stressData.metrics.overdueRate}% du total
              </p>
            </div>

            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Zap size={12} className="text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Bloquées
                </span>
              </div>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {stressData.metrics.blockedTasks}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stressData.metrics.blockedRate}% du total
              </p>
            </div>

            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp size={12} className="text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Haute priorité
                </span>
              </div>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {stressData.metrics.highPriorityTasks}
              </p>
            </div>

            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Clock size={12} className="text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Délais serrés
                </span>
              </div>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {stressData.metrics.urgentDeadlines}
              </p>
            </div>
          </div>

          {/* Recommandations */}
          {stressData.recommendations.length > 0 && (
            <div className={`p-3 rounded-lg ${
              stressData.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' :
              stressData.color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700' :
              stressData.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' :
              'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
            } border`}>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2">
                Recommandations
              </h4>
              <ul className="space-y-1">
                {stressData.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-400 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Employés en surcharge */}
          {stressData.overloadedEmployees.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-red-600 dark:text-red-400" />
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Employés en surcharge ({stressData.overloadedEmployees.length})
                </h4>
              </div>
              <div className="space-y-2">
                {stressData.overloadedEmployees.slice(0, 5).map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {emp.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {emp.tasks.length} tâche(s) • {emp.overdue} en retard • {emp.blocked} bloquée(s)
                      </p>
                    </div>
                    <Badge
                      variant={emp.stressScore >= 70 ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {Math.round(emp.stressScore)}%
                    </Badge>
                  </div>
                ))}
                {stressData.overloadedEmployees.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    + {stressData.overloadedEmployees.length - 5} autre(s)
                  </p>
                )}
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                💡 Envisagez une redistribution des tâches ou des pauses pour ces employés
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

