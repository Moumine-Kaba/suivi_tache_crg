import { describe, it, expect, beforeEach, vi } from 'vitest'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../services/supabaseClient'

// Mock Supabase
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    // Réinitialiser le store
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  })

  describe('login', () => {
    it('devrait connecter un utilisateur et sauvegarder dans localStorage', async () => {
      const mockUser = {
        id: '123',
        email: 'test@crg.gn',
        name: 'Test User',
        role: 'employe',
      }
      const mockToken = 'mock-token-123'

      await useAuthStore.getState().login(mockUser, mockToken)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.token).toBe(mockToken)
      expect(state.isAuthenticated).toBe(true)

      // Vérifier localStorage
      const stored = localStorage.getItem('crg-auth-storage')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored)
      expect(parsed.user).toEqual(mockUser)
    })

    it('devrait mettre à jour l\'état après connexion', async () => {
      const mockUser = {
        id: '456',
        email: 'admin@crg.gn',
        name: 'Admin User',
        role: 'admin',
      }

      await useAuthStore.getState().login(mockUser, 'token-456')

      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().user?.email).toBe('admin@crg.gn')
    })
  })

  describe('logout', () => {
    it('devrait déconnecter l\'utilisateur et nettoyer le stockage', async () => {
      // D'abord connecter
      const mockUser = { id: '123', email: 'test@crg.gn', role: 'employe' }
      await useAuthStore.getState().login(mockUser, 'token')

      // Ensuite déconnecter
      supabase.auth.signOut.mockResolvedValue({ error: null })
      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)

      // Vérifier que localStorage est nettoyé
      expect(localStorage.getItem('crg-auth-storage')).toBeNull()
    })

    it('devrait appeler signOut de Supabase', async () => {
      supabase.auth.signOut.mockResolvedValue({ error: null })
      await useAuthStore.getState().logout()

      expect(supabase.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('updateUser', () => {
    it('devrait mettre à jour les informations de l\'utilisateur', async () => {
      const initialUser = {
        id: '123',
        email: 'test@crg.gn',
        name: 'Test User',
        role: 'employe',
      }

      await useAuthStore.getState().login(initialUser, 'token')

      const updates = { name: 'Updated Name', direction: 'Direction Test' }
      useAuthStore.getState().updateUser(updates)

      const state = useAuthStore.getState()
      expect(state.user.name).toBe('Updated Name')
      expect(state.user.direction).toBe('Direction Test')
      expect(state.user.email).toBe('test@crg.gn') // Non modifié
    })
  })
})













