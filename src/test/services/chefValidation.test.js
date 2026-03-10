import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tasksService } from '../../services/api'
import { supabase } from '../../services/supabaseClient'

// Mock Supabase
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

describe('Validation des chefs de service - Fonctionnalité critique', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Création de tâche par un chef', () => {
    it('devrait permettre à un chef d\'assigner une tâche à un employé de son service', async () => {
      const mockAuthUser = { id: 'chef-1' }
      const mockCurrentUser = { role: 'chef', direction: 'Direction Commerciale' }
      const mockAssignedUser = { 
        nom: 'Employé Test',
        role: 'employe', 
        direction: 'Direction Commerciale' 
      }
      const mockTask = {
        id: 'task-1',
        title: 'Tâche assignée',
        assigned_to_name: 'Employé Test',
      }

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
        title: 'Tâche assignée',
        assignedToId: 'employe-1',
        direction: 'Direction Commerciale',
      }

      const result = await tasksService.create(taskData)

      expect(result).toHaveProperty('id')
      expect(result.title).toBe('Tâche assignée')
    })

    it('devrait empêcher un chef d\'assigner à un autre chef', async () => {
      const mockAuthUser = { id: 'chef-1' }
      const mockCurrentUser = { role: 'chef', direction: 'Direction Commerciale' }
      const mockAssignedUser = { 
        nom: 'Autre Chef',
        role: 'chef', 
        direction: 'Direction Commerciale' 
      }

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
        assignedToId: 'chef-2',
        direction: 'Direction Commerciale',
      }

      await expect(tasksService.create(taskData)).rejects.toThrow(
        'Les chefs de service ne peuvent assigner des tâches qu\'aux employés de leur service'
      )
    })

    it('devrait empêcher un chef d\'assigner à un employé d\'une autre direction', async () => {
      const mockAuthUser = { id: 'chef-1' }
      const mockCurrentUser = { role: 'chef', direction: 'Direction Commerciale' }
      const mockAssignedUser = { 
        nom: 'Employé Autre Direction',
        role: 'employe', 
        direction: 'Direction Financière' 
      }

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
        direction: 'Direction Commerciale',
      }

      await expect(tasksService.create(taskData)).rejects.toThrow(
        'Vous ne pouvez assigner des tâches qu\'aux membres de votre service'
      )
    })

    it('devrait empêcher un chef de créer une tâche pour une autre direction', async () => {
      const mockAuthUser = { id: 'chef-1' }
      const mockCurrentUser = { role: 'chef', direction: 'Direction Commerciale' }

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      })

      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockCurrentUser,
              error: null,
            }),
          })),
        })),
      })

      const taskData = {
        title: 'Tâche test',
        direction: 'Direction Financière', // Différente de celle du chef
      }

      await expect(tasksService.create(taskData)).rejects.toThrow(
        'Vous ne pouvez créer des tâches que pour votre service'
      )
    })

    it('devrait permettre à un admin de créer des tâches sans restriction', async () => {
      const mockAuthUser = { id: 'admin-1' }
      const mockCurrentUser = { role: 'admin', direction: null }
      const mockTask = {
        id: 'task-1',
        title: 'Tâche admin',
      }

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
                  data: mockCurrentUser,
                  error: null,
                }),
              })),
            })),
          }
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
        title: 'Tâche admin',
        direction: 'Direction Test',
      }

      const result = await tasksService.create(taskData)

      expect(result).toHaveProperty('id')
      expect(result.title).toBe('Tâche admin')
    })
  })
})













