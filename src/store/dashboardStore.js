import { create } from 'zustand'
import { dashboardService } from '../services/api'

/**
 * Store global pour le Dashboard (stats + graphiques + tâches récentes)
 * Objectif : ne charger les données qu'une seule fois par session
 * et les réutiliser lors des retours sur la page.
 */

const useDashboardStore = create((set, get) => ({
  stats: null,
  charts: null,
  loading: false,
  error: null,
  hasLoaded: false,
  lastLoadedAt: null,

  /**
   * Charge les données du dashboard si nécessaire.
   * @param {{ force?: boolean }} options Si force=true, ignore le cache
   */
  loadDashboard: async (options = {}) => {
    const { force = false } = options
    const state = get()

    // Si force=true, toujours recharger, même si on vient de charger
    // Pour les employés et chefs, toujours recharger les données depuis la base
    // pour s'assurer que les statistiques sont à jour
    const shouldReload = force || !state.hasLoaded || 
      (state.lastLoadedAt && Date.now() - state.lastLoadedAt > 30000) // Recharger si > 30 secondes

    if (!shouldReload && !force) {
      return
    }

    try {
      set({ loading: true, error: null })

      let statsData, chartsData
      try {
        [statsData, chartsData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getChartData(),
        ])
      } catch (firstError) {
        // Retry une fois en cas d'erreur réseau
        const isNetwork = firstError?.message?.includes('Failed to fetch') || firstError?.name === 'TypeError'
        if (isNetwork) {
          await new Promise((r) => setTimeout(r, 2000))
          ;[statsData, chartsData] = await Promise.all([
            dashboardService.getStats(),
            dashboardService.getChartData(),
          ])
        } else {
          throw firstError
        }
      }

      set({
        stats: statsData,
        charts: chartsData,
        loading: false,
        error: null,
        hasLoaded: true,
        lastLoadedAt: Date.now(),
      })
    } catch (error) {
      // Si l'utilisateur n'est pas encore authentifié côté Supabase, ne pas considérer comme une vraie erreur
      if (error?.message === 'Utilisateur non authentifié') {
        set({ loading: false })
        return
      }

      // Erreur réseau (Failed to fetch, ERR_CONNECTION_RESET) : afficher données vides au lieu de bloquer
      const isNetworkError = error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('connection') ||
        error?.message?.includes('reset') ||
        error?.name === 'TypeError'
      if (isNetworkError) {
        set({
          stats: {
            totalMissions: 0,
            totalTasks: 0,
            tasksCompleted: 0,
            tasksOverdue: 0,
            completionRate: 0,
          },
          charts: {
            statusData: [
              { name: 'Terminé', value: 0, fill: '#10b981' },
              { name: 'En cours', value: 0, fill: '#3b82f6' },
              { name: 'Planifié', value: 0, fill: '#f59e0b' },
              { name: 'En retard', value: 0, fill: '#ef4444' },
            ],
            weeklyData: [],
          },
          loading: false,
          error: 'Connexion interrompue. Vérifiez votre réseau (Wi-Fi, VPN, pare-feu) et réessayez.',
          hasLoaded: true,
          lastLoadedAt: Date.now(),
        })
        return
      }

      console.error('❌ [dashboardStore] Erreur lors du chargement du dashboard:', error)
      set({
        loading: false,
        error: error.message || 'Erreur lors du chargement du tableau de bord',
      })
    }
  },

  /**
   * Permet de forcer un rechargement (par exemple après création/modification de tâches)
   */
  resetDashboard: () => {
    set({
      hasLoaded: false,
      stats: null,
      charts: null,
    })
  },
}))

export default useDashboardStore


