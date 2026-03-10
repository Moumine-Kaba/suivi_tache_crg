import { useEffect, useState } from 'react'
import { Calendar, Clock, TrendingUp, BarChart3 } from 'lucide-react'
import Card from '../ui/Card'
import { tasksService } from '../../services/api'
import useAuthStore from '../../store/authStore'

export default function ProductivityHeatmap() {
  const { user } = useAuthStore()
  const [heatmapData, setHeatmapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('days') // 'days' or 'hours'

  useEffect(() => {
    if (user?.role === 'directrice' || user?.role === 'admin') {
      loadHeatmapData()
    }
  }, [user, viewMode])

  const loadHeatmapData = async () => {
    setLoading(true)
    try {
      const allTasks = await tasksService.getAll()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (viewMode === 'days') {
        // Heatmap par jour de la semaine
        const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
        const dayStats = {}
        
        daysOfWeek.forEach(day => {
          dayStats[day] = { completed: 0, created: 0, total: 0 }
        })

        allTasks.forEach(task => {
          if (task.createdAt) {
            const created = new Date(task.createdAt)
            const dayName = daysOfWeek[created.getDay()]
            if (dayStats[dayName]) {
              dayStats[dayName].created++
              dayStats[dayName].total++
            }
          }
          
          if (task.status === 'termine' && task.updatedAt) {
            const completed = new Date(task.updatedAt)
            const dayName = daysOfWeek[completed.getDay()]
            if (dayStats[dayName]) {
              dayStats[dayName].completed++
            }
          }
        })

        // Calculer le score de productivité par jour (0-100)
        const heatmap = daysOfWeek.map(day => {
          const stats = dayStats[day]
          const productivity = stats.total > 0
            ? Math.round((stats.completed / stats.total) * 100)
            : 0
          
          return {
            day,
            ...stats,
            productivity,
            intensity: productivity >= 80 ? 'high' : productivity >= 50 ? 'medium' : productivity > 0 ? 'low' : 'none',
          }
        })

        setHeatmapData({ type: 'days', data: heatmap })
      } else {
        // Heatmap par heure de la journée (basé sur les créations et complétions)
        const hourStats = {}
        
        for (let i = 0; i < 24; i++) {
          hourStats[i] = { completed: 0, created: 0, total: 0 }
        }

        allTasks.forEach(task => {
          if (task.createdAt) {
            const created = new Date(task.createdAt)
            const hour = created.getHours()
            if (hourStats[hour] !== undefined) {
              hourStats[hour].created++
              hourStats[hour].total++
            }
          }
          
          if (task.status === 'termine' && task.updatedAt) {
            const completed = new Date(task.updatedAt)
            const hour = completed.getHours()
            if (hourStats[hour] !== undefined) {
              hourStats[hour].completed++
            }
          }
        })

        // Calculer le score de productivité par heure
        const heatmap = Object.keys(hourStats).map(hour => {
          const stats = hourStats[parseInt(hour)]
          const productivity = stats.total > 0
            ? Math.round((stats.completed / stats.total) * 100)
            : 0
          
          return {
            hour: parseInt(hour),
            ...stats,
            productivity,
            intensity: productivity >= 80 ? 'high' : productivity >= 50 ? 'medium' : productivity > 0 ? 'low' : 'none',
          }
        })

        setHeatmapData({ type: 'hours', data: heatmap })
      }
    } catch (error) {
      const msg = String(error?.message || '')
      const isNetwork = /failed to fetch|network|connection|reset/i.test(msg) || error?.name === 'TypeError'
      if (isNetwork || msg === 'Utilisateur non authentifié') {
        setHeatmapData({ type: viewMode, data: [] })
      } else if (import.meta.env.DEV) {
        console.warn('Erreur heatmap:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const getIntensityColor = (intensity) => {
    switch (intensity) {
      case 'high':
        return 'bg-green-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-orange-500'
      default:
        return 'bg-gray-200 dark:bg-gray-700'
    }
  }

  const getIntensityTextColor = (intensity) => {
    switch (intensity) {
      case 'high':
        return 'text-green-700 dark:text-green-300'
      case 'medium':
        return 'text-yellow-700 dark:text-yellow-300'
      case 'low':
        return 'text-orange-700 dark:text-orange-300'
      default:
        return 'text-gray-500 dark:text-gray-400'
    }
  }

  if (user?.role !== 'directrice' && user?.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <Card>
        <div className="text-center py-4 text-gray-500">Calcul de la heatmap...</div>
      </Card>
    )
  }

  if (!heatmapData) {
    return null
  }

  return (
    <Card className="border-l-4 border-purple-500">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-purple-600 dark:text-purple-400" size={20} />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Heatmap de Productivité
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('days')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                viewMode === 'days'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Calendar size={12} className="inline mr-1" />
              Jours
            </button>
            <button
              onClick={() => setViewMode('hours')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                viewMode === 'hours'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Clock size={12} className="inline mr-1" />
              Heures
            </button>
          </div>
        </div>

        {viewMode === 'days' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-2">
              {heatmapData.data.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg text-center ${getIntensityColor(item.intensity)} transition-all hover:scale-105`}
                >
                  <div className={`text-xs font-bold ${getIntensityTextColor(item.intensity)}`}>
                    {item.day.substring(0, 3)}
                  </div>
                  <div className={`text-lg font-bold mt-1 ${getIntensityTextColor(item.intensity)}`}>
                    {item.productivity}%
                  </div>
                  <div className={`text-xs mt-1 ${getIntensityTextColor(item.intensity)}`}>
                    {item.completed}/{item.total}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span>Élevée (≥80%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span>Moyenne (50-79%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span>Faible (1-49%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700"></div>
                <span>Aucune activité</span>
              </div>
            </div>
            <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-xs text-gray-700 dark:text-gray-300">
                <TrendingUp size={12} className="inline mr-1" />
                <strong>Jour le plus productif :</strong>{' '}
                {heatmapData.data.reduce((max, item) => 
                  item.productivity > max.productivity ? item : max, 
                  heatmapData.data[0]
                )?.day}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-6 gap-2">
              {heatmapData.data.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg text-center ${getIntensityColor(item.intensity)} transition-all hover:scale-105`}
                >
                  <div className={`text-xs font-bold ${getIntensityTextColor(item.intensity)}`}>
                    {item.hour}h
                  </div>
                  <div className={`text-sm font-bold mt-1 ${getIntensityTextColor(item.intensity)}`}>
                    {item.productivity}%
                  </div>
                  <div className={`text-xs mt-1 ${getIntensityTextColor(item.intensity)}`}>
                    {item.completed}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span>Élevée</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span>Moyenne</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span>Faible</span>
              </div>
            </div>
            <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-xs text-gray-700 dark:text-gray-300">
                <TrendingUp size={12} className="inline mr-1" />
                <strong>Heure la plus productive :</strong>{' '}
                {heatmapData.data.reduce((max, item) => 
                  item.productivity > max.productivity ? item : max, 
                  heatmapData.data[0]
                )?.hour}h
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

