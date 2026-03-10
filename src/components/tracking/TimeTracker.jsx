import { useEffect, useState, useRef } from 'react'
import { Play, Pause, Square, Clock, TrendingUp, Lock } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { supabase } from '../../services/supabaseClient'
import useAuthStore from '../../store/authStore'

export default function TimeTracker({ taskId }) {
  const { user } = useAuthStore()
  const [isTracking, setIsTracking] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [remainingTime, setRemainingTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [totalTime, setTotalTime] = useState(0)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [taskData, setTaskData] = useState(null)
  const [assignedDate, setAssignedDate] = useState(null)
  const [dueDate, setDueDate] = useState(null)
  const [trackingStarted, setTrackingStarted] = useState(false)
  const [isOverdue, setIsOverdue] = useState(false)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)
  
  // Seule la directrice peut démarrer/arrêter le tracking
  const canControlTracking = user?.role === 'directrice' || user?.role === 'admin'

  useEffect(() => {
    if (taskId) {
      loadTimeData()
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [taskId])

  // Calculer le temps restant jusqu'à la date limite
  const calculateRemainingTime = () => {
    if (!dueDate) {
      setRemainingTime({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      setIsOverdue(false)
      return
    }

    const now = Date.now()
    const dueTime = dueDate.getTime()
    const diff = dueTime - now

    if (diff <= 0) {
      // Date limite dépassée
      setIsOverdue(true)
      const overdue = Math.abs(diff)
      const days = Math.floor(overdue / (1000 * 60 * 60 * 24))
      const hours = Math.floor((overdue % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((overdue % (1000 * 60)) / 1000)
      setRemainingTime({ days, hours, minutes, seconds })
    } else {
      // Temps restant
      setIsOverdue(false)
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setRemainingTime({ days, hours, minutes, seconds })
    }
  }

  useEffect(() => {
    if (trackingStarted && dueDate) {
      // Calculer immédiatement
      calculateRemainingTime()
      
      // Mettre à jour toutes les secondes
      intervalRef.current = setInterval(() => {
        calculateRemainingTime()
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [trackingStarted, dueDate])

  const loadTimeData = async () => {
    setLoading(true)
    try {
      const { data: task } = await supabase
        .from('tasks')
        .select('metadata, created_at, updated_at, assigned_to, due_date')
        .eq('id', taskId)
        .single()

      if (task) {
        setTaskData(task)
        
        // Récupérer la date d'assignation (quand assigned_to a été défini)
        // On utilise updated_at si assigned_to existe, sinon created_at
        const assignedDateValue = task.assigned_to ? (task.updated_at || task.created_at) : task.created_at
        if (assignedDateValue) {
          setAssignedDate(new Date(assignedDateValue))
        }
        
        // Récupérer la date limite
        if (task.due_date) {
          setDueDate(new Date(task.due_date))
        }

        if (task?.metadata) {
          try {
            const metadata = typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata
            const timeData = metadata.timeTracking || {}
            
            // Vérifier si le tracking a été démarré par la directrice
            setTrackingStarted(timeData.started === true)
            setTotalTime(timeData.totalSeconds || 0)
            setSessions(timeData.sessions || [])
            
            // Si le tracking est démarré, calculer le temps écoulé depuis l'assignation
            if (timeData.started && assignedDateValue) {
              const assignedTime = new Date(assignedDateValue).getTime()
              const now = Date.now()
              const dueTime = task.due_date ? new Date(task.due_date).getTime() : null
              
              // Calculer le temps écoulé depuis l'assignation jusqu'à maintenant (ou date limite si dépassée)
              const endTime = dueTime && now > dueTime ? dueTime : now
              const elapsed = Math.floor((endTime - assignedTime) / 1000)
              
              setElapsedTime(elapsed)
              setIsTracking(true)
              startTimeRef.current = assignedTime
            }
          } catch (e) {
            console.error('Erreur lors du parsing des métadonnées:', e)
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de temps:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatRemainingTime = (time) => {
    const parts = []
    if (time.days > 0) parts.push(`${time.days} jour${time.days > 1 ? 's' : ''}`)
    if (time.hours > 0) parts.push(`${time.hours} heure${time.hours > 1 ? 's' : ''}`)
    if (time.minutes > 0) parts.push(`${time.minutes} minute${time.minutes > 1 ? 's' : ''}`)
    if (time.seconds >= 0) parts.push(`${time.seconds} seconde${time.seconds > 1 ? 's' : ''}`)
    
    if (parts.length === 0) return '0 seconde'
    return parts.join(', ')
  }

  const startTracking = async () => {
    if (!canControlTracking) {
      alert('❌ Seule la directrice peut démarrer le tracking du temps.')
      return
    }

    if (!assignedDate) {
      alert('❌ Impossible de démarrer le tracking : la tâche n\'a pas encore été assignée.')
      return
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Utilisateur non authentifié')

      // Le tracking commence à partir de la date d'assignation
      startTimeRef.current = assignedDate.getTime()
      setIsTracking(true)
      setElapsedTime(0)

      // Sauvegarder dans les métadonnées que le tracking a été démarré
      const { data: task } = await supabase
        .from('tasks')
        .select('metadata')
        .eq('id', taskId)
        .single()

      let metadata = {}
      try {
        metadata = task?.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
      } catch (e) {
        metadata = {}
      }

      if (!metadata.timeTracking) {
        metadata.timeTracking = { totalSeconds: 0, sessions: [] }
      }

      // Marquer que le tracking a été démarré par la directrice
      metadata.timeTracking.started = true
      metadata.timeTracking.startedBy = authUser.id
      metadata.timeTracking.startedAt = new Date().toISOString()
      metadata.timeTracking.assignedDate = assignedDate.toISOString()
      if (dueDate) {
        metadata.timeTracking.dueDate = dueDate.toISOString()
      }

      await supabase
        .from('tasks')
        .update({
          metadata: JSON.stringify(metadata),
        })
        .eq('id', taskId)

      setTrackingStarted(true)
      await loadTimeData()
    } catch (error) {
      console.error('Erreur lors du démarrage du tracking:', error)
      alert(`❌ Erreur: ${error.message || 'Impossible de démarrer le tracking'}`)
    }
  }

  const pauseTracking = async () => {
    if (!canControlTracking) {
      alert('❌ Seule la directrice peut arrêter le tracking du temps.')
      return
    }

    try {
      if (!startTimeRef.current) return

      const now = Date.now()
      const dueTime = dueDate ? dueDate.getTime() : null
      const endTime = dueTime && now > dueTime ? dueTime : now
      const elapsed = Math.floor((endTime - startTimeRef.current) / 1000)
      const newTotalTime = totalTime + elapsed

      // Récupérer les métadonnées
      const { data: task } = await supabase
        .from('tasks')
        .select('metadata')
        .eq('id', taskId)
        .single()

      let metadata = {}
      try {
        metadata = task?.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
      } catch (e) {
        metadata = {}
      }

      if (!metadata.timeTracking) {
        metadata.timeTracking = { totalSeconds: 0, sessions: [] }
      }

      // Ajouter la session complète (de l'assignation jusqu'à maintenant ou date limite)
      if (assignedDate) {
        metadata.timeTracking.sessions.push({
          id: Date.now().toString(),
          startTime: assignedDate.toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration: elapsed,
        })
      }

      // Mettre à jour le temps total
      metadata.timeTracking.totalSeconds = newTotalTime
      metadata.timeTracking.started = false
      metadata.timeTracking.stoppedAt = new Date().toISOString()

      await supabase
        .from('tasks')
        .update({
          metadata: JSON.stringify(metadata),
        })
        .eq('id', taskId)

      setTotalTime(newTotalTime)
      setElapsedTime(0)
      setIsTracking(false)
      setTrackingStarted(false)
      startTimeRef.current = null
      await loadTimeData()
    } catch (error) {
      console.error('Erreur lors de l\'arrêt:', error)
      alert(`❌ Erreur: ${error.message || 'Impossible d\'arrêter le tracking'}`)
    }
  }

  const stopTracking = async () => {
    await pauseTracking()
  }

  if (loading) {
    return (
      <Card>
        <div className="text-center py-4 text-gray-500">Chargement...</div>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
          <Clock className="text-white" size={22} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Suivi du Temps Intelligent
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Compte à rebours jusqu'à la date limite
          </p>
        </div>
      </div>

      {/* Informations sur le tracking */}
      {assignedDate && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Assignée le</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {assignedDate.toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          {dueDate && (
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Date limite</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {dueDate.toLocaleDateString('fr-FR', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Compte à rebours principal */}
      {dueDate ? (
        <div className={`relative overflow-hidden rounded-2xl p-6 border-2 transition-all ${
          isOverdue 
            ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-400 dark:border-red-600' 
            : trackingStarted
            ? remainingTime.days <= 1
              ? 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-400 dark:border-orange-600'
              : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-400 dark:border-green-600'
            : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-300 dark:border-gray-600'
        }`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 dark:bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
          <div className="relative text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              {isOverdue ? (
                <span className="text-2xl">⚠️</span>
              ) : trackingStarted ? (
                <span className="text-2xl">⏱️</span>
              ) : (
                <span className="text-2xl">⏸️</span>
              )}
              <p className={`text-sm font-semibold ${
                isOverdue 
                  ? 'text-red-700 dark:text-red-300' 
                  : trackingStarted
                  ? remainingTime.days <= 1
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-green-700 dark:text-green-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {isOverdue ? 'Délai dépassé de' : trackingStarted ? 'Temps restant' : 'En attente de démarrage'}
              </p>
            </div>
            {trackingStarted ? (
              <div className="space-y-2">
                <p className={`text-4xl font-extrabold mb-2 ${
                  isOverdue 
                    ? 'text-red-600 dark:text-red-400' 
                    : remainingTime.days <= 1 
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {formatRemainingTime(remainingTime)}
                </p>
                <div className="flex items-center justify-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{remainingTime.days}</span>
                    <span>j</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{remainingTime.hours.toString().padStart(2, '0')}</span>
                    <span>h</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{remainingTime.minutes.toString().padStart(2, '0')}</span>
                    <span>m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{remainingTime.seconds.toString().padStart(2, '0')}</span>
                    <span>s</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-base text-gray-600 dark:text-gray-400">
                La directrice doit démarrer le tracking
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Aucune date limite définie
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Le compte à rebours nécessite une date limite
          </p>
        </div>
      )}

      {/* Contrôles */}
      {canControlTracking ? (
        <div className="flex gap-3">
          {!trackingStarted ? (
            <Button
              variant="primary"
              size="md"
              onClick={startTracking}
              className="flex-1 shadow-lg hover:shadow-xl transition-all"
              disabled={!assignedDate}
            >
              <Play size={16} className="mr-2" />
              Démarrer le tracking
            </Button>
          ) : (
            <Button
              variant="danger"
              size="md"
              onClick={stopTracking}
              className="flex-1 shadow-lg hover:shadow-xl transition-all"
            >
              <Square size={16} className="mr-2" />
              Arrêter le tracking
            </Button>
          )}
        </div>
      ) : (
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-center border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Lock size={16} />
            <span>Lecture seule - Seule la directrice peut démarrer/arrêter</span>
          </div>
        </div>
      )}

      {/* Sessions récentes */}
      {sessions.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Historique des sessions
            </h4>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {sessions.slice(-5).reverse().map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {new Date(session.startTime).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <Badge variant="info" size="sm" className="font-mono">
                  {formatTime(session.duration)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}





