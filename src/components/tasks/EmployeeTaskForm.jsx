import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Circle, Send, CheckCircle2, AlertCircle, TrendingUp, AlertTriangle, X, Paperclip, Download, Trash2, File } from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

export default function EmployeeTaskForm({ task, onSubmit, onSubmitToDirectrice, isSubmitting, submitError, onClose }) {
  const [showBlockageForm, setShowBlockageForm] = useState(false)
  const [blockageReason, setBlockageReason] = useState('')
  const [isReportingBlockage, setIsReportingBlockage] = useState(false)
  const [attachments, setAttachments] = useState(task.attachments || [])
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef(null)
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      status: task.status || 'planifie',
      progress: task.progress || 0,
    },
  })
  
  const watchedProgress = watch('progress')
  const watchedStatus = watch('status')
  
  // Vérifier si la tâche a un blocage
  const taskBlocked = task.blocked || task.blockage_reason || (task.metadata && typeof task.metadata === 'string' ? JSON.parse(task.metadata)?.blocked : task.metadata?.blocked)
  const taskBlockageReason = task.blockage_reason || (task.metadata && typeof task.metadata === 'string' ? JSON.parse(task.metadata)?.blockage_reason : task.metadata?.blockage_reason)
  
  // Synchroniser la progression avec le statut
  useEffect(() => {
    if ((watchedStatus === 'termine' || watchedStatus === 'en_attente_validation') && watchedProgress !== 100) {
      setValue('progress', 100)
    }
  }, [watchedStatus, watchedProgress, setValue])

  const getPriorityBadge = (priority) => {
    const variants = {
      basse: 'info',
      moyenne: 'warning',
      haute: 'danger',
    }
    return variants[priority] || 'primary'
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Message d'erreur */}
      {submitError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertCircle size={16} />
            {submitError}
          </p>
        </div>
      )}

      {/* Informations de la tâche (lecture seule) */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
            Titre de la tâche
          </label>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {task.title}
          </p>
        </div>

        {task.description && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Description
            </label>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Service
            </label>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {task.direction || '-'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Date limite
            </label>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '-'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
            Priorité
          </label>
          <Badge variant={getPriorityBadge(task.priority)} size="sm">
            {task.priority === 'haute' ? 'Haute' : task.priority === 'moyenne' ? 'Moyenne' : 'Basse'}
          </Badge>
        </div>
      </div>

      {/* Champ modifiable : Progression */}
      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700">
        <label className="block text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-purple-600 dark:text-purple-400" />
          Progression de la tâche *
        </label>
        
        {/* Slider de progression */}
        <div className="space-y-3">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            {...register('progress', { 
              required: 'La progression est requise',
              min: { value: 0, message: 'La progression doit être au moins 0%' },
              max: { value: 100, message: 'La progression ne peut pas dépasser 100%' },
              valueAsNumber: true
            })}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            style={{
              background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(147, 51, 234) ${watchedProgress || 0}%, rgb(229, 231, 235) ${watchedProgress || 0}%, rgb(229, 231, 235) 100%)`
            }}
          />
          
          {/* Affichage de la valeur */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-[50px] bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  (watchedProgress || 0) === 100 ? 'bg-green-500' :
                  (watchedProgress || 0) >= 50 ? 'bg-blue-500' : 'bg-orange-500'
                }`}
                style={{ width: `${watchedProgress || 0}%` }}
              ></div>
            </div>
            <span className="ml-3 text-sm font-bold text-purple-700 dark:text-purple-300 w-12 text-right">
              {watchedProgress || 0}%
            </span>
          </div>
          
          {/* Input numérique pour saisie précise */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              {...register('progress', { 
                required: 'La progression est requise',
                min: { value: 0, message: 'La progression doit être au moins 0%' },
                max: { value: 100, message: 'La progression ne peut pas dépasser 100%' },
                valueAsNumber: true
              })}
              className="w-20 px-3 py-2 border-2 border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium text-center"
              placeholder="0"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
          </div>
          
          {errors.progress && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.progress.message}</p>
          )}
        </div>
        
        <p className="mt-2 text-xs text-purple-700 dark:text-purple-300">
          Indiquez le pourcentage d'avancement de votre travail sur cette tâche
        </p>
      </div>

      {/* Champ modifiable : Statut */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
        <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
          <Circle size={16} className="text-blue-600 dark:text-blue-400" />
          Statut de la tâche *
        </label>
        <select
          {...register('status', { required: 'Le statut est requis' })}
          className="w-full px-4 py-3 border-2 border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
        >
          <option value="planifie">📋 Planifié</option>
          <option value="en_cours">🔄 En cours</option>
          <option value="en_attente_validation">⏳ En attente de validation</option>
          <option value="en_retard">⚠️ En retard</option>
        </select>
        <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
          Modifiez le statut pour indiquer l'avancement de votre travail
        </p>
        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
          💡 Le chef de service sera notifié à chaque changement de statut
        </p>
        <p className="mt-1 text-xs text-orange-600 dark:text-orange-400 font-medium">
          ⚠️ Si vous sélectionnez "En attente de validation", le chef de service devra valider votre travail avant que la tâche soit marquée comme terminée
        </p>
      </div>

      {/* Affichage du blocage existant */}
      {taskBlocked && taskBlockageReason && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-300 dark:border-red-700">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
                ⚠️ Tâche bloquée
              </h4>
              <p className="text-sm text-red-800 dark:text-red-200">
                {taskBlockageReason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section Signalement de blocage */}
      {!taskBlocked && task.status !== 'termine' && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-200 dark:border-orange-700">
          {!showBlockageForm ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-orange-600 dark:text-orange-400" size={18} />
                <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                  Rencontrez-vous un blocage ?
                </p>
              </div>
              <Button
                type="button"
                variant="warning"
                size="sm"
                onClick={() => setShowBlockageForm(true)}
                disabled={isSubmitting || isReportingBlockage}
              >
                Signaler un blocage
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-orange-900 dark:text-orange-100 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Signaler un blocage
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowBlockageForm(false)
                    setBlockageReason('')
                  }}
                  className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                  disabled={isReportingBlockage}
                >
                  <X size={18} />
                </button>
              </div>
              <textarea
                value={blockageReason}
                onChange={(e) => setBlockageReason(e.target.value)}
                placeholder="Décrivez le blocage rencontré (ex: manque d'informations, problème technique, dépendance externe...)"
                className="w-full px-3 py-2 border-2 border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm min-h-[80px]"
                disabled={isReportingBlockage}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowBlockageForm(false)
                    setBlockageReason('')
                  }}
                  disabled={isReportingBlockage}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="warning"
                  size="sm"
                  onClick={async () => {
                    if (!blockageReason.trim()) {
                      alert('Veuillez décrire le blocage rencontré')
                      return
                    }
                    setIsReportingBlockage(true)
                    try {
                      // Appeler la fonction de signalement de blocage
                      const { tasksService } = await import('../../services/api')
                      await tasksService.reportBlockage(task.id, blockageReason)
                      alert('✅ Blocage signalé avec succès. Le chef de service a été notifié.')
                      setShowBlockageForm(false)
                      setBlockageReason('')
                      // Recharger la tâche pour afficher le blocage
                      if (onClose) {
                        onClose()
                        // Recharger après un court délai
                        setTimeout(() => window.location.reload(), 500)
                      }
                    } catch (error) {
                      console.error('Erreur lors du signalement du blocage:', error)
                      alert(`❌ Erreur: ${error.message || 'Impossible de signaler le blocage'}`)
                    } finally {
                      setIsReportingBlockage(false)
                    }
                  }}
                  disabled={isReportingBlockage || !blockageReason.trim()}
                >
                  {isReportingBlockage ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Envoi...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Envoyer
                    </span>
                  )}
                </Button>
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                💡 Le chef de service sera automatiquement notifié de ce blocage
              </p>
            </div>
          )}
        </div>
      )}

      {/* Section Pièces jointes */}
      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-2 border-indigo-200 dark:border-indigo-700">
        <label className="block text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-3 flex items-center gap-2">
          <Paperclip size={16} className="text-indigo-600 dark:text-indigo-400" />
          Pièces jointes (Preuves)
        </label>
        
        {/* Liste des fichiers existants */}
        {attachments.length > 0 && (
          <div className="space-y-2 mb-3">
            {attachments.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-700">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File size={16} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.fileName}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({(file.fileSize / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"
                    title="Télécharger"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Supprimer "${file.fileName}" ?`)) return
                      try {
                        const { fileService } = await import('../../services/api')
                        await fileService.deleteTaskFile(task.id, file.id)
                        setAttachments(attachments.filter(f => f.id !== file.id))
                        alert('✅ Fichier supprimé avec succès')
                      } catch (error) {
                        console.error('Erreur lors de la suppression:', error)
                        alert(`❌ Erreur: ${error.message || 'Impossible de supprimer le fichier'}`)
                      }
                    }}
                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload de nouveaux fichiers */}
        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={async (e) => {
              const selectedFile = e.target.files[0]
              if (!selectedFile) return

              // Vérifier la taille (max 10MB)
              if (selectedFile.size > 10 * 1024 * 1024) {
                alert('❌ Le fichier est trop volumineux. Taille maximale: 10MB')
                return
              }

              setUploadingFile(true)
              try {
                const { fileService } = await import('../../services/api')
                const uploadedFile = await fileService.uploadTaskFile(task.id, selectedFile)
                setAttachments([...attachments, uploadedFile])
                alert('✅ Fichier uploadé avec succès')
                // Réinitialiser l'input
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              } catch (error) {
                console.error('Erreur lors de l\'upload:', error)
                alert(`❌ Erreur: ${error.message || 'Impossible d\'uploader le fichier'}`)
              } finally {
                setUploadingFile(false)
              }
            }}
            className="hidden"
            id={`file-upload-${task.id}`}
            disabled={uploadingFile || isSubmitting}
          />
          <label
            htmlFor={`file-upload-${task.id}`}
            className={`flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${
              uploadingFile || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploadingFile ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Upload en cours...</span>
              </>
            ) : (
              <>
                <Paperclip size={16} />
                <span className="text-sm font-medium">Ajouter une pièce jointe (photo, document...)</span>
              </>
            )}
          </label>
          <p className="text-xs text-indigo-700 dark:text-indigo-300">
            💡 Ajoutez des preuves de votre travail : photos, documents, captures d'écran, etc. (Max 10MB par fichier)
          </p>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        
        {/* Bouton Soumettre uniquement si le statut est "en_attente_validation" */}
        {watchedStatus === 'en_attente_validation' && onSubmitToDirectrice && (
          <Button
            type="button"
            variant="primary"
            onClick={async () => {
              // Appeler la fonction de soumission
              await onSubmitToDirectrice()
            }}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Soumission...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send size={16} />
                Soumettre au chef de service
              </span>
            )}
          </Button>
        )}
        
        {/* Bouton Enregistrer le statut */}
        <Button 
          type="submit" 
          variant="primary" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Enregistrement...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              Enregistrer
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}

