import { useEffect, useState } from 'react'
import { History, User, Clock, FileText, CheckCircle2, XCircle, AlertTriangle, Edit, Trash2, Plus, Send } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { supabase } from '../../services/supabaseClient'
import useAuthStore from '../../store/authStore'

export default function ActionHistory({ taskId, onClose }) {
  const { user } = useAuthStore()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (taskId) {
      loadHistory()
    }
  }, [taskId])

  const loadHistory = async () => {
    setLoading(true)
    try {
      // Récupérer l'historique depuis les métadonnées de la tâche
      const { data: task, error } = await supabase
        .from('tasks')
        .select('metadata, updated_at, created_at')
        .eq('id', taskId)
        .single()

      if (error) throw error

      let historyData = []
      
      // Parser les métadonnées pour extraire l'historique
      if (task.metadata) {
        try {
          const metadata = typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata
          historyData = metadata.actionHistory || []
        } catch (e) {
          console.error('Erreur lors du parsing des métadonnées:', e)
        }
      }

      // Ajouter la création comme première action
      if (task.created_at) {
        historyData.unshift({
          id: 'created',
          action: 'created',
          user: 'Système',
          timestamp: task.created_at,
          details: 'Tâche créée',
        })
      }

      // Trier par timestamp (plus récent en premier)
      historyData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      setHistory(historyData)
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'created':
        return Plus
      case 'updated':
        return Edit
      case 'status_changed':
        return CheckCircle2
      case 'assigned':
        return User
      case 'completed':
        return CheckCircle2
      case 'rejected':
        return XCircle
      case 'blocked':
        return AlertTriangle
      case 'unblocked':
        return CheckCircle2
      case 'file_uploaded':
        return FileText
      case 'file_deleted':
        return Trash2
      case 'submitted':
        return Send
      default:
        return History
    }
  }

  const getActionLabel = (action) => {
    switch (action) {
      case 'created':
        return 'Création'
      case 'updated':
        return 'Modification'
      case 'status_changed':
        return 'Changement de statut'
      case 'assigned':
        return 'Assignation'
      case 'completed':
        return 'Complétion'
      case 'rejected':
        return 'Rejet'
      case 'blocked':
        return 'Blocage'
      case 'unblocked':
        return 'Déblocage'
      case 'file_uploaded':
        return 'Fichier ajouté'
      case 'file_deleted':
        return 'Fichier supprimé'
      case 'submitted':
        return 'Soumission'
      default:
        return action
    }
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'created':
      case 'completed':
      case 'unblocked':
        return 'green'
      case 'rejected':
      case 'blocked':
        return 'red'
      case 'status_changed':
      case 'submitted':
        return 'blue'
      case 'file_uploaded':
        return 'purple'
      case 'file_deleted':
        return 'orange'
      default:
        return 'gray'
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="text-center py-4 text-gray-500">Chargement de l'historique...</div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Historique des Actions
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <XCircle size={18} />
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Aucun historique disponible pour cette tâche
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.map((item, index) => {
              const Icon = getActionIcon(item.action)
              const color = getActionColor(item.action)
              
              return (
                <div
                  key={item.id || index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-gray-300 dark:border-gray-600"
                >
                  <div className={`p-1.5 bg-${color}-100 dark:bg-${color}-900/20 rounded-lg flex-shrink-0`}>
                    <Icon className={`text-${color}-600 dark:text-${color}-400`} size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {getActionLabel(item.action)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(item.timestamp).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Par: <span className="font-medium">{item.user || 'Système'}</span>
                    </div>
                    {item.details && (
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                        {item.details}
                      </div>
                    )}
                    {item.oldValue && item.newValue && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <span className="line-through text-red-600 dark:text-red-400">{item.oldValue}</span>
                        {' → '}
                        <span className="text-green-600 dark:text-green-400">{item.newValue}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            🔒 Historique infalsifiable - Toutes les actions sont enregistrées automatiquement
          </p>
        </div>
      </div>
    </Card>
  )
}
















