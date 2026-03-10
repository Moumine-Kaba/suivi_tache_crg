import { create } from 'zustand'
import { notificationsService } from '../services/api'

/**
 * Store global pour les notifications
 * Objectif : charger une seule fois la liste complète pour la session
 * et la réutiliser dans le Header, la page Notifications, le Mode Direction, etc.
 */

const useNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  hasLoaded: false,
  lastLoadedAt: null,

  /**
   * Charge les notifications si nécessaire.
   * @param {{ force?: boolean }} options Si force=true, ignore le cache
   */
  loadNotifications: async (options = {}) => {
    const { force = false } = options
    const state = get()

    if (!force && state.hasLoaded) {
      return state.notifications
    }

    try {
      set({ loading: true, error: null })
      const data = await notificationsService.getAll()
      const unread = data.filter((n) => !n.read).length

      set({
        notifications: data,
        unreadCount: unread,
        loading: false,
        error: null,
        hasLoaded: true,
        lastLoadedAt: Date.now(),
      })

      return data
    } catch (error) {
      const isNetwork = error?.message?.includes('Failed to fetch') || error?.name === 'TypeError'
      if (isNetwork) {
        console.warn('⚠️ [notificationsStore] Erreur réseau, notifications vides')
        set({ notifications: [], unreadCount: 0, loading: false, hasLoaded: true })
        return []
      }
      console.error('❌ [notificationsStore] Erreur lors du chargement des notifications:', error)
      set({
        loading: false,
        error: error.message || 'Erreur lors du chargement des notifications',
      })
      throw error
    }
  },

  /**
   * Marquer une notification comme lue et mettre à jour le cache
   */
  markAsRead: async (id) => {
    try {
      await notificationsService.markAsRead(id)
      const state = get()
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      const unread = updated.filter((n) => !n.read).length
      set({
        notifications: updated,
        unreadCount: unread,
      })
    } catch (error) {
      console.error('❌ [notificationsStore] Erreur lors du marquage comme lu:', error)
      throw error
    }
  },

  /**
   * Marquer toutes les notifications comme lues et mettre à jour le cache
   */
  markAllAsRead: async () => {
    try {
      await notificationsService.markAllAsRead()
      const state = get()
      const updated = state.notifications.map((n) => ({ ...n, read: true }))
      set({
        notifications: updated,
        unreadCount: 0,
      })
    } catch (error) {
      console.error('❌ [notificationsStore] Erreur lors du marquage global comme lu:', error)
      throw error
    }
  },

  /**
   * Supprimer une notification et mettre à jour le cache
   */
  deleteNotification: async (id) => {
    try {
      await notificationsService.delete(id)
      const state = get()
      const updated = state.notifications.filter((n) => n.id !== id)
      const unread = updated.filter((n) => !n.read).length
      set({
        notifications: updated,
        unreadCount: unread,
      })
    } catch (error) {
      console.error('❌ [notificationsStore] Erreur lors de la suppression:', error)
      throw error
    }
  },

  /**
   * Supprimer toutes les notifications lues
   */
  deleteAllRead: async () => {
    try {
      await notificationsService.deleteAllRead()
      const state = get()
      const updated = state.notifications.filter((n) => !n.read)
      set({
        notifications: updated,
      })
    } catch (error) {
      console.error('❌ [notificationsStore] Erreur lors de la suppression des lues:', error)
      throw error
    }
  },

  /**
   * Supprimer toutes les notifications
   */
  deleteAll: async () => {
    try {
      await notificationsService.deleteAll()
      set({
        notifications: [],
        unreadCount: 0,
      })
    } catch (error) {
      console.error('❌ [notificationsStore] Erreur lors de la suppression totale:', error)
      throw error
    }
  },

  /**
   * Réinitialiser complètement le cache si nécessaire
   */
  resetNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
      hasLoaded: false,
      lastLoadedAt: null,
      error: null,
    })
  },
}))

export default useNotificationsStore

















