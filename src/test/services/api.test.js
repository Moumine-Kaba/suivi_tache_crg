import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService, tasksService, usersService } from '../../services/api'
import { supabase } from '../../services/supabaseClient'

// Mock Supabase
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        single: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    rpc: vi.fn(),
  },
}))

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('devrait connecter un utilisateur avec succès', async () => {
      const mockUser = {
        id: '123',
        email: 'test@crg.gn',
      }
      const mockSession = {
        access_token: 'mock-token',
      }
      const mockUserProfile = {
        id: '123',
        email: 'test@crg.gn',
        nom: 'Test User',
        role: 'employe',
        direction: 'Direction Test',
      }

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockUserProfile,
              error: null,
            }),
          })),
        })),
      })

      const result = await authService.login('test@crg.gn', 'password123')

      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('token')
      expect(result.user.email).toBe('test@crg.gn')
      expect(result.user.role).toBe('employe')
    })

    it('devrait échouer avec des identifiants incorrects', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      await expect(authService.login('wrong@crg.gn', 'wrong')).rejects.toThrow(
        'Email ou mot de passe incorrect'
      )
    })

    it('devrait échouer si l\'email n\'est pas confirmé', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed' },
      })

      await expect(authService.login('test@crg.gn', 'password')).rejects.toThrow(
        'Votre email n\'est pas confirmé'
      )
    })
  })

  describe('getCurrentUser', () => {
    it('devrait retourner l\'utilisateur actuel', async () => {
      const mockUser = { id: '123', email: 'test@crg.gn' }
      const mockUserProfile = {
        id: '123',
        email: 'test@crg.gn',
        nom: 'Test User',
        role: 'employe',
      }

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockUserProfile,
              error: null,
            }),
          })),
        })),
      })

      const result = await authService.getCurrentUser()

      expect(result).not.toBeNull()
      expect(result.email).toBe('test@crg.gn')
    })

    it('devrait retourner null si aucun utilisateur', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user' },
      })

      const result = await authService.getCurrentUser()

      expect(result).toBeNull()
    })
  })
})

describe('tasksService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('devrait créer une tâche avec succès', async () => {
      const mockAuthUser = { id: '123' }
      const mockCurrentUser = { role: 'admin', direction: 'Direction Test' }
      const mockTask = {
        id: 'task-1',
        title: 'Nouvelle tâche',
        status: 'planifie',
        direction: 'Direction Test',
      }

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      })

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockCurrentUser,
            error: null,
          }),
        })),
      }))

      supabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return { select: selectMock }
        }
        if (table === 'tasks') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockTask,
                  error: null,
                }),
              })),
            })),
          }
        }
      })

      const taskData = {
        title: 'Nouvelle tâche',
        status: 'planifie',
        direction: 'Direction Test',
      }

      const result = await tasksService.create(taskData)

      expect(result).toHaveProperty('id')
      expect(result.title).toBe('Nouvelle tâche')
    })

    it('devrait empêcher un chef d\'assigner à un autre chef', async () => {
      const mockAuthUser = { id: 'chef-1' }
      const mockCurrentUser = { role: 'chef', direction: 'Direction Test' }
      const mockAssignedUser = { role: 'chef', direction: 'Direction Test' }

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      })

      supabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: table === 'users' && mockAssignedUser ? mockAssignedUser : mockCurrentUser,
                  error: null,
                }),
              })),
            })),
          }
        }
      })

      const taskData = {
        title: 'Tâche test',
        assignedToId: 'chef-2',
        direction: 'Direction Test',
      }

      await expect(tasksService.create(taskData)).rejects.toThrow(
        'Les chefs de service ne peuvent assigner des tâches qu\'aux employés'
      )
    })

    it('devrait empêcher un chef d\'assigner à un employé d\'une autre direction', async () => {
      const mockAuthUser = { id: 'chef-1' }
      const mockCurrentUser = { role: 'chef', direction: 'Direction A' }
      const mockAssignedUser = { role: 'employe', direction: 'Direction B' }

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      })

      let callCount = 0
      supabase.from.mockImplementation((table) => {
        if (table === 'users') {
          callCount++
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: callCount === 1 ? mockCurrentUser : mockAssignedUser,
                  error: null,
                }),
              })),
            })),
          }
        }
      })

      const taskData = {
        title: 'Tâche test',
        assignedToId: 'employe-1',
        direction: 'Direction A',
      }

      await expect(tasksService.create(taskData)).rejects.toThrow(
        'Vous ne pouvez assigner des tâches qu\'aux membres de votre service'
      )
    })
  })

  describe('getAll', () => {
    it('devrait récupérer toutes les tâches', async () => {
      const mockTasks = [
        { id: '1', title: 'Tâche 1', status: 'en_cours' },
        { id: '2', title: 'Tâche 2', status: 'termine' },
      ]

      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      })

      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: mockTasks,
            error: null,
          }),
        })),
      })

      const result = await tasksService.getAll()

      expect(result).toBeInstanceOf(Array)
    })
  })
})

describe('usersService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('devrait récupérer tous les utilisateurs pour un admin', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@crg.gn', role: 'employe' },
        { id: '2', email: 'user2@crg.gn', role: 'chef' },
      ]

      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      })

      supabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        }),
      })

      const result = await usersService.getAll()

      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
    })
  })
})













