import { describe, it, expect, beforeEach, vi } from 'vitest'
import useTasksStore from '../../store/tasksStore'
import { tasksService } from '../../services/api'

// Mock du service
vi.mock('../../services/api', () => ({
  tasksService: {
    getAll: vi.fn(),
  },
}))

describe('tasksStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Réinitialiser le store
    useTasksStore.setState({
      tasks: [],
      loading: false,
      error: null,
      hasLoaded: false,
      lastFilters: {},
      lastLoadedAt: null,
    })
  })

  describe('loadTasks', () => {
    it('devrait charger les tâches avec succès', async () => {
      const mockTasks = [
        { id: '1', title: 'Tâche 1', status: 'en_cours' },
        { id: '2', title: 'Tâche 2', status: 'termine' },
      ]

      tasksService.getAll.mockResolvedValue(mockTasks)

      await useTasksStore.getState().loadTasks()

      const state = useTasksStore.getState()
      expect(state.tasks).toEqual(mockTasks)
      expect(state.loading).toBe(false)
      expect(state.hasLoaded).toBe(true)
      expect(state.error).toBeNull()
    })

    it('devrait mettre loading à true pendant le chargement', async () => {
      tasksService.getAll.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      const loadPromise = useTasksStore.getState().loadTasks()

      // Vérifier que loading est true pendant le chargement
      expect(useTasksStore.getState().loading).toBe(true)

      await loadPromise
      expect(useTasksStore.getState().loading).toBe(false)
    })

    it('devrait utiliser le cache si les filtres sont identiques', async () => {
      const mockTasks = [{ id: '1', title: 'Tâche 1' }]
      tasksService.getAll.mockResolvedValue(mockTasks)

      const filters = { status: 'en_cours' }

      // Premier chargement
      await useTasksStore.getState().loadTasks(filters)
      expect(tasksService.getAll).toHaveBeenCalledTimes(1)

      // Deuxième chargement avec les mêmes filtres (devrait utiliser le cache)
      await useTasksStore.getState().loadTasks(filters)
      expect(tasksService.getAll).toHaveBeenCalledTimes(1) // Pas de nouvel appel
    })

    it('devrait forcer le rechargement si force=true', async () => {
      const mockTasks = [{ id: '1', title: 'Tâche 1' }]
      tasksService.getAll.mockResolvedValue(mockTasks)

      const filters = { status: 'en_cours' }

      // Premier chargement
      await useTasksStore.getState().loadTasks(filters)
      expect(tasksService.getAll).toHaveBeenCalledTimes(1)

      // Rechargement forcé
      await useTasksStore.getState().loadTasks(filters, { force: true })
      expect(tasksService.getAll).toHaveBeenCalledTimes(2)
    })

    it('devrait gérer les erreurs correctement', async () => {
      const errorMessage = 'Erreur de chargement'
      tasksService.getAll.mockRejectedValue(new Error(errorMessage))

      await expect(useTasksStore.getState().loadTasks()).rejects.toThrow()

      const state = useTasksStore.getState()
      expect(state.loading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })

    it('devrait retourner un tableau vide si utilisateur non authentifié', async () => {
      const error = new Error('Utilisateur non authentifié')
      tasksService.getAll.mockRejectedValue(error)

      const result = await useTasksStore.getState().loadTasks()

      expect(result).toEqual([])
      expect(useTasksStore.getState().loading).toBe(false)
    })
  })

  describe('resetCache', () => {
    it('devrait réinitialiser le cache', async () => {
      const mockTasks = [{ id: '1', title: 'Tâche 1' }]
      tasksService.getAll.mockResolvedValue(mockTasks)

      // Charger des tâches
      await useTasksStore.getState().loadTasks()
      expect(useTasksStore.getState().hasLoaded).toBe(true)

      // Réinitialiser le cache
      useTasksStore.getState().resetCache()

      const state = useTasksStore.getState()
      expect(state.tasks).toEqual([])
      expect(state.hasLoaded).toBe(false)
      expect(state.lastFilters).toEqual({})
      expect(state.lastLoadedAt).toBeNull()
    })
  })
})













