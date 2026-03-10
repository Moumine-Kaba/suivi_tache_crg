import { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, ExternalLink, AlertCircle, CheckCircle2, Info, Clock, Filter, X, ClipboardList, Send, Receipt, Trash2 } from 'lucide-react'
import useAuthStore from '../store/authStore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Link } from 'react-router-dom'
import useNotificationsStore from '../store/notificationsStore'
import { notificationsService } from '../services/api'

export default function Notifications() {
  const { user } = useAuthStore()
  const {
    notifications,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    deleteAll,
  } = useNotificationsStore()
  const [filter, setFilter] = useState('all') // all, unread, read
  const [sendingAck, setSendingAck] = useState(null) // ID de la notification en cours d'envoi
  const [deletingId, setDeletingId] = useState(null)
  const [clearing, setClearing] = useState(null) // 'read' | 'all'

  useEffect(() => {
    // Chargement via le store (avec cache)
    loadNotifications().catch((error) => {
      console.error('Erreur lors du chargement des notifications:', error)
    })
  }, [loadNotifications])

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id)
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error)
    }
  }

  const handleDelete = async (id) => {
    try {
      setDeletingId(id)
      await deleteNotification(id)
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAllRead = async () => {
    if (!window.confirm('Supprimer toutes les notifications lues ?')) return
    try {
      setClearing('read')
      await deleteAllRead()
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error)
      alert('Erreur lors du nettoyage')
    } finally {
      setClearing(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Supprimer toutes les notifications ?')) return
    try {
      setClearing('all')
      await deleteAll()
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error)
      alert('Erreur lors du nettoyage')
    } finally {
      setClearing(null)
    }
  }

  const handleSendAcknowledgment = async (notification) => {
    if (!notification.employeeId || !notification.taskId) {
      alert('❌ Informations manquantes pour envoyer l\'accusé de réception')
      return
    }

    if (!window.confirm(`Envoyer un accusé de réception à ${notification.employeeName || 'l\'employé'} ?`)) {
      return
    }

    setSendingAck(notification.id)
    try {
      await notificationsService.sendAcknowledgment(
        notification.id,
        notification.taskId,
        notification.employeeId
      )
      alert('✅ Accusé de réception envoyé avec succès !')
      // Recharger le cache des notifications après envoi
      loadNotifications({ force: true }).catch(() => {})
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'accusé de réception:', error)
      alert('❌ Erreur lors de l\'envoi: ' + (error.message || 'Une erreur est survenue'))
    } finally {
      setSendingAck(null)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const readCount = notifications.filter((n) => n.read).length

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read
    if (filter === 'read') return n.read
    return true
  })

  const getNotificationIcon = (type) => {
    const icons = {
      task: ClipboardList,
      invoice: Receipt,
      warning: AlertCircle,
      success: CheckCircle2,
      info: Info,
    }
    return icons[type] || Bell
  }

  const getNotificationColor = (type) => {
    const colors = {
      task: 'from-blue-500 to-blue-600',
      invoice: 'from-emerald-500 to-emerald-600',
      warning: 'from-yellow-500 to-orange-500',
      success: 'from-green-500 to-green-600',
      info: 'from-gray-500 to-gray-600',
    }
    return colors[type] || 'from-gray-500 to-gray-600'
  }

  const getNotificationBgColor = (type, read) => {
    if (read) {
      return 'bg-white dark:bg-gray-800'
    }
    const colors = {
      task: 'bg-blue-50 dark:bg-blue-900/10',
      warning: 'bg-yellow-50 dark:bg-yellow-900/10',
      success: 'bg-green-50 dark:bg-green-900/10',
      info: 'bg-gray-50 dark:bg-gray-800/50',
    }
    return colors[type] || 'bg-gray-50 dark:bg-gray-800/50'
  }

  return (
    <div className="space-y-4 p-4">
      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-0.5">Total</p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{notifications.length}</p>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Bell className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-0.5">Non lues</p>
              <p className="text-xl font-bold text-red-900 dark:text-red-100">{unreadCount}</p>
            </div>
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="text-red-600 dark:text-red-400" size={18} />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-0.5">Lues</p>
              <p className="text-xl font-bold text-green-900 dark:text-green-100">{readCount}</p>
            </div>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={18} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres et actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-gray-400" />
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-crg-primary text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === 'unread'
                ? 'bg-crg-primary text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Non lues ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === 'read'
                ? 'bg-crg-primary text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Lues ({readCount})
          </button>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="secondary" onClick={handleMarkAllAsRead} size="sm" className="flex items-center shadow-md">
              <CheckCheck size={15} className="mr-1.5" />
              Tout marquer comme lu
            </Button>
          )}
          {readCount > 0 && (
            <Button
              variant="outline"
              onClick={handleDeleteAllRead}
              disabled={clearing !== null}
              size="sm"
              className="flex items-center text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              {clearing === 'read' ? (
                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mr-1.5" />
              ) : (
                <Trash2 size={15} className="mr-1.5" />
              )}
              Nettoyer les lues
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              onClick={handleDeleteAll}
              disabled={clearing !== null}
              size="sm"
              className="flex items-center text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {clearing === 'all' ? (
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-1.5" />
              ) : (
                <Trash2 size={15} className="mr-1.5" />
              )}
              Tout supprimer
            </Button>
          )}
        </div>
      </div>

      {/* Liste des notifications */}
      {loading ? (
        <Card>
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-crg-primary"></div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
          </div>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <Bell size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {filter === 'unread' ? 'Aucune notification non lue' : 
               filter === 'read' ? 'Aucune notification lue' : 
               'Aucune notification'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type)
            const iconColor = getNotificationColor(notification.type)
            const bgColor = getNotificationBgColor(notification.type, notification.read)
            
            return (
              <Card
                key={notification.id}
                className={`group transition-all duration-300 hover:shadow-lg p-3 ${
                  !notification.read
                    ? 'border-l-4 border-crg-primary shadow-md'
                    : 'border-l-4 border-transparent opacity-75'
                } ${bgColor}`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Icône */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${iconColor} flex items-center justify-center text-white shadow-md`}>
                    <Icon size={16} />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h3 className={`text-sm font-bold ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-crg-primary animate-pulse"></div>
                          )}
                        </div>
                        <p className={`text-xs ${!notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400'} mb-1`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock size={10} />
                          <span>
                            {new Date(notification.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      {!notification.read && (
                        <Badge variant="primary" size="sm" className="flex-shrink-0 text-xs">
                          Nouveau
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      {notification.taskId && (
                        <Link
                          to={`/missions`}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-crg-primary/10 dark:bg-crg-primary/20 text-crg-primary dark:text-crg-secondary hover:bg-crg-primary/20 dark:hover:bg-crg-primary/30 transition-all text-xs font-medium"
                        >
                          <ExternalLink size={11} />
                          Voir la tâche
                        </Link>
                      )}
                      {(notification.invoiceId || notification.type === 'invoice') && (
                        <Link
                          to="/factures"
                          onClick={() => window.dispatchEvent(new CustomEvent('reloadFactures'))}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-crg-primary/10 dark:bg-crg-primary/20 text-crg-primary dark:text-crg-secondary hover:bg-crg-primary/20 dark:hover:bg-crg-primary/30 transition-all text-xs font-medium"
                        >
                          <ExternalLink size={11} />
                          Voir la facture
                        </Link>
                      )}
                      {/* Bouton d'accusé de réception pour la directrice/admin */}
                      {(user?.role === 'directrice' || user?.role === 'admin') && 
                       notification.type === 'task' && 
                       notification.employeeId && 
                       !notification.acknowledged && (
                        <button
                          onClick={() => handleSendAcknowledgment(notification)}
                          disabled={sendingAck === notification.id}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/30 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingAck === notification.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                              Envoi...
                            </>
                          ) : (
                            <>
                              <Send size={11} />
                              Envoyer accusé de réception
                            </>
                          )}
                        </button>
                      )}
                      {/* Badge si déjà accusé */}
                      {notification.acknowledged && (
                        <Badge variant="success" size="sm" className="flex-shrink-0 text-xs">
                          <CheckCircle2 size={10} className="mr-1" />
                          Accusé envoyé
                        </Badge>
                      )}
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-xs font-medium"
                        >
                          <Check size={11} />
                          Marquer comme lu
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        disabled={deletingId === notification.id}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-xs font-medium disabled:opacity-50"
                        title="Supprimer"
                      >
                        {deletingId === notification.id ? (
                          <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={11} />
                        )}
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

