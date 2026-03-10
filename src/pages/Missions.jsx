import { useEffect, useState, useMemo } from 'react'
import { Search, Plus, Edit, Trash2, Filter, X, Calendar, User, Building2, TrendingUp, Clock, CheckCircle2, AlertCircle, Circle, ClipboardList, Users, Send, AlertTriangle, CheckCircle, Paperclip, Download, File, Archive } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { tasksService, usersService } from '../services/api'
import useTasksStore from '../store/tasksStore'
import { supabase } from '../services/supabaseClient'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { useForm } from 'react-hook-form'
import EmployeeTaskForm from '../components/tasks/EmployeeTaskForm'
import Feedback360 from '../components/feedback/Feedback360'
import TimeTracker from '../components/tracking/TimeTracker'
import ActionHistory from '../components/audit/ActionHistory'
import { DSI_SERVICES, COMPTA_SERVICES, DIRECTIONS } from '../constants/directions'
import { directionsService } from '../services/api'

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'planifie', label: 'Planifié' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'en_attente_validation', label: 'En attente de validation' },
  { value: 'termine', label: 'Terminé' },
  { value: 'en_retard', label: 'En retard' },
]

const priorityOptions = [
  { value: '', label: 'Toutes les priorités' },
  { value: 'basse', label: 'Basse' },
  { value: 'moyenne', label: 'Moyenne' },
  { value: 'haute', label: 'Haute' },
]

const defaultDirectionOptions = [
  { value: '', label: 'Tous les services' },
  { value: 'DSI', label: 'DSI (tous les services)' },
  ...DSI_SERVICES,
  ...COMPTA_SERVICES,
]

export default function Missions() {
  const { user } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    tasks,
    loading,
    loadTasks,
  } = useTasksStore()
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [selectedDirection, setSelectedDirection] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [availableEmployees, setAvailableEmployees] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    direction: '',
    assignedTo: '',
    myTasks: false, // Filtre "Mes tâches" pour la directrice
  })
  const [directionOptions, setDirectionOptions] = useState(defaultDirectionOptions)
  const [directions, setDirections] = useState([])

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm()

  useEffect(() => {
    directionsService.getAll().then(dirs => {
      setDirections(dirs)
      const opts = [{ value: '', label: 'Tous les services' }]
      dirs.forEach(d => {
        opts.push({ value: d.name, label: `${d.label} (tous)` })
        ;(d.services || []).forEach(s => opts.push({ value: s.name, label: s.label }))
      })
      if (opts.length > 1) setDirectionOptions(opts)
    }).catch(() => {})
  }, [])
  const watchedDirection = watch('direction')
  const watchedAssignmentType = watch('assignmentType')

  // Charger les tâches une seule fois (liste globale) et utiliser les filtres côté front
  useEffect(() => {
    if (!user) return
    loadTasks({}).catch(() => {
      // erreur déjà gérée dans le store
    })
  }, [user, loadTasks])

  // Charger tous les utilisateurs pour la sélection
  useEffect(() => {
    loadAllUsers()
  }, [])

  // Filtrer les employés selon la direction sélectionnée
  useEffect(() => {
    if (watchedDirection) {
      setSelectedDirection(watchedDirection)
      setSelectedService('')
      // Ne réinitialiser assignedToId que si on n'est pas en mode édition
      if (!editingTask) {
        setValue('assignedToId', '')
      }
      filterEmployeesByDirection(watchedDirection)
    } else {
      setSelectedDirection('')
      setSelectedService('')
      setAvailableEmployees([])
    }
  }, [watchedDirection, setValue, editingTask])

  const loadAllUsers = async () => {
    try {
      console.log('👥 Chargement des utilisateurs pour la sélection...')
      console.log('👤 Utilisateur connecté:', user?.role, '- Direction:', user?.direction)
      let users = []
      
      // Pour les employés, ne pas essayer d'utiliser usersService.getAll()
      if (user?.role === 'employe') {
        console.log('ℹ️ Employé détecté, chargement direct via Supabase pour sa direction uniquement')
      } else {
        try {
          users = await usersService.getAll()
          console.log('✅ Utilisateurs chargés via usersService:', users.length)
          console.log('📋 Détails des utilisateurs:', users.map(u => ({
            nom: u.name || u.nom,
            direction: u.direction,
            role: u.role
          })))
        } catch (serviceError) {
          // Ne pas afficher d'erreur si c'est juste une restriction de rôle
          if (serviceError.message?.includes('Accès non autorisé') && user?.role === 'employe') {
            console.log('ℹ️ Accès restreint pour employé, utilisation du fallback Supabase')
          } else {
            console.warn('⚠️ Erreur lors du chargement via usersService:', serviceError)
          }
        }
      }
      
      // Si usersService.getAll() a échoué ou si c'est un employé, utiliser Supabase directement
      if (users.length === 0) {
        // Si le service échoue (par exemple si pas admin), on essaie directement avec Supabase
        const { supabase } = await import('../services/supabaseClient')
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (authUser) {
          // Pour admin/directrice, récupérer TOUS les utilisateurs
          if (user?.role === 'admin' || user?.role === 'directrice') {
            console.log('🔍 Récupération de TOUS les utilisateurs (admin/directrice)...')
            const { data: allUsersData, error: allError } = await supabase
              .from('users')
              .select('id, nom, email, role, direction, fonction')
            
            if (!allError && allUsersData) {
              users = allUsersData.map(u => ({
                id: u.id,
                name: u.nom,
                email: u.email,
                role: u.role,
                direction: u.direction,
                fonction: u.fonction,
              }))
              console.log('✅ Tous les utilisateurs chargés via Supabase:', users.length)
              console.log('📋 Directions uniques:', [...new Set(users.map(u => u.direction).filter(Boolean))])
            } else if (allError) {
              console.error('❌ Erreur lors du chargement de tous les utilisateurs:', allError)
            }
          } else {
            // Récupérer les utilisateurs de la direction (direction = ensemble de services)
            let dirServices = []
            try {
              const structure = await directionsService.getStructure()
              dirServices = structure[user?.direction]?.services || []
            } catch {
              dirServices = DIRECTIONS.DSI?.services || []
            }
            const isDirWithServices = user?.direction && dirServices.length
            let query = supabase.from('users').select('id, nom, email, role, direction, fonction')
            if (isDirWithServices) {
              query = query.in('direction', dirServices)
            } else {
              query = query.eq('direction', user?.direction || '')
            }
            const { data: directUsers, error: directError } = await query
            
            if (!directError && directUsers) {
              users = directUsers.map(u => ({
                id: u.id,
                name: u.nom,
                email: u.email,
                role: u.role,
                direction: u.direction,
                fonction: u.fonction,
              }))
              console.log('✅ Utilisateurs chargés via Supabase direct:', users.length)
            }
          }
        }
      }
      
      // Filtrer selon le rôle si nécessaire
      if (user?.role !== 'admin' && user?.role !== 'directrice') {
        const filtered = users.filter(u => u.direction === user?.direction)
        setAllUsers(filtered)
        console.log('✅ Utilisateurs filtrés par direction:', filtered.length)
      } else {
        setAllUsers(users)
        console.log('✅ Tous les utilisateurs chargés (admin/directrice):', users.length)
        console.log('📋 Directions uniques trouvées:', [...new Set(users.map(u => u.direction).filter(Boolean))])
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des utilisateurs:', error)
      // Ne pas bloquer l'application si le chargement échoue
      setAllUsers([])
    }
  }

  const filterEmployeesByDirection = (direction) => {
    if (!direction) {
      setAvailableEmployees([])
      return
    }
    
    console.log('🔍 Filtrage des employés pour la direction:', direction)
    console.log('👥 Tous les utilisateurs chargés:', allUsers.length)
    console.log('📋 Directions disponibles dans allUsers:', [...new Set(allUsers.map(u => u.direction))])
    console.log('👤 Utilisateur connecté - Rôle:', user?.role, '- Direction:', user?.direction)
    
    // Si direction = nom de direction (ex: DSI), inclure les employés de tous ses services
    let dirServices = []
    const dirMatch = directions.find(d => d.name === direction)
    if (dirMatch?.services?.length) {
      dirServices = dirMatch.services.map(s => s.name)
    }
    const matchesDirection = (uDir) => {
      if (dirServices.length) return dirServices.includes(uDir)
      return uDir === direction
    }

    // Si l'utilisateur est un chef, il ne peut assigner qu'aux employés de sa direction
    // Si l'utilisateur est admin/directrice, il peut assigner à tous les employés et chefs de la direction
    // La directrice peut aussi s'assigner des tâches à elle-même
    const employees = allUsers.filter(u => {
      const dirMatch = matchesDirection(u.direction)
      
      // Les chefs ne peuvent assigner qu'aux employés (pas aux autres chefs)
      if (user?.role === 'chef') {
        const matchesRole = u.role === 'employe'
        if (dirMatch && matchesRole) {
          console.log('✅ Employé trouvé (chef assigne uniquement aux employés):', u.nom || u.name, '- Direction:', u.direction, '- Rôle:', u.role)
        }
        return dirMatch && matchesRole
      } else if (user?.role === 'directrice' || user?.role === 'admin') {
        // Directrice/Admin peuvent assigner aux employés, chefs (et directrice à elle-même)
        const isDirectriceHerself = u.id === user?.id && u.role === 'directrice'
        const matchesRole = u.role === 'employe' || u.role === 'chef' || isDirectriceHerself
        
        if (isDirectriceHerself && (direction === user?.direction || (direction === 'DSI' && user?.direction === 'DSI'))) {
          console.log('✅ Directrice elle-même trouvée:', u.nom || u.name, '- Direction:', u.direction, '- Rôle:', u.role)
          return true
        }
        
        if (dirMatch && matchesRole) {
          console.log('✅ Employé trouvé:', u.nom || u.name, '- Direction:', u.direction, '- Rôle:', u.role)
        }
        return dirMatch && matchesRole
      } else {
        return false
      }
    })
    
    // Si la directrice sélectionne sa propre direction et qu'elle n'est pas dans la liste, l'ajouter
    if (user?.role === 'directrice' && (direction === user?.direction || (direction === 'DSI' && user?.direction === 'DSI'))) {
      const directriceInList = employees.find(e => e.id === user?.id)
      if (!directriceInList) {
        // Ajouter la directrice elle-même à la liste
        employees.push({
          id: user.id,
          name: user.nom || user.name,
          email: user.email,
          role: 'directrice',
          direction: user.direction,
          fonction: user.fonction
        })
        console.log('✅ Directrice ajoutée à la liste des employés disponibles pour s\'auto-assigner')
      }
    }
    
    console.log('✅ Employés filtrés pour', direction, ':', employees.length)
    if (employees.length === 0) {
      console.warn('⚠️ Aucun employé trouvé pour la direction:', direction)
      console.log('💡 Directions disponibles:', [...new Set(allUsers.map(u => u.direction).filter(Boolean))])
    }
    
    setAvailableEmployees(employees)
  }

  const handleCreate = () => {
    setEditingTask(null)
    setSelectedDirection('')
    setSelectedService('')
    setAvailableEmployees([])
    setSubmitError(null)
    setIsSubmitting(false)
    reset({
      direction: '',
      assignmentType: 'service',
      assignedToId: '',
      title: '',
      description: '',
      status: 'planifie',
      progress: 0,
      priority: 'moyenne',
      dueDate: '',
    })
    setShowModal(true)
  }

  const handleEdit = (task) => {
    setEditingTask(task)
    setSelectedDirection(task.direction || '')
    setValue('assignedToId', task.assignedToId || '')
    setValue('assignmentType', task.assignedToId ? 'individuel' : 'service')
    
    // Filtrer les employés selon la direction de la tâche
    if (task.direction) {
      filterEmployeesByDirection(task.direction)
    }
    
    reset({
      ...task,
      assignedToId: task.assignedToId || '',
    })
    setShowModal(true)
  }

  // Plus besoin de handleShowDetails - toutes les infos sont dans les cartes

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      try {
        await tasksService.delete(id)
        // Recharger les tâches depuis le store (force pour refléter la suppression)
        await loadTasks({}, { force: true })
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
      }
    }
  }

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      console.log('📝 Données du formulaire:', data)
      
      // Si l'utilisateur ne peut modifier que le statut, ne garder que le statut
      if (editingTask && canOnlyEditStatus(editingTask)) {
        // Ne mettre à jour que le statut, conserver toutes les autres données
        data = {
          ...editingTask,
          status: data.status,
        }
        console.log('📝 Mode modification limitée (statut uniquement)')
      }
      
      // Gestion du type d'affectation
      if (data.assignmentType === 'individuel') {
        if (!data.assignedToId) {
          throw new Error('Sélectionnez un employé pour une affectation individuelle.')
        }
      } else {
        // Tâche de service : pas d'assignation individuelle
        data.assignedToId = null
      }

      console.log('💾 Création/mise à jour de la tâche...')
      
      if (editingTask) {
        await tasksService.update(editingTask.id, data)
        console.log('✅ Tâche mise à jour avec succès')
      } else {
        await tasksService.create(data)
        console.log('✅ Tâche créée avec succès')
      }
      
      setShowModal(false)
      reset()
      setSelectedDirection('')
      setSelectedService('')
      setAvailableEmployees([])
      // Recharger les tâches après création / mise à jour
      await loadTasks({}, { force: true })
      // Si la tâche est terminée, rediriger vers les archives
      if (data.status === 'termine') {
        navigate('/archives')
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error)
      setSubmitError(error.message || 'Une erreur est survenue lors de la sauvegarde de la tâche')
      // Ne pas fermer le modal en cas d'erreur pour que l'utilisateur puisse corriger
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Soumettre la tâche pour validation
  const handleSubmitTask = async (task) => {
    // Déterminer qui valide selon le rôle de l'utilisateur
    const validator = user?.role === 'chef' ? 'la directrice' : 'le chef de service'
    if (!window.confirm(`Soumettre la tâche "${task.title}" pour validation ?\n\nCette action notifiera ${validator} que la tâche est terminée et en attente de validation.`)) {
      return
    }
    
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      // Mettre le statut à "en_attente_validation" pour que le chef ou la directrice puisse valider
      const updateData = {
        ...task,
        status: 'en_attente_validation',
      }
      
      await tasksService.update(task.id, updateData)
      
      // Notifier selon le rôle de l'utilisateur
      let notificationSent = false
      let notificationError = null
      
      try {
        // Si c'est un employé, notifier le chef de service
        if (user?.role === 'employe') {
          // Trouver le chef de service de la direction
          const chef = allUsers.find(u => u.role === 'chef' && u.direction === user?.direction)
          if (chef) {
            // Créer une notification pour le chef
            const notificationData = {
              user_id: chef.id,
              title: '📋 Tâche en attente de validation',
              message: `${user.nom || user.email} a terminé la tâche "${task.title}" et attend votre validation`,
              type: 'info',
              task_id: task.id,
              read: false,
            }
            
            const { error: notifError } = await supabase
              .from('notifications')
              .insert(notificationData)
            
            if (!notifError) {
              notificationSent = true
              console.log('✅ Tâche soumise au chef de service avec succès')
            } else {
              console.warn('⚠️ Erreur lors de la notification au chef:', notifError)
            }
          }
        } 
        // Si c'est un chef, notifier la directrice
        else if (user?.role === 'chef') {
          const notification = await tasksService.notifyDirectrice(
            task.id, 
            task.title, 
            user.nom || user.email,
            'en_attente_validation' // Statut après mise à jour
          )
          if (notification) {
            notificationSent = true
            console.log('✅ Tâche soumise à la directrice avec succès')
          } else {
            console.warn('⚠️ Notification non créée (null retourné)')
          }
        }
      } catch (notifError) {
        console.error('⚠️ Erreur lors de la notification:', notifError)
        notificationError = notifError
        if (notifError.message && notifError.message.includes('vous notifier vous-même')) {
          console.warn('ℹ️ La directrice ne peut pas se notifier elle-même')
        } else if (notifError.message && notifError.message.includes('ERREUR RLS')) {
          console.error('❌ ERREUR RLS DÉTECTÉE - Le script SQL doit être exécuté!')
        }
      }
      
      // Recharger les tâches après soumission
      await loadTasks({}, { force: true })
      
      // Fermer le modal
      setShowModal(false)
      reset()
      setSubmitError(null)
      
      // Afficher un message de succès ou d'erreur
      if (notificationSent) {
        const notificationTarget = user?.role === 'employe' ? 'Le chef de service' : 'La directrice'
        alert(`✅ Tâche soumise avec succès ! ${notificationTarget} a été notifié${user?.role === 'employe' ? '' : 'e'}.`)
      } else if (notificationError) {
        if (notificationError.message && notificationError.message.includes('ERREUR RLS')) {
          alert('⚠️ ERREUR DE CONFIGURATION\n\n' +
                'Les politiques de sécurité (RLS) ne sont pas correctement configurées.\n\n' +
                'ACTION REQUISE:\n' +
                '1. Ouvrez Supabase Dashboard → SQL Editor\n' +
                '2. Exécutez le script: URGENT_FIX_RLS_NOTIFICATIONS.sql\n' +
                '3. Rafraîchissez cette page et réessayez\n\n' +
                'La tâche a été mise à jour, mais la notification n\'a pas pu être envoyée.')
        } else if (notificationError.message && notificationError.message.includes('vous notifier vous-même')) {
          alert('✅ Tâche soumise avec succès !\n\nℹ️ Note: Vous êtes la directrice, donc aucune notification n\'a été envoyée.')
        } else {
          alert('✅ Tâche soumise avec succès !\n\n⚠️ La notification n\'a pas pu être envoyée: ' + (notificationError.message || 'Erreur inconnue'))
        }
      } else {
        alert('✅ Tâche soumise avec succès !\n\nℹ️ Note: Aucune notification n\'a été envoyée.')
      }
    } catch (error) {
      console.error('❌ Erreur lors de la soumission:', error)
      setSubmitError(error.message || 'Une erreur est survenue lors de la soumission de la tâche')
      alert('❌ Erreur lors de la soumission: ' + (error.message || 'Une erreur est survenue'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Archiver rapidement une tâche terminée (pour la directrice)
  const handleArchiveTask = async (task) => {
    if (!window.confirm(`Archiver la tâche "${task.title}" ?\n\nElle sera déplacée vers les archives.`)) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // S'assurer que le statut est bien "termine" pour l'archivage côté service
      await tasksService.update(task.id, { status: 'termine', progress: 100 })

      // Rafraîchir les tâches actives puis rediriger vers les archives
      await loadTasks({}, { force: true })
      alert('✅ Tâche archivée avec succès ! Elle est déplacée dans les Archives.')
      navigate('/archives')
    } catch (error) {
      console.error('❌ Erreur lors de l’archivage:', error)
      setSubmitError(error.message || 'Impossible d’archiver la tâche')
      alert('❌ Impossible d’archiver la tâche: ' + (error.message || 'Erreur inconnue'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const getStatusBadge = (status) => {
    const variants = {
      planifie: 'info',
      en_cours: 'primary',
      en_attente_validation: 'warning',
      termine: 'success',
      en_retard: 'danger',
    }
    return variants[status] || 'primary'
  }

  const getPriorityBadge = (priority) => {
    const variants = {
      basse: 'info',
      moyenne: 'warning',
      haute: 'danger',
    }
    return variants[priority] || 'primary'
  }

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && dueDate
  }

  const canEdit = user?.role !== 'lecture'
  // Seule la directrice et l'admin créent des tâches (ils les assignent aux employés et chefs)
  const canCreateTask = user?.role === 'directrice' || user?.role === 'admin'
  
  // Vérifier si l'utilisateur peut modifier une tâche spécifique
  const canEditTask = (task) => {
    // Admin et Directrice peuvent tout modifier
    if (user?.role === 'admin' || user?.role === 'directrice') {
      return true
    }
    // Lecture seule ne peut rien modifier
    if (user?.role === 'lecture') {
      return false
    }
    // Employés et Chefs ne peuvent modifier que les tâches qui leur sont assignées
    // et uniquement le statut
    if ((user?.role === 'employe' || user?.role === 'chef') && task.assignedToId === user?.id) {
      return true // Mais seulement pour le statut
    }
    return false
  }
  
  // Vérifier si l'utilisateur peut modifier uniquement le statut
  const canOnlyEditStatus = (task) => {
    return (user?.role === 'employe' || user?.role === 'chef') && 
           task.assignedToId === user?.id &&
           user?.role !== 'admin' && 
           user?.role !== 'directrice'
  }

  // Vérifier si le chef peut valider cette tâche (doit être assignée à un employé de son service)
  const canChefValidate = (task) => {
    if (user?.role !== 'chef') return false
    if (task.direction !== user?.direction) return false
    if (!task.assignedToId) return false
    
    // Vérifier que la tâche est assignée à un employé (pas à un autre chef)
    const assignedUser = allUsers.find(u => u.id === task.assignedToId)
    // Le chef ne peut valider QUE les employés, pas les autres chefs
    return assignedUser?.role === 'employe' && assignedUser?.direction === user?.direction
  }
  
  // Vérifier si la directrice peut valider cette tâche (peut valider employés et chefs)
  const canDirectriceValidate = (task) => {
    if (user?.role !== 'directrice' && user?.role !== 'admin') return false
    // La directrice peut valider toutes les tâches en attente de validation
    return true
  }

  // Séparer les tâches de la directrice des autres tâches
  const { myTasks: directriceTasks, otherTasks } = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    
    const allFiltered = tasks.filter((task) => {
      if (filters.status && task.status !== filters.status) return false
      if (filters.priority && task.priority !== filters.priority) return false
      if (filters.direction && task.direction !== filters.direction) return false

      if (search) {
        const haystack = [
          task.title,
          task.description,
          task.assignedTo,
          task.direction,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(search)) return false
      }

      return true
    })
    
    // Pour la directrice/admin, séparer ses tâches des autres
    if (user?.role === 'directrice' || user?.role === 'admin') {
      const myTasks = allFiltered.filter(task => task.assignedToId === user?.id)
      const otherTasks = allFiltered.filter(task => task.assignedToId !== user?.id)
      return { myTasks, otherTasks }
    }
    
    // Pour les autres rôles, pas de séparation
    return { myTasks: [], otherTasks: allFiltered }
  }, [tasks, filters, user])
  
  // Plus de séparation par statut - toutes les tâches dans une seule liste

  // Pour la compatibilité avec le reste du code
  // Source de base (visibilité)
  const baseVisibleTasks = useMemo(() => {
    return (user?.role === 'directrice' || user?.role === 'admin')
      ? (filters.myTasks ? directriceTasks : otherTasks)
      : otherTasks
  }, [directriceTasks, otherTasks, filters.myTasks, user?.role])

  const filteredTasks = useMemo(() => {
    let list = [...baseVisibleTasks]

    if (filters.status) {
      list = list.filter((task) => task.status === filters.status)
    } else {
      // exclure les terminées/archivées de la vue active (normalisation pour éviter les variantes)
      list = list.filter((task) => {
        const status = (task.status || '').trim().toLowerCase()
        return status !== 'termine' && status !== 'archive'
      })
    }

    return list
  }, [baseVisibleTasks, filters.status])

  // Fonction pour calculer la progression dynamique en fonction du statut
  const getDynamicProgress = (task) => {
    const currentProgress = task.progress || 0
    
    // Si la tâche est terminée, progression à 100%
    if (task.status === 'termine') {
      return 100
    }
    
    // Si en attente de validation, progression à 100% (tâche complétée, en attente de validation)
    if (task.status === 'en_attente_validation') {
      return 100
    }
    
    // Si en retard, la progression ne peut pas être à 100% (sinon elle serait terminée)
    // Limiter à 99% maximum pour les tâches en retard
    if (task.status === 'en_retard') {
      return Math.min(99, Math.max(0, currentProgress))
    }
    
    // Si planifiée, progression à 0% ou la valeur minimale
    if (task.status === 'planifie') {
      return Math.max(0, Math.min(currentProgress, 25)) // Max 25% pour planifié
    }
    
    // Si en cours, utiliser la progression réelle mais s'assurer qu'elle augmente progressivement
    if (task.status === 'en_cours') {
      // Si la progression est faible, s'assurer qu'elle est au moins à 25%
      if (currentProgress < 25) {
        return Math.max(25, currentProgress)
      }
      return Math.min(99, Math.max(25, currentProgress)) // Max 99% pour en cours
    }
    
    // Par défaut, retourner la progression actuelle
    return Math.min(100, Math.max(0, currentProgress))
  }

  // Fonction pour rendre une carte de tâche améliorée avec toutes les informations
  const renderTaskCard = (task) => {
    const statusColors = {
      planifie: 'bg-muted text-foreground',
      en_cours: 'bg-primary/10 text-primary',
      en_attente_validation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
      termine: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
      en_retard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    }
    const priorityColors = {
      basse: 'text-blue-600 dark:text-blue-400',
      moyenne: 'text-orange-600 dark:text-orange-400',
      haute: 'text-red-600 dark:text-red-400',
    }
    
    // Calculer la progression dynamique
    const dynamicProgress = getDynamicProgress(task)

    return (
      <Card key={task.id} className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-transparent hover:border-l-crg-primary dark:hover:border-l-crg-secondary group overflow-hidden h-full flex flex-col">
        <div className="p-5 flex flex-col flex-1">
          {/* En-tête de la carte avec statut et priorité */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`flex-shrink-0 w-3 h-3 rounded-full ${
                task.status === 'termine' ? 'bg-green-500' :
                task.status === 'en_retard' ? 'bg-red-500' :
                task.status === 'en_attente_validation' ? 'bg-orange-500' :
                task.status === 'en_cours' ? 'bg-blue-500' : 'bg-muted-foreground'
              }`}></div>
              <Badge variant={getStatusBadge(task.status)} size="sm" className={`${statusColors[task.status]} text-xs flex-shrink-0`}>
                {statusOptions.find((s) => s.value === task.status)?.label || task.status}
              </Badge>
              <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${priorityColors[task.priority] || 'text-foreground'} bg-opacity-10`}>
                {task.priority}
              </span>
            </div>
          </div>

          {/* Titre de la tâche */}
          <h3 className="text-base font-bold text-foreground mb-3 line-clamp-2 group-hover:text-crg-primary dark:group-hover:text-crg-secondary transition-colors">
            {task.title}
          </h3>

          {/* Description */}
          {task.description && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Message de blocage */}
          {task.blocked && task.blockage_reason && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span className="font-medium line-clamp-2">Blocage: {task.blockage_reason}</span>
              </div>
            </div>
          )}

          {/* Informations de la tâche */}
          <div className="space-y-2.5 mb-4">
            {/* Service */}
            {task.direction && (
            <div className="flex items-center gap-2.5 text-sm text-foreground">
              <Building2 size={16} className="flex-shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{task.direction}</span>
              </div>
            )}

            {/* Assigné à */}
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <User size={16} className="flex-shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{task.assignedTo || 'Non assigné'}</span>
            </div>

            {/* Date limite */}
            <div className="flex items-center gap-2.5 text-sm">
            <Calendar size={16} className={`${isOverdue(task.dueDate) ? 'text-red-500' : 'text-muted-foreground'} flex-shrink-0`} />
            <span className={`font-medium ${isOverdue(task.dueDate) ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {new Date(task.dueDate).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            {/* Pièces jointes */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-start gap-2.5 text-sm text-indigo-600 dark:text-indigo-400">
                <Paperclip size={16} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-medium">{task.attachments.length} pièce(s) jointe(s)</span>
                  <div className="mt-1 space-y-1">
                    {task.attachments.slice(0, 2).map((file, idx) => (
                      <a
                        key={idx}
                        href={file.fileUrl || file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        <File size={12} />
                        <span className="truncate">{file.fileName || file.name}</span>
                        <Download size={12} />
                      </a>
                    ))}
                    {task.attachments.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{task.attachments.length - 2} autre(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Barre de progression dynamique */}
          <div className="mb-5">
            {canOnlyEditStatus(task) ? (
              <div 
                className="flex items-center gap-3 cursor-pointer group/progress"
                onClick={() => handleEdit(task)}
                title="Cliquez pour modifier la progression"
              >
                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden group-hover/progress:bg-muted/80 transition-colors">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      dynamicProgress === 100 ? 'bg-emerald-500' :
                      dynamicProgress >= 50 ? 'bg-blue-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${dynamicProgress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-foreground w-14 text-right group-hover/progress:text-crg-primary transition-colors">
                  {dynamicProgress}%
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      dynamicProgress === 100 ? 'bg-emerald-500' :
                      dynamicProgress >= 50 ? 'bg-blue-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${dynamicProgress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-foreground w-14 text-right">
                  {dynamicProgress}%
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border gap-2 mt-auto">
            <div className="flex items-center gap-2 flex-1">
              {/* Bouton Soumettre */}
              {canOnlyEditStatus(task) && task.status === 'en_attente_validation' && (
                <Button
                  onClick={() => handleSubmitTask(task)}
                  disabled={isSubmitting}
                  variant="accent"
                  size="sm"
                  className="text-xs"
                  title="Soumettre au chef de service"
                >
                  <Send size={14} className="mr-1" />
                  Soumettre
                </Button>
              )}

              {/* Boutons Validation/Rejet */}
              {task.status === 'en_attente_validation' && 
               (canDirectriceValidate(task) || canChefValidate(task)) && (
                <>
                  <Button
                    onClick={async () => {
                      if (!window.confirm(`Valider la tâche "${task.title}" ?\n\nLa tâche sera marquée comme terminée et l'employé sera notifié.`)) {
                        return
                      }
                      try {
                        await tasksService.validateTask(task.id, true)
                        alert('✅ Tâche validée avec succès. L\'employé a été notifié.')
                        await loadTasks({}, { force: true })
                      } catch (error) {
                        console.error('Erreur lors de la validation:', error)
                        alert(`❌ Erreur: ${error.message || 'Impossible de valider la tâche'}`)
                      }
                    }}
                    variant="primary"
                    size="sm"
                    className="text-xs bg-green-600 hover:bg-green-700 flex items-center gap-1.5"
                    title="Valider la tâche"
                  >
                    <CheckCircle2 size={14} />
                    <span>Valider</span>
                  </Button>
                  <Button
                    onClick={async () => {
                      const reason = window.prompt(`Rejeter la tâche "${task.title}" ?\n\nVeuillez indiquer la raison du rejet :`)
                      if (reason === null) return
                      if (!reason.trim()) {
                        alert('Veuillez indiquer une raison pour le rejet')
                        return
                      }
                      try {
                        await tasksService.validateTask(task.id, false, reason)
                        alert('✅ Tâche rejetée. L\'employé a été notifié avec la raison du rejet.')
                        await loadTasks({}, { force: true })
                      } catch (error) {
                        console.error('Erreur lors du rejet:', error)
                        alert(`❌ Erreur: ${error.message || 'Impossible de rejeter la tâche'}`)
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5"
                    title="Rejeter la tâche"
                  >
                    <X size={14} />
                    <span>Rejeter</span>
                  </Button>
                </>
              )}

              {/* Bouton Archiver (directrice/admin, tâches terminées) */}
              {(user?.role === 'directrice' || user?.role === 'admin') && task.status === 'termine' && (
                <Button
                  onClick={() => handleArchiveTask(task)}
                  disabled={isSubmitting}
                  variant="outline"
                  size="sm"
                  className="text-xs border-crg-primary text-crg-primary hover:bg-crg-primary/10"
                  title="Archiver cette tâche et la retirer des vues actives"
                >
                  <Archive size={14} />
                  Archiver
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Boutons Modifier/Supprimer */}
              {canEditTask(task) && !canOnlyEditStatus(task) && (
                <>
                  <button
                    onClick={() => handleEdit(task)}
                    className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Modifier"
                  >
                    <Edit size={18} />
                  </button>
                  {(user?.role === 'admin' || user?.role === 'directrice') && (
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </>
              )}
              
              {/* Bouton Modifier (statut uniquement) */}
              {canOnlyEditStatus(task) && (
                <button
                  onClick={() => handleEdit(task)}
                  className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="Modifier le statut"
                >
                  <Edit size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4 p-2 sm:p-4 w-full max-w-full overflow-x-hidden bg-background text-foreground">
      {/* Stats en ligne compactes */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border shadow-sm">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="text-sm font-medium text-muted-foreground">Total:</span>
          <span className="text-sm font-bold text-foreground">{filteredTasks.length}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-sm font-medium text-muted-foreground">Terminées:</span>
          <span className="text-sm font-bold text-foreground">{filteredTasks.filter(t => t.status === 'termine').length}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border shadow-sm">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <span className="text-sm font-medium text-muted-foreground">En cours:</span>
          <span className="text-sm font-bold text-foreground">{filteredTasks.filter(t => t.status === 'en_cours').length}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border shadow-sm">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-sm font-medium text-muted-foreground">En retard:</span>
          <span className="text-sm font-bold text-foreground">{filteredTasks.filter(t => t.status === 'en_retard' || isOverdue(t.dueDate)).length}</span>
        </div>
        {(canEdit && canCreateTask) && (
          <div className="ml-auto">
            <Button onClick={handleCreate} variant="primary" size="sm" className="shadow-md flex items-center">
              <Plus size={16} className="mr-1.5" />
              <span>Nouvelle Tâche</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filtres compacts */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        <div className="relative flex-1 min-w-[150px] sm:min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary/50 focus:border-crg-primary transition-all"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary/50 focus:border-crg-primary transition-all cursor-pointer min-w-[120px]"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => updateFilter('priority', e.target.value)}
          className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary/50 focus:border-crg-primary transition-all cursor-pointer min-w-[130px] hidden sm:block"
        >
          {priorityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filters.direction}
          onChange={(e) => updateFilter('direction', e.target.value)}
          className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary/50 focus:border-crg-primary transition-all cursor-pointer min-w-[150px] hidden md:block"
        >
          {directionOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        
        {/* Filtre "Mes tâches" pour la directrice/admin */}
        {(user?.role === 'directrice' || user?.role === 'admin') && (
          <button
            onClick={() => updateFilter('myTasks', !filters.myTasks)}
            className={`flex items-center gap-2 px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              filters.myTasks
                ? 'bg-crg-primary text-white border-crg-primary shadow-md hover:bg-crg-primary/90'
                : 'bg-card text-foreground border-border hover:bg-muted'
            }`}
            title="Afficher uniquement mes tâches"
          >
            <User size={14} className={filters.myTasks ? 'text-white' : 'text-muted-foreground'} />
            <span className="hidden sm:inline">Mes tâches</span>
            <span className="sm:hidden">Moi</span>
          </button>
        )}

      </div>

      {/* Liste des tâches en tableau */}
      {loading ? (
        <Card>
            <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-crg-primary"></div>
              <p className="mt-3 text-sm text-muted-foreground">Chargement...</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Section "Mes Tâches" pour la directrice/admin */}
          {(user?.role === 'directrice' || user?.role === 'admin') && directriceTasks.length > 0 && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-crg-primary/30 to-transparent"></div>
                <h2 className="text-lg font-bold text-crg-primary dark:text-crg-secondary flex items-center gap-2">
                  <User size={20} />
                  Mes Tâches ({directriceTasks.length})
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-crg-primary/30 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {directriceTasks.map((task) => renderTaskCard(task))}
              </div>
            </div>
          )}
          
          {/* Section "Tâches de l'Équipe" pour la directrice/admin */}
          {(user?.role === 'directrice' || user?.role === 'admin') && otherTasks.length > 0 && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Users size={20} />
                  Tâches de l'Équipe ({otherTasks.length})
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {otherTasks.map((task) => renderTaskCard(task))}
              </div>
            </div>
          )}
          
          {/* Pour le chef de service : afficher toutes les tâches sans séparation */}
          {user?.role === 'chef' && (
            filteredTasks.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <ClipboardList size={48} className="mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Aucune tâche trouvée</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTasks.map((task) => renderTaskCard(task))}
              </div>
            )
          )}

          {/* Pour les autres rôles (employé, admin, lecture), afficher normalement */}
          {user?.role !== 'directrice' && user?.role !== 'chef' && (
            filteredTasks.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <ClipboardList size={48} className="mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Aucune tâche trouvée</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTasks.map((task) => renderTaskCard(task))}
              </div>
            )
          )}
          
          {/* Message si aucune tâche pour la directrice/admin */}
          {(user?.role === 'directrice' || user?.role === 'admin') && directriceTasks.length === 0 && otherTasks.length === 0 && (
            <Card>
              <div className="text-center py-12">
                <ClipboardList size={48} className="mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Aucune tâche trouvée</p>
              </div>
            </Card>
          )}

        </>
      )}

      {/* Modal création/édition */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          if (!isSubmitting) {
            setShowModal(false)
            reset()
            setSubmitError(null)
            setSelectedDirection('')
            setSelectedService('')
            setAvailableEmployees([])
          }
        }}
        title={editingTask ? (canOnlyEditStatus(editingTask) ? 'Mettre à jour le statut' : 'Modifier la tâche') : 'Nouvelle tâche'}
        size="lg"
      >
        {/* Formulaire simplifié pour employés/chefs */}
        {editingTask && canOnlyEditStatus(editingTask) ? (
          <EmployeeTaskForm
            task={editingTask}
            onSubmit={async (data) => {
              setIsSubmitting(true)
              setSubmitError(null)
              try {
                const updateData = { 
                  ...editingTask, 
                  status: data.status,
                  progress: data.progress || 0
                }
                await tasksService.update(editingTask.id, updateData)
                
                // Notifier la directrice pour tous les changements de statut
                let notificationSent = false
                let isDirectriceSelf = false
                try {
                  const notification = await tasksService.notifyDirectrice(
                    editingTask.id, 
                    editingTask.title, 
                    user.nom || user.email,
                    data.status // Passer le statut actuel
                  )
                  if (notification) {
                    console.log(`✅ Notification envoyée à la directrice (statut: ${data.status})`)
                    notificationSent = true
                  } else {
                    console.warn('⚠️ Aucune notification créée (notification est null)')
                  }
                } catch (notifError) {
                  console.error('⚠️ Erreur lors de la notification:', notifError)
                  // Si c'est une auto-notification, on continue sans erreur
                  if (notifError.message && notifError.message.includes('vous notifier vous-même')) {
                    console.warn('ℹ️ La directrice ne peut pas se notifier elle-même, la tâche a été mise à jour')
                    isDirectriceSelf = true
                  } else {
                    // Pour les autres erreurs, on affiche un avertissement mais on continue
                    console.warn('⚠️ La notification a échoué mais la tâche a été mise à jour')
                  }
                }
                
                setShowModal(false)
                reset()
                // Recharger les tâches globales et actualiser le cache
                await loadTasks({}, { force: true })
                
                // Afficher un message de succès
                if (data.status === 'termine') {
                  if (notificationSent) {
                    const notificationTarget = user?.role === 'employe' ? 'Le chef de service' : 'La directrice'
                    alert(`✅ Statut mis à jour et ${notificationTarget.toLowerCase()} a été notifié${user?.role === 'employe' ? '' : 'e'} !`)
                  } else if (isDirectriceSelf) {
                    alert('✅ Statut mis à jour avec succès !\n\nℹ️ Note: Vous êtes la directrice, donc aucune notification n\'a été envoyée.')
                  } else {
                    alert('✅ Statut mis à jour avec succès !\n\n⚠️ La notification n\'a pas pu être envoyée.')
                  }
                } else {
                  alert('✅ Statut mis à jour avec succès !')
                }
              } catch (error) {
                console.error('❌ Erreur lors de la mise à jour:', error)
                setSubmitError(error.message || 'Erreur lors de la mise à jour')
                alert('❌ Erreur lors de la mise à jour: ' + (error.message || 'Une erreur est survenue'))
              } finally {
                setIsSubmitting(false)
              }
            }}
            onSubmitToDirectrice={async () => {
              await handleSubmitTask(editingTask)
            }}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onClose={() => {
              if (!isSubmitting) {
                setShowModal(false)
                reset()
                setSubmitError(null)
              }
            }}
          />
        ) : (
          <form 
          onSubmit={(e) => {
            console.log('📋 Soumission du formulaire...')
            console.log('📋 Erreurs de validation:', errors)
            handleSubmit(onSubmit)(e)
          }} 
          className="space-y-4"
        >
          {/* Message d'erreur */}
          {submitError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
                <AlertCircle size={16} />
                {submitError}
              </p>
            </div>
          )}
          
          {/* Afficher les erreurs de validation */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-2">
                <AlertCircle size={16} />
                Veuillez corriger les erreurs dans le formulaire
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>
                    {field}: {error?.message || 'Erreur de validation'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Formulaire complet pour admin/directrice */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Titre *
            </label>
            <input
              type="text"
              {...register('title', { required: 'Le titre est requis' })}
              className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-medium text-foreground mb-2">
                Statut *
              </label>
              <select
                {...register('status', { required: 'Le statut est requis' })}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
              >
                <option value="planifie">Planifié</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
                <option value="en_retard">En retard</option>
              </select>
            </div>

            <div>
            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <TrendingUp size={16} className="text-muted-foreground" />
                Progression (%)
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  {...register('progress', { 
                    min: { value: 0, message: 'La progression doit être au moins 0%' },
                    max: { value: 100, message: 'La progression ne peut pas dépasser 100%' },
                    valueAsNumber: true
                  })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-crg-primary"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    {...register('progress', { 
                      min: { value: 0, message: 'La progression doit être au moins 0%' },
                      max: { value: 100, message: 'La progression ne peut pas dépasser 100%' },
                      valueAsNumber: true
                    })}
                    className="w-24 px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary text-center"
                    placeholder="0"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                {errors.progress && (
                  <p className="text-xs text-red-600 dark:text-red-400">{errors.progress.message}</p>
                )}
              </div>
            </div>

            <div>
            <label className="block text-sm font-medium text-foreground mb-2">
                Priorité *
              </label>
              <select
                {...register('priority', { required: 'La priorité est requise' })}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
              >
                <option value="basse">Basse</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Service *
              </label>
              <select
                {...register('direction', { 
                  required: 'Le service est requis',
                  onChange: (e) => {
                    setSelectedDirection(e.target.value)
                    setValue('assignedToId', '')
                  }
                })}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
              >
                <option value="">Sélectionner un service</option>
                {[...DSI_SERVICES, ...COMPTA_SERVICES].map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.direction && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.direction.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date limite *
              </label>
              <input
                type="date"
                {...register('dueDate', { required: 'La date limite est requise' })}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.dueDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Type d'affectation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 border border-border rounded-lg bg-muted/50">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <Users size={16} className="text-muted-foreground" />
                Type d'affectation
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    value="service"
                    {...register('assignmentType')}
                    defaultChecked
                    onChange={() => setValue('assignedToId', '')}
                  />
                  Service (tous les membres)
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    value="individuel"
                    {...register('assignmentType')}
                  />
                  Individuelle
                </label>
              </div>
            </div>
          </div>

          {/* Sélection de l'employé assigné */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Users size={16} className="text-muted-foreground" />
              Assigné à {(user?.role === 'directrice' || user?.role === 'admin') ? '(Employé, Chef ou Moi)' : '(Employé)'}
            </label>
            {!watchedDirection ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle size={14} />
                  Sélectionnez d'abord une direction pour voir les employés disponibles
                </p>
              </div>
            ) : availableEmployees.length === 0 ? (
              <div className="p-3 bg-muted/50 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Aucun employé disponible pour cette direction
                </p>
              </div>
            ) : (
              <select
                {...register('assignedToId')}
                disabled={watchedAssignmentType !== 'individuel'}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground disabled:bg-muted/50 disabled:cursor-not-allowed"
              >
                <option value="">{watchedAssignmentType === 'individuel' ? 'Sélectionner un employé' : 'Non assigné (tâche de service)'}</option>
                {availableEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name || employee.nom || employee.email} 
                    {employee.fonction ? ` - ${employee.fonction}` : ''}
                    {employee.role === 'chef' ? ' (Chef)' : ''}
                    {employee.role === 'directrice' ? ' (Directeur·trice - Moi)' : ''}
                  </option>
                ))}
              </select>
            )}
            {watchedDirection && availableEmployees.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {availableEmployees.length} employé(s) disponible(s) pour cette direction
              </p>
            )}
            {watchedAssignmentType === 'individuel' && !watchedDirection && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Choisissez un service pour afficher les employés.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (!isSubmitting) {
                  setShowModal(false)
                  reset()
                  setSubmitError(null)
                  setSelectedDirection('')
                  setSelectedService('')
                  setAvailableEmployees([])
                  setIsSubmitting(false)
                }
              }}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {editingTask ? 'Modification...' : 'Création...'}
                </span>
              ) : (
                editingTask ? 'Modifier' : 'Créer'
              )}
            </Button>
          </div>
        </form>
        )}
      </Modal>

    </div>
  )
}

