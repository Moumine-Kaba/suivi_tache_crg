import { create } from 'zustand'
import { tasksService } from '../services/api'

/**
 * Store global pour les tâches (Missions)
 * Objectif : éviter de recharger les données à chaque retour sur la page.
 * - Cache les tâches par jeu de filtres
 * - Ne relance un appel Supabase que si les filtres changent ou si on force le rechargement
 */

const isSameFilters = (a = {}, b = {}) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

const useTasksStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  hasLoaded: false,
  lastFilters: {},
  lastLoadedAt: null,

  /**
   * Charge les tâches avec mise en cache.
   * @param {Object} filters Filtres de recherche (status, priority, direction, assignedTo, search, ...)
   * @param {{ force?: boolean }} options Si force=true, ignore le cache et recharge depuis Supabase
   */
  loadTasks: async (filters = {}, options = {}) => {
    const { force = false } = options
    const state = get()

    // Si on a déjà chargé avec les mêmes filtres et qu'on ne force pas, ne rien faire
    if (
      !force &&
      state.hasLoaded &&
      isSameFilters(state.lastFilters, filters)
    ) {
      return state.tasks
    }

    try {
      set({ loading: true, error: null })

      const data = await tasksService.getAll(filters)

      set({
        tasks: data,
        loading: false,
        error: null,
        hasLoaded: true,
        lastFilters: { ...filters },
        lastLoadedAt: Date.now(),
      })

      return data
    } catch (error) {
      // Cas fréquent au démarrage: Supabase considère encore l'utilisateur comme non authentifié
      if (error?.message === 'Utilisateur non authentifié') {
        set({ loading: false })
        return []
      }

      console.error('❌ [tasksStore] Erreur lors du chargement des tâches:', error)
      set({
        loading: false,
        error: error.message || 'Erreur lors du chargement des tâches',
      })
      throw error
    }
  },

  /**
   * Invalide le cache (par exemple après une grosse modification)
   */
  resetCache: () => {
    set({
      tasks: [],
      hasLoaded: false,
      lastFilters: {},
      lastLoadedAt: null,
    })
  },
}))

export default useTasksStore


