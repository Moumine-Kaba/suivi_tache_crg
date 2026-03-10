import { useEffect, useState } from 'react'
import { MessageSquare, Star, ThumbsUp, ThumbsDown, Send, X } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { tasksService } from '../../services/api'
import { supabase } from '../../services/supabaseClient'
import useAuthStore from '../../store/authStore'

export default function Feedback360({ taskId, onClose }) {
  const { user } = useAuthStore()
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (taskId) {
      loadFeedback()
    }
  }, [taskId])

  const loadFeedback = async () => {
    setLoading(true)
    try {
      const { data: task } = await supabase
        .from('tasks')
        .select('metadata')
        .eq('id', taskId)
        .single()

      if (task?.metadata) {
        try {
          const metadata = typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata
          setFeedback(metadata.feedback || null)
        } catch (e) {
          setFeedback(null)
        }
      } else {
        setFeedback(null)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Veuillez donner une note')
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Utilisateur non authentifié')

      const { data: currentUser } = await supabase
        .from('users')
        .select('nom, email')
        .eq('id', authUser.id)
        .single()

      const userName = currentUser?.nom || currentUser?.email?.split('@')[0] || 'Utilisateur'

      // Récupérer les métadonnées actuelles
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

      // Ajouter le feedback
      if (!metadata.feedback) {
        metadata.feedback = []
      }

      const newFeedback = {
        id: Date.now().toString(),
        userId: authUser.id,
        userName,
        rating,
        comment: comment.trim() || null,
        difficulty: difficulty || null,
        suggestions: suggestions.trim() || null,
        timestamp: new Date().toISOString(),
        role: user?.role || 'employe',
      }

      metadata.feedback.push(newFeedback)

      // Mettre à jour la tâche
      const { error } = await supabase
        .from('tasks')
        .update({
          metadata: JSON.stringify(metadata),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (error) throw error

      setFeedback(metadata.feedback)
      setRating(0)
      setComment('')
      setDifficulty('')
      setSuggestions('')
      setShowForm(false)
      alert('✅ Feedback enregistré avec succès')
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du feedback:', error)
      alert(`❌ Erreur: ${error.message || 'Impossible d\'enregistrer le feedback'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}
      />
    ))
  }

  if (loading) {
    return (
      <Card>
        <div className="text-center py-4 text-gray-500">Chargement du feedback...</div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Feedback 360°
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Formulaire de feedback */}
        {!showForm && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowForm(true)}
            className="mb-4"
          >
            <MessageSquare size={14} className="mr-2" />
            Ajouter un feedback
          </Button>
        )}

        {showForm && (
          <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Note (1-5 étoiles) *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        size={24}
                        className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Commentaire
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Votre avis sur cette tâche..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Difficulté rencontrée
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sélectionner...</option>
                  <option value="tres_facile">Très facile</option>
                  <option value="facile">Facile</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="difficile">Difficile</option>
                  <option value="tres_difficile">Très difficile</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Suggestions d'amélioration
                </label>
                <textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  placeholder="Vos suggestions pour améliorer ce type de tâche..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false)
                    setRating(0)
                    setComment('')
                    setDifficulty('')
                    setSuggestions('')
                  }}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting || rating === 0}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Envoi...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send size={14} />
                      Envoyer
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des feedbacks */}
        {feedback && feedback.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {feedback.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        {item.userName}
                      </span>
                      <Badge variant="info" size="sm">
                        {item.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {getRatingStars(item.rating)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(item.timestamp).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                
                {item.comment && (
                  <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                    {item.comment}
                  </p>
                )}
                
                {item.difficulty && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Difficulté:</span>
                    <Badge variant="warning" size="sm">
                      {item.difficulty.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
                
                {item.suggestions && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-gray-700 dark:text-gray-300">
                    <strong>💡 Suggestions:</strong> {item.suggestions}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            Aucun feedback pour cette tâche
          </div>
        )}
      </div>
    </Card>
  )
}
















