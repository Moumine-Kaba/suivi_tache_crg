import axios from 'axios'
import { supabase } from './supabaseClient'
import { validatePassword } from '../utils/passwordValidation'

import { ALLOWED_EMAIL_DOMAIN, isEmailAllowed as isAllowedEmail, INSCRIPTION_RESERVEE_MSG } from '../constants/emailDomain'

// Toujours utiliser l'URL actuelle en dev pour que le lien de réinitialisation pointe vers le bon port
const APP_URL =
  (typeof window !== 'undefined' && window.location?.origin) ||
  (import.meta.env?.VITE_APP_URL || 'http://localhost:3000')

// Configuration de base de l'API
// En développement / pré-production, on utilise missions.crg.gn comme domaine par défaut
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://missions.crg.gn/api'

// Instance axios avec configuration par défaut
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },

})

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crg-auth-storage')
    if (token) {
      try {
        const parsed = JSON.parse(token)
        if (parsed.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('crg-auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ============================================
// DONNÉES MOCKÉES
// ============================================

// Utilisateurs mockés
const mockUsers = [
  {
    id: 1,
    email: 'directrice@crg.gn',
    password: 'directrice123',
    name: 'Aissatou Diallo',
    role: 'directrice',
    direction: null,
  },
  {
    id: 2,
    email: 'chef@crg.gn',
    password: 'chef123',
    name: 'Mamadou Bah',
    role: 'chef',
    direction: 'Direction Commerciale',
  },
  {
    id: 3,
    email: 'employe@crg.gn',
    password: 'employe123',
    name: 'Fatou Camara',
    role: 'employe',
    direction: 'Direction Commerciale',
  },
  {
    id: 4,
    email: 'lecture@crg.gn',
    password: 'lecture123',
    name: 'Ibrahima Sow',
    role: 'lecture',
    direction: 'Direction Financière',
  },
]

// Tâches mockées
const mockTasks = [
  {
    id: 1,
    title: 'Audit des comptes clients',
    description: 'Réaliser un audit complet des comptes clients pour le trimestre',
    status: 'en_cours',
    priority: 'haute',
    direction: 'Direction Financière',
    assignedTo: 'Fatou Camara',
    assignedToId: 3,
    dueDate: '2024-12-20',
    createdAt: '2024-12-01',
    progress: 65,
  },
  {
    id: 2,
    title: 'Formation équipe commerciale',
    description: 'Organiser une formation sur les nouveaux produits bancaires',
    status: 'planifie',
    priority: 'moyenne',
    direction: 'Direction Commerciale',
    assignedTo: 'Mamadou Bah',
    assignedToId: 2,
    dueDate: '2024-12-25',
    createdAt: '2024-12-05',
    progress: 30,
  },
  {
    id: 3,
    title: 'Rapport mensuel de performance',
    description: 'Préparer le rapport mensuel de performance pour la direction',
    status: 'termine',
    priority: 'haute',
    direction: 'Direction Financière',
    assignedTo: 'Ibrahima Sow',
    assignedToId: 4,
    dueDate: '2024-12-15',
    createdAt: '2024-11-28',
    progress: 100,
  },
  {
    id: 4,
    title: 'Mise à jour système informatique',
    description: 'Superviser la mise à jour du système de gestion',
    status: 'en_cours',
    priority: 'haute',
    direction: 'Direction Technique',
    assignedTo: 'Aissatou Diallo',
    assignedToId: 1,
    dueDate: '2024-12-18',
    createdAt: '2024-12-10',
    progress: 45,
  },
  {
    id: 5,
    title: 'Réunion avec partenaires',
    description: 'Organiser une réunion avec les partenaires stratégiques',
    status: 'planifie',
    priority: 'moyenne',
    direction: 'Direction Commerciale',
    assignedTo: 'Mamadou Bah',
    assignedToId: 2,
    dueDate: '2024-12-22',
    createdAt: '2024-12-12',
    progress: 20,
  },
  {
    id: 6,
    title: 'Analyse des risques',
    description: 'Effectuer une analyse approfondie des risques financiers',
    status: 'en_retard',
    priority: 'haute',
    direction: 'Direction Financière',
    assignedTo: 'Fatou Camara',
    assignedToId: 3,
    dueDate: '2024-12-10',
    createdAt: '2024-11-25',
    progress: 50,
  },
]

// Notifications mockées
const mockNotifications = [
  {
    id: 1,
    title: 'Nouvelle tâche assignée',
    message: 'Une nouvelle tâche vous a été assignée : Audit des comptes clients',
    type: 'task',
    taskId: 1,
    read: false,
    createdAt: '2024-12-15T10:30:00',
  },
  {
    id: 2,
    title: 'Tâche en retard',
    message: 'La tâche "Analyse des risques" est en retard',
    type: 'warning',
    taskId: 6,
    read: false,
    createdAt: '2024-12-10T09:00:00',
  },
  {
    id: 3,
    title: 'Rapport approuvé',
    message: 'Votre rapport hebdomadaire a été approuvé',
    type: 'success',
    read: true,
    createdAt: '2024-12-14T14:20:00',
  },
]

// Rapports mockés
const mockReports = [
  {
    id: 1,
    userId: 3,
    userName: 'Fatou Camara',
    direction: 'Direction Commerciale',
    week: '2024-12-09',
    status: 'envoye',
    sections: {
      objectifs: 'Réalisation de 80% des objectifs commerciaux',
      realisations: 'Signature de 5 nouveaux contrats',
      difficultes: 'Retard dans la livraison des documents',
      solutions: 'Mise en place d\'un suivi renforcé',
      besoins: 'Formation sur les nouveaux produits',
      perspectives: 'Atteindre 100% des objectifs le mois prochain',
    },
    createdAt: '2024-12-15T10:00:00',
  },
]

// ============================================
// SERVICES API
// ============================================

export const authService = {
  // Connexion avec Supabase Auth
  login: async (email, password) => {
    try {
      // Authentification via Supabase
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error('Erreur Supabase Auth:', authError)
        
        if (authError.message?.includes('Email not confirmed') || authError.message?.includes('email_not_confirmed')) {
          throw new Error('Votre compte n\'est pas encore confirmé. Contactez l\'administrateur.')
        } else if (authError.message?.includes('Invalid login credentials')) {
          throw new Error('Email ou mot de passe incorrect. Vérifiez vos identifiants.')
        } else {
          throw new Error(authError.message || 'Email ou mot de passe incorrect')
        }
      }

      if (!authData.user) {
        throw new Error('Erreur lors de la connexion')
      }

      // Récupérer les métadonnées utilisateur depuis la table users
      // D'abord essayer par ID (plus précis)
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      // Si pas trouvé par ID, essayer par email
      if (!userData && userError) {
        const { data: userByEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single()
        
        if (userByEmail) {
          userData = userByEmail
          userError = null
          // Si l'ID est différent, c'est un problème - on utilisera quand même les données
          if (userData.id !== authData.user.id) {
            console.warn('⚠️ ID différent entre auth.users et public.users pour', email)
          }
        }
      }

      // Si l'utilisateur n'existe toujours pas dans la table users
      let userProfile = userData
      if (!userData) {
        console.warn('⚠️ Utilisateur non trouvé dans la table users, création d\'un profil par défaut')
        console.warn('⚠️ ATTENTION: Le rôle sera "employe" par défaut. Mettez à jour manuellement dans Supabase.')
        
        // Créer un profil utilisateur par défaut (rôle employe)
        // L'utilisateur devra mettre à jour son rôle manuellement dans Supabase
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            username: authData.user.email?.split('@')[0] || 'Utilisateur',
            nom: authData.user.email?.split('@')[0] || 'Utilisateur',
            role: 'employe', // Rôle par défaut - À METTRE À JOUR MANUELLEMENT
            is_active: true,
          })
          .select()
          .single()

        if (insertError) {
          console.error('❌ Erreur lors de la création du profil:', insertError)
          userProfile = {
            id: authData.user.id,
            email: authData.user.email,
            username: authData.user.email?.split('@')[0] || 'Utilisateur',
            nom: authData.user.email?.split('@')[0] || 'Utilisateur',
            role: 'employe',
            is_active: false,
          }
        } else {
          userProfile = newUser
          console.warn('⚠️ Profil créé avec rôle "employe". Exécutez fix-directrice-role.sql pour corriger.')
        }
      } else {
        // Utilisateur trouvé - utiliser son rôle réel depuis la base
        console.log('✅ Utilisateur trouvé dans la base de données')
        console.log('📋 Rôle récupéré depuis Supabase:', userProfile.role)
      }

      // SÉCURITÉ : Vérifier que le compte est actif (tous les cas)
      if (userProfile?.is_active === false) {
        await supabase.auth.signOut()
        throw new Error('Votre compte a été désactivé par un administrateur. Contactez l\'administrateur.')
      }

      // Vérifier si le rôle est incorrect pour cet email spécifique
      if (email === 'moumine.ingenieur@gmai.com' && userProfile?.role !== 'directrice') {
        console.error('⚠️ ATTENTION: Le rôle devrait être "directrice" mais est:', userProfile?.role)
        console.error('⚠️ Exécutez le script fix-moumine-role-final.sql dans Supabase SQL Editor')
      }

      // Mettre à jour la dernière connexion
      if (userProfile?.id) {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userProfile.id)
      }

      // Journaliser la connexion réussie (login_logs)
      try {
        await supabase.from('login_logs').insert({
          user_id: userProfile?.id || authData.user.id,
          email: email,
          status: 'success',
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          details: { login_time: new Date().toISOString() },
        })
      } catch (logErr) {
        console.warn('⚠️ Erreur journalisation login_logs:', logErr)
      }

      // Vérifier et logger le rôle récupéré
      const finalRole = userProfile?.role || 'employe'
      console.log('🔐 Rôle final récupéré pour la connexion:', finalRole)
      console.log('📋 Données utilisateur complètes:', {
        id: userProfile?.id || authData.user.id,
        email: userProfile?.email || authData.user.email,
        role: finalRole,
        nom: userProfile?.nom,
      })

      // Première connexion : changement de mot de passe obligatoire
      const mustChangePassword = userProfile?.must_change_password === true

      // Retourner les données utilisateur avec le token
      const userResponse = {
        id: userProfile?.id || authData.user.id,
        email: userProfile?.email || authData.user.email,
        name: userProfile?.nom || userProfile?.username || authData.user.email?.split('@')[0] || 'Utilisateur',
        username: userProfile?.username,
        nom: userProfile?.nom,
        role: finalRole,
        direction: userProfile?.direction || null,
        fonction: userProfile?.fonction || null,
        mustChangePassword,
      }

      console.log('✅ Données utilisateur retournées:', userResponse)

      return {
        user: userResponse,
        token: authData.session?.access_token,
        session: authData.session, // Garder la session complète pour Supabase
        mustChangePassword,
      }
    } catch (error) {
      // Fallback sur les données mockées si Supabase n'est pas configuré
      if (!import.meta.env.VITE_SUPABASE_URL) {
        console.warn('Supabase non configuré, utilisation des données mockées')
        const user = mockUsers.find(
          (u) => u.email === email && u.password === password
        )

        if (!user) {
          throw new Error('Email ou mot de passe incorrect')
        }

        const { password: _, ...userWithoutPassword } = user
        return {
          user: userWithoutPassword,
          token: `mock-jwt-token-${user.id}-${Date.now()}`,
        }
      }

      throw error
    }
  },

  // Récupérer l'utilisateur actuel depuis Supabase
  getCurrentUser: async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !authUser) {
        return null
      }

      // Récupérer les métadonnées depuis la table users
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userProfile) {
        return {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.nom || userProfile.username || userProfile.email?.split('@')[0],
          username: userProfile.username,
          nom: userProfile.nom,
          role: userProfile.role,
          direction: userProfile.direction,
          fonction: userProfile.fonction,
        }
      }

      return null
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error)
      return null
    }
  },

  // Déconnexion
  logout: async () => {
    await supabase.auth.signOut()
  },

  // Inscription sécurisée via Edge Function (validation backend @creditruralgn.com)
  register: async (email, password, name, direction, fonction, role, gender = null) => {
    try {
      if (!isAllowedEmail(email)) {
        throw new Error(INSCRIPTION_RESERVEE_MSG)
      }
      const { valid, message } = validatePassword(password)
      if (!valid) throw new Error(message || 'Mot de passe invalide')
      if (role !== 'employe' && role !== 'chef') {
        throw new Error('L\'inscription n\'est autorisée que pour les employés et chefs de service.')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!supabaseUrl || !anonKey) {
        throw new Error('Configuration Supabase manquante.')
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/secure-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({
          email,
          password,
          name,
          direction: direction || null,
          fonction: fonction || null,
          role,
          gender: gender && ['M', 'F'].includes(String(gender).toUpperCase()) ? String(gender).toUpperCase() : null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'inscription.')
      }

      return {
        user: data.user || { email },
        message: data.message || 'Inscription réussie. Vérifiez votre boîte mail pour confirmer votre compte.',
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error)
      throw error
    }
  },

  // Demande de réinitialisation de mot de passe
  forgotPassword: async (email) => {
    try {
      // IMPORTANT: Dans Supabase Dashboard > Authentication > URL Configuration :
      // - Site URL: http://localhost:3000 (dev) ou https://votredomaine.com (prod)
      // - Redirect URLs: ajouter http://localhost:3000/reset-password et l'URL de prod
      // Si les emails ne partent pas, vérifier aussi : Auth > Email Templates et le SMTP

      const redirectUrl = `${APP_URL}/reset-password`
      console.log('📧 Demande reset password vers:', email, '| Redirect URL:', redirectUrl)
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) {
        console.error('Erreur Supabase resetPasswordForEmail:', error)
        // Message explicite pour le rate limit (Supabase limite les emails/heure)
        if (error.message?.toLowerCase().includes('rate limit') || error.status === 429) {
          throw new Error('Limite d\'envoi d\'emails atteinte. Veuillez réessayer dans 1 heure. Pour la production, configurez un SMTP personnalisé dans Supabase.')
        }
        if (error.message?.toLowerCase().includes('fetch') || error.message?.toLowerCase().includes('network')) {
          throw new Error('Problème de connexion. Vérifiez votre connexion internet et réessayez.')
        }
        throw new Error(error.message || 'Erreur lors de l\'envoi de l\'email de réinitialisation')
      }

      return {
        message: 'Un email de réinitialisation a été envoyé à votre adresse. Vérifiez votre boîte de réception (et les spams).',
      }
    } catch (error) {
      console.error('Erreur lors de la demande de réinitialisation:', error)
      throw error
    }
  },

  // Réinitialisation du mot de passe (avec le token reçu par email)
  resetPassword: async (newPassword) => {
    try {
      const { valid, message } = validatePassword(newPassword)
      if (!valid) throw new Error(message || 'Mot de passe invalide')

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        console.error('Erreur lors de la réinitialisation du mot de passe:', error)
        throw new Error(error.message || 'Erreur lors de la réinitialisation du mot de passe')
      }

      return {
        message: 'Votre mot de passe a été réinitialisé avec succès.',
      }
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error)
      throw error
    }
  },

  /**
   * Changement de mot de passe obligatoire à la première connexion
   * Met à jour le mot de passe et désactive must_change_password
   */
  changePasswordInitial: async (newPassword) => {
    try {
      const { valid, message } = validatePassword(newPassword)
      if (!valid) throw new Error(message || 'Mot de passe invalide')

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) throw new Error('Session expirée. Veuillez vous reconnecter.')

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message || 'Erreur lors du changement de mot de passe')

      await supabase
        .from('users')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', authUser.id)

      return { message: 'Mot de passe modifié avec succès.' }
    } catch (error) {
      console.error('Erreur changePasswordInitial:', error)
      throw error
    }
  },
}

// Fonction utilitaire pour enregistrer une action dans l'historique
const recordAction = async (taskId, action, details = {}, userId = null, userName = null) => {
  try {
    // Récupérer la tâche actuelle
    const { data: task } = await supabase
      .from('tasks')
      .select('metadata')
      .eq('id', taskId)
      .single()

    if (!task) return

    // Parser les métadonnées
    let metadata = {}
    try {
      metadata = task.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
    } catch (e) {
      metadata = {}
    }

    // Initialiser l'historique si nécessaire
    if (!metadata.actionHistory) {
      metadata.actionHistory = []
    }

    // Récupérer le nom de l'utilisateur si nécessaire
    let finalUserName = userName
    if (!finalUserName && userId) {
      const { data: user } = await supabase
        .from('users')
        .select('nom, email')
        .eq('id', userId)
        .single()
      finalUserName = user?.nom || user?.email?.split('@')[0] || 'Utilisateur'
    }

    // Ajouter l'action à l'historique
    metadata.actionHistory.push({
      id: `${taskId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      action,
      user: finalUserName || 'Système',
      userId: userId || null,
      timestamp: new Date().toISOString(),
      details: details.message || details.details || '',
      oldValue: details.oldValue || null,
      newValue: details.newValue || null,
      ...details,
    })

    // Limiter l'historique aux 100 dernières actions
    if (metadata.actionHistory.length > 100) {
      metadata.actionHistory = metadata.actionHistory.slice(-100)
    }

    // Mettre à jour les métadonnées
    await supabase
      .from('tasks')
      .update({
        metadata: JSON.stringify(metadata),
      })
      .eq('id', taskId)
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'action:', error)
    // Ne pas bloquer l'opération principale si l'enregistrement de l'historique échoue
  }
}

export const tasksService = {
  // Récupérer toutes les tâches depuis Supabase
  getAll: async (filters = {}) => {
    try {
      // Récupérer l'utilisateur actuel pour filtrer selon le rôle
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.warn('Notifications: auth error', authError)
      }
      if (!authUser) {
        console.warn('Notifications: utilisateur non authentifié, retour []')
        return []
      }

      // Récupérer le profil utilisateur
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Construire la requête selon le rôle
      let query = supabase.from('tasks').select('*')

      // Filtrer selon le rôle (visibilité)
      if (userProfile?.role === 'chef') {
        if (!userProfile.direction) {
          console.warn('⚠️ [tasksService.getAll] Chef sans direction, aucune tâche ne sera retournée')
          console.warn('   Chef ID:', authUser.id, 'Email:', userProfile.email)
          return []
        }
        // Tâches de service (direction) + tâches individuelles du chef
        query = query.or(
          `and(direction.eq.${userProfile.direction},assigned_to.is.null),and(assigned_to.eq.${authUser.id})`
        )
      } else if (userProfile?.role === 'employe') {
        // Tâches de son service (non assignées) + ses tâches individuelles
        if (userProfile.direction) {
          query = query.or(
            `and(direction.eq.${userProfile.direction},assigned_to.is.null),and(assigned_to.eq.${authUser.id})`
          )
        } else {
          query = query.eq('assigned_to', authUser.id)
        }
      } else if (userProfile?.role === 'directrice') {
        // Le directeur ne voit que les tâches de sa direction
        const serviceNames = await directionsService.getServiceNamesForDirectorId(authUser.id)
        if (serviceNames?.length) {
          query = query.in('direction', serviceNames)
        }
      }
      // admin et lecture voient tout

      // Appliquer les filtres
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters.direction) {
        const structure = await directionsService.getStructure()
        const dirServices = structure[filters.direction]?.services
        if (dirServices?.length) {
          query = query.in('direction', dirServices)
        } else {
          query = query.eq('direction', filters.direction)
        }
      }
      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
      }

      const { data: tasks, error } = await query
      
      // Log pour déboguer
      if (import.meta.env.DEV && userProfile?.role === 'chef') {
        console.log('📋 [tasksService.getAll] Résultat pour chef:', {
          userId: authUser.id,
          direction: userProfile.direction,
          tasksCount: tasks?.length || 0,
          error: error?.message,
        })
      }

      if (error) {
        throw error
      }

      let filtered = tasks || []

      // Filtre de recherche (fait côté client car Supabase ne supporte pas bien la recherche textuelle)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(
          (t) =>
            t.title?.toLowerCase().includes(searchLower) ||
            t.description?.toLowerCase().includes(searchLower)
        )
      }

      // Transformer les données pour correspondre au format attendu par l'UI
      return filtered.map((task) => {
        // Parser metadata pour récupérer les informations de blocage
        let metadata = {}
        try {
          metadata = task.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
        } catch (e) {
          metadata = {}
        }

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          direction: task.direction,
          assignedTo: task.assigned_to_name || 'Non assigné',
          assignedToId: task.assigned_to,
          dueDate: task.due_date,
          progress: task.progress || 0,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
          blocked: (() => {
            try {
              const metadata = task.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
              return metadata.blocked || false
            } catch (e) {
              return false
            }
          })(),
          blockage_reason: (() => {
            try {
              const metadata = task.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
              return metadata.blockage_reason || null
            } catch (e) {
              return null
            }
          })(),
          attachments: (() => {
            try {
              const metadata = task.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
              return metadata.attachments || []
            } catch (e) {
              return []
            }
          })(),
          metadata: (() => {
            try {
              return task.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
            } catch (e) {
              return {}
            }
          })(),
        }
      })
    } catch (error) {
      const msg = String(error?.message || '')
      const isNetwork = /failed to fetch|network|connection|reset|closed/i.test(msg) || error?.name === 'TypeError'
      if (isNetwork) {
        if (import.meta.env.DEV) console.warn('⚠️ [tasksService.getAll] Erreur réseau, retour []:', msg)
        return []
      }
      if (!import.meta.env.VITE_SUPABASE_URL) {
        let filtered = [...mockTasks]
        if (filters.status) filtered = filtered.filter((t) => t.status === filters.status)
        if (filters.priority) filtered = filtered.filter((t) => t.priority === filters.priority)
        if (filters.direction) {
          const structure = await directionsService.getStructure()
          const dirServices = structure[filters.direction]?.services
          if (dirServices?.length) {
            filtered = filtered.filter((t) => dirServices.includes(t.direction))
          } else {
            filtered = filtered.filter((t) => t.direction === filters.direction)
          }
        }
        if (filters.assignedTo) filtered = filtered.filter((t) => t.assignedToId === filters.assignedTo)
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filtered = filtered.filter(
            (t) =>
              t.title.toLowerCase().includes(searchLower) ||
              t.description.toLowerCase().includes(searchLower)
          )
        }
        return filtered
      }
      throw error
    }
  },

  // Récupérer les tâches archivées (statut terminé/archive) avec la même RLS côté client
  listArchived: async () => {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.warn('Notifications: auth error', authError)
    }
    if (!authUser) {
      console.warn('Tasks archived: utilisateur non authentifié, retour []')
      return []
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    let query = supabase
      .from('tasks')
      .select('*')
      .in('status', ['termine', 'archive'])

    // Visibilité selon rôle (même logique que getAll)
    if (userProfile?.role === 'chef') {
      if (!userProfile.direction) return []
      query = query.or(
        `and(direction.eq.${userProfile.direction},assigned_to.is.null),and(assigned_to.eq.${authUser.id})`
      )
    } else if (userProfile?.role === 'employe') {
      if (userProfile.direction) {
        query = query.or(
          `and(direction.eq.${userProfile.direction},assigned_to.is.null),and(assigned_to.eq.${authUser.id})`
        )
      } else {
        query = query.eq('assigned_to', authUser.id)
      }
    }

    const { data: tasks, error } = await query.order('updated_at', { ascending: false })
    if (error) throw error

    const list = tasks || []
    return list.map((task) => {
      let metadata = {}
      try {
        metadata = task.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
      } catch {
        metadata = {}
      }
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        direction: task.direction,
        assignedToId: task.assigned_to,
        assigneeName: task.assigned_to_name,
        createdAt: task.created_at,
        completedAt: task.updated_at || task.created_at,
        estimatedDuration: metadata.estimatedDuration,
        actualDuration: metadata.actualDuration,
      }
    })
  },

  // Récupérer une tâche par ID depuis Supabase
  getById: async (id) => {
    try {
      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      if (!task) {
        throw new Error('Tâche non trouvée')
      }

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        direction: task.direction,
        assignedTo: task.assigned_to_name || 'Non assigné',
        assignedToId: task.assigned_to,
        dueDate: task.due_date,
        progress: task.progress || 0,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la tâche:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        return mockTasks.find((t) => t.id === parseInt(id))
      }
      throw error
    }
  },

  // Créer une tâche dans Supabase
  create: async (taskData) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le profil de l'utilisateur connecté pour vérifier son rôle
      const { data: currentUserProfile } = await supabase
        .from('users')
        .select('role, direction')
        .eq('id', authUser.id)
        .single()

      // Seule la directrice et l'admin peuvent créer des tâches (ils les assignent aux employés et chefs)
      if (currentUserProfile?.role !== 'directrice' && currentUserProfile?.role !== 'admin') {
        throw new Error('Seul le directeur/directrice peut créer et assigner des tâches. Les employés et chefs de service exécutent les tâches qui leur sont assignées.')
      }

      // Récupérer le nom de l'utilisateur assigné si un ID est fourni
      let assignedToName = taskData.assignedTo
      let assignedUser = null
      if (taskData.assignedToId) {
        const { data: assignedUserData } = await supabase
          .from('users')
          .select('nom, role, direction')
          .eq('id', taskData.assignedToId)
          .single()
        if (assignedUserData) {
          assignedUser = assignedUserData
          assignedToName = assignedUserData.nom
        }
      }

      // Validation : Les chefs ne peuvent assigner qu'aux employés de leur service
      if (currentUserProfile?.role === 'chef' && taskData.assignedToId) {
        if (!assignedUser) {
          throw new Error('L\'utilisateur assigné n\'existe pas')
        }
        
        // Vérifier que l'utilisateur assigné est un employé (pas un chef)
        if (assignedUser.role !== 'employe') {
          throw new Error('Les chefs de service ne peuvent assigner des tâches qu\'aux employés de leur service')
        }
        
        // Vérifier que l'utilisateur assigné appartient à la même direction que le chef
        if (assignedUser.direction !== currentUserProfile.direction) {
          throw new Error('Vous ne pouvez assigner des tâches qu\'aux membres de votre service')
        }
        
        // Vérifier que la direction de la tâche correspond à la direction du chef
        if (taskData.direction && taskData.direction !== currentUserProfile.direction) {
          throw new Error('Vous ne pouvez créer des tâches que pour votre service')
        }
      }

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          title: taskData.title,
          description: taskData.description || null,
          status: taskData.status,
          priority: taskData.priority,
          direction: taskData.direction,
          assigned_to: taskData.assignedToId || null,
          assigned_to_name: assignedToName || null,
          due_date: taskData.dueDate,
          progress: taskData.progress || 0,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Enregistrer l'action de création dans l'historique
      await recordAction(newTask.id, 'created', {
        message: `Tâche créée: "${newTask.title}"`,
      }, authUser.id)

      // Enregistrer l'assignation si applicable
      if (taskData.assignedToId) {
        await recordAction(newTask.id, 'assigned', {
          message: `Assignée à ${assignedToName}`,
          newValue: assignedToName,
        }, authUser.id)
      }

      // Notifier automatiquement l'employé si une tâche lui est assignée
      if (taskData.assignedToId && taskData.assignedToId !== authUser.id) {
        try {
          // Récupérer le nom du créateur
          const { data: creator } = await supabase
            .from('users')
            .select('nom, email')
            .eq('id', authUser.id)
            .single()
          
          const creatorName = creator?.nom || creator?.email?.split('@')[0] || 'Un responsable'
          
          // Créer la notification pour l'employé assigné
          const notificationData = {
            user_id: taskData.assignedToId,
            title: 'Nouvelle tâche assignée',
            message: `${creatorName} vous a assigné une nouvelle tâche : "${newTask.title}"`,
            type: 'task',
            task_id: newTask.id,
            read: false,
            metadata: JSON.stringify({ 
              assigned_by: authUser.id,
              assigned_by_name: creatorName,
              created_at: new Date().toISOString()
            }),
          }

          // Essayer d'abord avec la fonction SQL (si elle existe)
          const { data: notificationViaFunction, error: functionError } = await supabase
            .rpc('create_notification_for_user', {
              target_user_id: taskData.assignedToId,
              notification_title: notificationData.title,
              notification_message: notificationData.message,
              notification_type: notificationData.type,
              task_id_param: newTask.id
            })

          if (functionError || !notificationViaFunction) {
            // Si la fonction n'existe pas, utiliser l'insertion directe
            const { error: notifError } = await supabase
              .from('notifications')
              .insert(notificationData)

            if (notifError) {
              console.warn('⚠️ Erreur lors de la notification à l\'employé:', notifError)
              // Ne pas bloquer la création de la tâche si la notification échoue
            } else {
              console.log('✅ Notification envoyée à l\'employé pour la nouvelle tâche')
            }
          } else {
            console.log('✅ Notification envoyée à l\'employé via fonction SQL')
          }
        } catch (notifErr) {
          console.warn('⚠️ Erreur lors de la notification automatique:', notifErr)
          // Ne pas bloquer la création de la tâche si la notification échoue
        }
      }

      // Notifier le chef de service si une tâche est assignée à un employé de son service
      // IMPORTANT: Fonctionne même si c'est la directrice ou un admin qui assigne
      if (taskData.assignedToId && taskData.assignedToId !== authUser.id) {
        try {
          // Récupérer les informations de l'employé assigné pour obtenir sa direction
          const { data: assignedEmployee, error: employeeError } = await supabase
            .from('users')
            .select('id, nom, email, direction, role')
            .eq('id', taskData.assignedToId)
            .single()

          if (employeeError || !assignedEmployee) {
            console.warn('⚠️ Employé assigné non trouvé, notification au chef annulée:', employeeError)
          } else {
            // Utiliser la direction de l'employé si elle n'est pas dans taskData
            const taskDirection = taskData.direction || assignedEmployee.direction

            // Vérifier que l'employé a une direction
            if (taskDirection) {
              // Récupérer le chef de service de la direction
              const { data: chefService, error: chefError } = await supabase
                .from('users')
                .select('id, nom, email')
                .eq('role', 'chef')
                .eq('direction', taskDirection)
                .single()

              // Si un chef de service existe pour cette direction et que ce n'est pas lui qui crée la tâche
              if (!chefError && chefService && chefService.id !== authUser.id) {
                // Récupérer le nom du créateur
                const { data: creator } = await supabase
                  .from('users')
                  .select('nom, email, role')
                  .eq('id', authUser.id)
                  .single()

                const creatorName = creator?.nom || creator?.email?.split('@')[0] || 'Un responsable'
                const creatorRole = creator?.role || 'Un responsable'
                const employeeName = assignedEmployee?.nom || assignedEmployee?.email?.split('@')[0] || 'un employé'

                // Adapter le message selon le rôle du créateur
                let notificationTitle = 'Nouvelle tâche assignée dans votre service'
                let notificationMessage = `${creatorName} a assigné une nouvelle tâche "${newTask.title}" à ${employeeName}`
                
                if (creatorRole === 'directrice') {
                  notificationTitle = 'Nouvelle tâche assignée par le directeur/directrice'
                  notificationMessage = `Le directeur/la directrice ${creatorName} a assigné une nouvelle tâche "${newTask.title}" à ${employeeName} de votre service`
                } else if (creatorRole === 'admin') {
                  notificationTitle = 'Nouvelle tâche assignée par l\'Administrateur'
                  notificationMessage = `L'Administrateur ${creatorName} a assigné une nouvelle tâche "${newTask.title}" à ${employeeName} de votre service`
                }

                // Créer la notification pour le chef de service
                const chefNotificationData = {
                  user_id: chefService.id,
                  title: notificationTitle,
                  message: notificationMessage,
                  type: 'task',
                  task_id: newTask.id,
                  read: false,
                  metadata: JSON.stringify({ 
                    assigned_by: authUser.id,
                    assigned_by_name: creatorName,
                    assigned_by_role: creatorRole,
                    assigned_to: taskData.assignedToId,
                    assigned_to_name: employeeName,
                    direction: taskDirection,
                    created_at: new Date().toISOString()
                  }),
                }

                // Essayer d'abord avec la fonction SQL (si elle existe)
                const { data: notificationViaFunction, error: functionError } = await supabase
                  .rpc('create_notification_for_user', {
                    target_user_id: chefService.id,
                    notification_title: chefNotificationData.title,
                    notification_message: chefNotificationData.message,
                    notification_type: chefNotificationData.type,
                    task_id_param: newTask.id
                  })

                if (functionError || !notificationViaFunction) {
                  // Si la fonction n'existe pas, utiliser l'insertion directe
                  const { error: notifError } = await supabase
                    .from('notifications')
                    .insert(chefNotificationData)

                  if (notifError) {
                    console.warn('⚠️ Erreur lors de la notification au chef de service:', notifError)
                    // Ne pas bloquer la création de la tâche si la notification échoue
                  } else {
                    console.log(`✅ Notification envoyée au chef de service (${chefService.nom}) pour la nouvelle tâche assignée par ${creatorName} (${creatorRole})`)
                  }
                } else {
                  console.log(`✅ Notification envoyée au chef de service via fonction SQL (assignée par ${creatorName})`)
                }
              } else if (chefError) {
                console.warn(`⚠️ Chef de service non trouvé pour la direction "${taskDirection}":`, chefError.message)
              }
            } else {
              console.warn('⚠️ Aucune direction trouvée pour l\'employé assigné, notification au chef annulée')
            }
          }
        } catch (chefNotifErr) {
          console.warn('⚠️ Erreur lors de la notification au chef de service:', chefNotifErr)
          // Ne pas bloquer la création de la tâche si la notification échoue
        }
      }

      return {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        direction: newTask.direction,
        assignedTo: newTask.assigned_to_name || 'Non assigné',
        assignedToId: newTask.assigned_to,
        dueDate: newTask.due_date,
        progress: newTask.progress || 0,
        createdAt: newTask.created_at,
        updatedAt: newTask.updated_at,
      }
    } catch (error) {
      console.error('Erreur lors de la création de la tâche:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        const newTask = {
          id: mockTasks.length + 1,
          ...taskData,
          createdAt: new Date().toISOString().split('T')[0],
          progress: 0,
        }
        mockTasks.push(newTask)
        return newTask
      }
      throw error
    }
  },

  // Mettre à jour une tâche dans Supabase
  update: async (id, taskData) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le profil de l'utilisateur connecté pour vérifier son rôle
      const { data: currentUserProfile } = await supabase
        .from('users')
        .select('role, direction')
        .eq('id', authUser.id)
        .single()

      // Récupérer la tâche actuelle pour comparer les changements
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single()

      // Récupérer le nom de l'utilisateur assigné si un ID est fourni
      let assignedToName = taskData.assignedTo
      let assignedUser = null
      if (taskData.assignedToId) {
        const { data: assignedUserData } = await supabase
          .from('users')
          .select('nom, role, direction')
          .eq('id', taskData.assignedToId)
          .single()
        if (assignedUserData) {
          assignedUser = assignedUserData
          assignedToName = assignedUserData.nom
        }
      }

      // Validation : Les chefs ne peuvent assigner qu'aux employés de leur service
      if (currentUserProfile?.role === 'chef' && taskData.assignedToId) {
        if (!assignedUser) {
          throw new Error('L\'utilisateur assigné n\'existe pas')
        }
        
        // Vérifier que l'utilisateur assigné est un employé (pas un chef)
        if (assignedUser.role !== 'employe') {
          throw new Error('Les chefs de service ne peuvent assigner des tâches qu\'aux employés de leur service')
        }
        
        // Vérifier que l'utilisateur assigné appartient à la même direction que le chef
        if (assignedUser.direction !== currentUserProfile.direction) {
          throw new Error('Vous ne pouvez assigner des tâches qu\'aux membres de votre service')
        }
        
        // Vérifier que la direction de la tâche correspond à la direction du chef (si modifiée)
        if (taskData.direction && taskData.direction !== currentUserProfile.direction) {
          throw new Error('Vous ne pouvez modifier le service que pour votre service')
        }
      }

      const updateData = {
        title: taskData.title,
        description: taskData.description || null,
        status: taskData.status,
        priority: taskData.priority,
        direction: taskData.direction,
        assigned_to: taskData.assignedToId || null,
        assigned_to_name: assignedToName || null,
        due_date: taskData.dueDate,
        progress: taskData.progress || 0,
        updated_at: new Date().toISOString(),
      }

      // Si terminé, on conserve le statut 'termine' (pas de statut 'archive' dans le schéma)
      if (taskData.status === 'archive') {
        updateData.status = 'termine'
      }

      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        // Cas fréquent avec RLS : la ligne est mise à jour mais non retournée
        // "Cannot coerce the result to a single JSON object"
        if (error.code === 'PGRST116' || error.message?.includes('Cannot coerce the result to a single JSON object')) {
          console.warn('⚠️ Mise à jour effectuée mais ligne non retournée (RLS). Utilisation de currentTask fusionné.')
        } else {
          throw error
        }
      }

      // Si Supabase n'a pas pu retourner la ligne (RLS), reconstruire l'objet à partir de currentTask + updateData
      const finalTask = updatedTask || { ...currentTask, ...updateData }

      // Enregistrer les changements dans l'historique
      if (currentTask) {
        // Changement de statut
        if (taskData.status && currentTask.status !== taskData.status) {
          await recordAction(id, 'status_changed', {
            message: `Statut changé de "${currentTask.status}" à "${taskData.status}"`,
            oldValue: currentTask.status,
            newValue: taskData.status,
          }, authUser.id)
        }

        // Changement d'assignation
        if (taskData.assignedToId && currentTask.assigned_to !== taskData.assignedToId) {
          await recordAction(id, 'assigned', {
            message: `Réassignée à ${assignedToName}`,
            oldValue: currentTask.assigned_to_name || 'Non assigné',
            newValue: assignedToName,
          }, authUser.id)

          // Notifier le chef de service si une tâche est réassignée à un employé de son service
          // IMPORTANT: Fonctionne même si c'est la directrice ou un admin qui réassigné
          if (taskData.assignedToId !== authUser.id) {
            try {
              // Récupérer les informations de l'employé assigné pour obtenir sa direction
              const { data: assignedEmployee, error: employeeError } = await supabase
                .from('users')
                .select('id, nom, email, direction, role')
                .eq('id', taskData.assignedToId)
                .single()

              if (employeeError || !assignedEmployee) {
                console.warn('⚠️ Employé assigné non trouvé, notification au chef annulée:', employeeError)
              } else {
                // Utiliser la direction de l'employé ou de la tâche
                const taskDirection = finalTask.direction || assignedEmployee.direction

                // Vérifier que l'employé a une direction
                if (taskDirection) {
                  // Récupérer le chef de service de la direction
                  const { data: chefService, error: chefError } = await supabase
                    .from('users')
                    .select('id, nom, email')
                    .eq('role', 'chef')
                    .eq('direction', taskDirection)
                    .single()

                  // Si un chef de service existe pour cette direction et que ce n'est pas lui qui modifie la tâche
                  if (!chefError && chefService && chefService.id !== authUser.id) {
                    // Récupérer le nom du créateur et de l'employé assigné
                    const { data: creator } = await supabase
                      .from('users')
                      .select('nom, email, role')
                      .eq('id', authUser.id)
                      .single()
                    
                    const creatorName = creator?.nom || creator?.email?.split('@')[0] || 'Un responsable'
                    const creatorRole = creator?.role || 'Un responsable'
                    const employeeName = assignedEmployee?.nom || assignedEmployee?.email?.split('@')[0] || 'un employé'
                    const oldEmployeeName = currentTask.assigned_to_name || 'un employé'

                    // Adapter le message selon le rôle du créateur
                    let notificationTitle = 'Tâche réassignée dans votre service'
                    let notificationMessage = `${creatorName} a réassigné la tâche "${finalTask.title}" de ${oldEmployeeName} à ${employeeName}`
                    
                    if (creatorRole === 'directrice') {
                      notificationTitle = 'Tâche réassignée par le directeur/directrice'
                      notificationMessage = `Le directeur/la directrice ${creatorName} a réassigné la tâche "${finalTask.title}" de ${oldEmployeeName} à ${employeeName} de votre service`
                    } else if (creatorRole === 'admin') {
                      notificationTitle = 'Tâche réassignée par l\'Administrateur'
                      notificationMessage = `L'Administrateur ${creatorName} a réassigné la tâche "${finalTask.title}" de ${oldEmployeeName} à ${employeeName} de votre service`
                    }

                    // Créer la notification pour le chef de service
                    const chefNotificationData = {
                      user_id: chefService.id,
                      title: notificationTitle,
                      message: notificationMessage,
                      type: 'task',
                      task_id: id,
                      read: false,
                      metadata: JSON.stringify({ 
                        assigned_by: authUser.id,
                        assigned_by_name: creatorName,
                        assigned_by_role: creatorRole,
                        assigned_to: taskData.assignedToId,
                        assigned_to_name: employeeName,
                        previous_assigned_to: currentTask.assigned_to,
                        previous_assigned_to_name: oldEmployeeName,
                        direction: taskDirection,
                        created_at: new Date().toISOString()
                      }),
                    }

                    // Essayer d'abord avec la fonction SQL (si elle existe)
                    const { data: notificationViaFunction, error: functionError } = await supabase
                      .rpc('create_notification_for_user', {
                        target_user_id: chefService.id,
                        notification_title: chefNotificationData.title,
                        notification_message: chefNotificationData.message,
                        notification_type: chefNotificationData.type,
                        task_id_param: id
                      })

                    if (functionError || !notificationViaFunction) {
                      // Si la fonction n'existe pas, utiliser l'insertion directe
                      const { error: notifError } = await supabase
                        .from('notifications')
                        .insert(chefNotificationData)

                      if (notifError) {
                        console.warn('⚠️ Erreur lors de la notification au chef de service (réassignation):', notifError)
                        // Ne pas bloquer la mise à jour de la tâche si la notification échoue
                      } else {
                        console.log(`✅ Notification envoyée au chef de service (${chefService.nom}) pour la réassignation par ${creatorName} (${creatorRole})`)
                      }
                    } else {
                      console.log(`✅ Notification envoyée au chef de service via fonction SQL (réassignation par ${creatorName})`)
                    }
                  } else if (chefError) {
                    console.warn(`⚠️ Chef de service non trouvé pour la direction "${taskDirection}":`, chefError.message)
                  }
                } else {
                  console.warn('⚠️ Aucune direction trouvée pour l\'employé assigné, notification au chef annulée')
                }
              }
            } catch (chefNotifErr) {
              console.warn('⚠️ Erreur lors de la notification au chef de service (réassignation):', chefNotifErr)
              // Ne pas bloquer la mise à jour de la tâche si la notification échoue
            }
          }
        }

        // Changement de progression
        if (taskData.progress !== undefined && currentTask.progress !== taskData.progress) {
          await recordAction(id, 'updated', {
            message: `Progression mise à jour: ${currentTask.progress}% → ${taskData.progress}%`,
            oldValue: `${currentTask.progress}%`,
            newValue: `${taskData.progress}%`,
          }, authUser.id)
        }

        // Autres modifications
        if (taskData.title && currentTask.title !== taskData.title) {
          await recordAction(id, 'updated', {
            message: `Titre modifié`,
            oldValue: currentTask.title,
            newValue: taskData.title,
          }, authUser.id)
        }
      }

      return {
        id: finalTask.id,
        title: finalTask.title,
        description: finalTask.description,
        status: finalTask.status,
        priority: finalTask.priority,
        direction: finalTask.direction,
        assignedTo: finalTask.assigned_to_name || 'Non assigné',
        assignedToId: finalTask.assigned_to,
        dueDate: finalTask.due_date,
        progress: finalTask.progress || 0,
        createdAt: finalTask.created_at,
        updatedAt: finalTask.updated_at,
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la tâche:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        const index = mockTasks.findIndex((t) => t.id === parseInt(id))
        if (index === -1) throw new Error('Tâche non trouvée')
        mockTasks[index] = { ...mockTasks[index], ...taskData }
        return mockTasks[index]
      }
      throw error
    }
  },

  // Supprimer une tâche dans Supabase
  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        const index = mockTasks.findIndex((t) => t.id === parseInt(id))
        if (index === -1) throw new Error('Tâche non trouvée')
        mockTasks.splice(index, 1)
        return { success: true }
      }
      throw error
    }
  },
  
  // Notifier le directeur concerné d'un changement de statut de tâche (celui de la direction de la tâche)
  notifyDirectrice: async (taskId, taskTitle, userName, taskStatus) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer la tâche pour connaître sa direction (service)
      const { data: task } = await supabase.from('tasks').select('direction').eq('id', taskId).single()
      const serviceName = task?.direction

      // Trouver le directeur de la direction concernée
      let directorId = serviceName ? await directionsService.getDirectorIdForService(serviceName) : null
      if (!directorId) {
        directorId = await directionsService.getDirectorIdForUserId(authUser.id)
      }
      if (!directorId) {
        const { data: fallback } = await supabase.from('users').select('id').eq('role', 'directrice').limit(1).maybeSingle()
        directorId = fallback?.id
      }
      if (!directorId) {
        console.warn('⚠️ Directeur non trouvé, notification non créée')
        return null
      }

      const { data: directrice } = await supabase.from('users').select('id, nom, email').eq('id', directorId).single()
      if (!directrice) return null

      console.log('👤 Directeur concerné trouvé:', { id: directrice.id, nom: directrice.nom })

      // Empêcher l'auto-notification (si l'utilisateur est le directeur)
      if (authUser.id === directrice.id) {
        console.warn('⚠️ La directrice ne peut pas se notifier elle-même')
        console.warn('⚠️ L\'utilisateur connecté est la directrice elle-même, aucune notification ne sera créée')
        throw new Error('Vous ne pouvez pas vous notifier vous-même. La directrice ne peut pas soumettre de tâches pour elle-même.')
      }

      // Récupérer le nom de l'utilisateur qui soumet
      let employeeName = userName
      if (!employeeName) {
        const { data: currentUser } = await supabase
          .from('users')
          .select('nom, email')
          .eq('id', authUser.id)
          .single()
        employeeName = currentUser?.nom || currentUser?.email?.split('@')[0] || 'Un utilisateur'
      }

      // Récupérer le statut actuel de la tâche
      const { data: currentTask, error: taskError } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', taskId)
        .single()

      const actualStatus = taskStatus || currentTask?.status || 'planifie'

      // Adapter le message selon le statut réel de la tâche
      let notificationTitle = ''
      let notificationMessage = ''
      let notificationType = 'info'
      
      switch (actualStatus) {
        case 'termine':
          notificationTitle = 'Tâche terminée'
          notificationMessage = `${employeeName} a terminé la tâche "${taskTitle}"`
          notificationType = 'task'
          break
        case 'en_attente_validation':
          notificationTitle = '📋 Tâche en attente de validation'
          notificationMessage = `${employeeName} a terminé la tâche "${taskTitle}" et attend votre validation`
          notificationType = 'info'
          break
        case 'en_retard':
          notificationTitle = 'Tâche en retard'
          notificationMessage = `${employeeName} a marqué la tâche "${taskTitle}" comme étant en retard`
          notificationType = 'warning'
          break
        case 'en_cours':
          notificationTitle = 'Tâche en cours'
          notificationMessage = `${employeeName} a mis la tâche "${taskTitle}" en cours`
          notificationType = 'info'
          break
        case 'planifie':
          notificationTitle = 'Tâche planifiée'
          notificationMessage = `${employeeName} a planifié la tâche "${taskTitle}"`
          notificationType = 'info'
          break
        default:
          notificationTitle = 'Mise à jour de tâche'
          notificationMessage = `${employeeName} a mis à jour la tâche "${taskTitle}" (statut: ${actualStatus})`
          notificationType = 'info'
      }

      // Créer la notification pour la directrice avec l'ID de l'employé
      // Utiliser la fonction SQL pour contourner RLS
      console.log('📝 Tentative de création de notification via fonction SQL:', {
        directrice_id: directrice.id,
        authUser_id: authUser.id,
        taskId: taskId,
        employeeName: employeeName,
        taskStatus: actualStatus
      })

      // Essayer d'abord avec la fonction SQL (si elle existe)
      const { data: notificationViaFunction, error: functionError } = await supabase
        .rpc('create_notification_for_user', {
          target_user_id: directrice.id,
          notification_title: notificationTitle,
          notification_message: notificationMessage,
          notification_type: notificationType,
          task_id_param: taskId
        })

      let notification = null
      let error = null

      if (functionError || !notificationViaFunction) {
        // Si la fonction n'existe pas, utiliser l'insertion directe
        console.log('⚠️ Fonction SQL non disponible, utilisation de l\'insertion directe')
        
        const notificationData = {
          user_id: directrice.id,
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
          task_id: taskId,
          read: false,
          metadata: JSON.stringify({ 
            employee_id: authUser.id,
            employee_name: employeeName,
            task_status: actualStatus,
            created_at: new Date().toISOString()
          }),
        }

        const { data: notificationDirect, error: directError } = await supabase
          .from('notifications')
          .insert(notificationData)
          .select()
          .single()

        notification = notificationDirect
        error = directError
      } else {
        // La fonction a fonctionné, récupérer la notification créée
        const notificationId = notificationViaFunction
        const { data: notificationData, error: fetchError } = await supabase
          .from('notifications')
          .select('*')
          .eq('id', notificationId)
          .single()
        
        notification = notificationData
        error = fetchError
      }

      if (error) {
        console.error('❌ Erreur lors de la création de la notification:', error)
        console.error('❌ Détails de l\'erreur:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        // Message d'erreur plus détaillé
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          throw new Error(`ERREUR RLS: Les politiques de sécurité ne sont pas correctement configurées. Veuillez exécuter le script SQL "FIX_RLS_TRIGGER.sql" dans Supabase SQL Editor. Détails: ${error.message}`)
        }
        
        throw new Error(`Impossible de créer la notification: ${error.message}`)
      }

      console.log('✅ Notification créée pour la directrice:', {
        notificationId: notification?.id,
        directriceId: directrice.id,
        directriceNom: directrice.nom,
        directriceEmail: directrice.email,
        employeeId: authUser.id,
        employeeName,
        notificationUserId: notification?.user_id
      })
      
      // Vérifier que la notification a bien le bon user_id
      if (notification && notification.user_id !== directrice.id) {
        console.error('❌ ERREUR: Le user_id de la notification ne correspond pas à l\'ID de la directrice!', {
          notificationUserId: notification.user_id,
          directriceId: directrice.id
        })
      }
      
      // Vérifier que la notification peut être lue par la directrice
      if (notification) {
        const { data: verifyNotification, error: verifyError } = await supabase
          .from('notifications')
          .select('*')
          .eq('id', notification.id)
          .eq('user_id', directrice.id)
          .single()
        
        if (verifyError || !verifyNotification) {
          console.error('❌ ERREUR: La notification créée ne peut pas être lue par la directrice!', {
            notificationId: notification.id,
            directriceId: directrice.id,
            error: verifyError
          })
          console.error('⚠️ PROBLÈME: L\'ID de la directrice dans users ne correspond probablement pas à son UUID dans auth.users')
          console.error('💡 SOLUTION: Vérifiez que l\'ID dans public.users correspond à l\'UUID dans auth.users')
        } else {
          console.log('✅ Vérification: La notification peut être lue par la directrice')
        }
      }
      
      return notification
    } catch (error) {
      console.error('❌ Erreur lors de la notification à la directrice:', error)
      throw error
    }
  },

  // Signaler un blocage sur une tâche
  reportBlockage: async (taskId, blockageReason) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le nom de l'utilisateur
      const { data: currentUser } = await supabase
        .from('users')
        .select('nom, email')
        .eq('id', authUser.id)
        .single()

      const employeeName = currentUser?.nom || currentUser?.email?.split('@')[0] || 'Un employé'

      // Récupérer la tâche
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, assigned_to, direction')
        .eq('id', taskId)
        .single()

      if (taskError || !task) {
        throw new Error('Tâche non trouvée')
      }

      // Vérifier que l'utilisateur est bien assigné à la tâche
      if (task.assigned_to !== authUser.id) {
        throw new Error('Vous ne pouvez signaler un blocage que sur vos propres tâches')
      }

      // Mettre à jour la tâche avec le blocage (utiliser metadata pour stocker le blocage)
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('metadata')
        .eq('id', taskId)
        .single()

      let metadata = {}
      try {
        metadata = existingTask?.metadata ? (typeof existingTask.metadata === 'string' ? JSON.parse(existingTask.metadata) : existingTask.metadata) : {}
      } catch (e) {
        metadata = {}
      }

      metadata.blocked = true
      metadata.blockage_reason = blockageReason
      metadata.blockage_reported_by = authUser.id
      metadata.blockage_reported_by_name = employeeName
      metadata.blockage_reported_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          metadata: JSON.stringify(metadata),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (updateError) {
        throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`)
      }

      // Notifier le directeur de la direction concernée
      let directorId = await directionsService.getDirectorIdForService(task.direction)
      if (!directorId) directorId = await directionsService.getDirectorIdForUserId(authUser.id)
      if (!directorId) {
        const { data: fb } = await supabase.from('users').select('id').eq('role', 'directrice').limit(1).maybeSingle()
        directorId = fb?.id
      }

      if (directorId && directorId !== authUser.id) {
        const notificationData = {
          user_id: directorId,
          title: '🚨 Blocage signalé',
          message: `${employeeName} a signalé un blocage sur la tâche "${task.title}": ${blockageReason}`,
          type: 'warning',
          task_id: taskId,
          read: false,
          metadata: JSON.stringify({
            employee_id: authUser.id,
            employee_name: employeeName,
            blockage_reason: blockageReason,
            created_at: new Date().toISOString()
          }),
        }

        // Essayer d'abord avec la fonction SQL
        const { data: notificationViaFunction, error: functionError } = await supabase
          .rpc('create_notification_for_user', {
            target_user_id: directorId,
            notification_title: notificationData.title,
            notification_message: notificationData.message,
            notification_type: notificationData.type,
            task_id_param: taskId
          })

        if (functionError || !notificationViaFunction) {
          // Si la fonction n'existe pas, utiliser l'insertion directe
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notificationData)

          if (notifError) {
            console.warn('⚠️ Erreur lors de la notification à la directrice:', notifError)
            // Ne pas bloquer si la notification échoue
          } else {
            console.log('✅ Notification envoyée à la directrice pour le blocage')
          }
        } else {
          console.log('✅ Notification envoyée à la directrice via fonction SQL')
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Erreur lors du signalement du blocage:', error)
      throw error
    }
  },

  // Résoudre un blocage (pour la directrice)
  resolveBlockage: async (taskId) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Vérifier que l'utilisateur est la directrice
      const { data: currentUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (currentUser?.role !== 'directrice' && currentUser?.role !== 'admin') {
        throw new Error('Seul le directeur ou la directrice peut résoudre un blocage')
      }

      // Récupérer la tâche
      const { data: task } = await supabase
        .from('tasks')
        .select('metadata, assigned_to, title')
        .eq('id', taskId)
        .single()

      if (!task) {
        throw new Error('Tâche non trouvée')
      }

      let metadata = {}
      try {
        metadata = task.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
      } catch (e) {
        metadata = {}
      }

      // Marquer le blocage comme résolu
      metadata.blocked = false
      metadata.blockage_resolved_by = authUser.id
      metadata.blockage_resolved_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          metadata: JSON.stringify(metadata),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (updateError) {
        throw new Error(`Erreur lors de la résolution: ${updateError.message}`)
      }

      // Notifier l'employé que le blocage est résolu
      if (task.assigned_to) {
        const notificationData = {
          user_id: task.assigned_to,
          title: '✅ Blocage résolu',
          message: `Le blocage sur la tâche "${task.title || 'votre tâche'}" a été résolu par la directrice`,
          type: 'success',
          task_id: taskId,
          read: false,
        }

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationData)

        if (notifError) {
          console.warn('⚠️ Erreur lors de la notification à l\'employé:', notifError)
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Erreur lors de la résolution du blocage:', error)
      throw error
    }
  },

  // Valider ou rejeter une tâche (pour la directrice)
  validateTask: async (taskId, approved, rejectionReason = null) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Vérifier que l'utilisateur peut valider (directrice, admin ou chef)
      const { data: currentUser } = await supabase
        .from('users')
        .select('role, nom, email, direction')
        .eq('id', authUser.id)
        .single()

      if (currentUser?.role !== 'directrice' && currentUser?.role !== 'admin' && currentUser?.role !== 'chef') {
        throw new Error('Seuls le directeur/directrice, l\'admin ou le chef de service peuvent valider ou rejeter une tâche')
      }

      // Récupérer la tâche avec la direction
      const { data: task } = await supabase
        .from('tasks')
        .select('id, title, assigned_to, status, metadata, direction')
        .eq('id', taskId)
        .single()

      if (!task) {
        throw new Error('Tâche non trouvée')
      }

      if (task.status !== 'en_attente_validation') {
        throw new Error('Cette tâche n\'est pas en attente de validation')
      }

      // Si c'est un chef, vérifier que la tâche est de sa direction ET assignée à un employé
      if (currentUser?.role === 'chef') {
        if (task.direction !== currentUser.direction) {
          throw new Error('Vous ne pouvez valider que les tâches de votre service')
        }
        
        // Vérifier que la tâche est assignée à un employé (pas à un autre chef)
        if (task.assigned_to) {
          const { data: assignedUser } = await supabase
            .from('users')
            .select('role, direction')
            .eq('id', task.assigned_to)
            .single()
          
          if (!assignedUser) {
            throw new Error('Utilisateur assigné non trouvé')
          }
          
          // Le chef ne peut valider que les tâches assignées aux employés de son service
          // Les chefs doivent être validés par la directrice uniquement
          if (assignedUser.role !== 'employe') {
            throw new Error('Vous ne pouvez valider que les tâches assignées aux employés de votre service. Les chefs doivent être validés par le directeur/directrice.')
          }
          
          // Vérifier que l'employé est bien de la même direction
          if (assignedUser.direction !== currentUser.direction) {
            throw new Error('L\'employé assigné n\'appartient pas à votre service')
          }
        } else {
          throw new Error('Cette tâche n\'est assignée à personne')
        }
      }
      
      // Si c'est la directrice/admin, elle peut valider tout le monde (employés et chefs)
      // Pas de restriction supplémentaire pour la directrice

      let metadata = {}
      try {
        metadata = task.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
      } catch (e) {
        metadata = {}
      }

      const validatorName = currentUser.nom || currentUser.email?.split('@')[0] || 
        (currentUser.role === 'chef' ? 'Le chef de service' : 'Le directeur/directrice')

      if (approved) {
        // Valider la tâche
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            status: 'termine',
            progress: 100,
            metadata: JSON.stringify({
              ...metadata,
              validated: true,
              validated_by: authUser.id,
              validated_by_name: validatorName,
              validated_at: new Date().toISOString(),
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId)

        if (updateError) {
          throw new Error(`Erreur lors de la validation: ${updateError.message}`)
        }

        // Récupérer les informations de l'utilisateur assigné
        let assignedUserInfo = null
        if (task.assigned_to) {
          const { data: assignedUser } = await supabase
            .from('users')
            .select('id, nom, email, role, direction')
            .eq('id', task.assigned_to)
            .single()
          
          assignedUserInfo = assignedUser
        }

        // Notifier l'employé que la tâche est validée
        if (task.assigned_to && assignedUserInfo) {
          const employeeNotification = {
            user_id: task.assigned_to,
            title: '✅ Tâche validée',
            message: `${validatorName} a validé votre tâche "${task.title}"`,
            type: 'success',
            task_id: taskId,
            read: false,
          }

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(employeeNotification)

          if (notifError) {
            console.warn('⚠️ Erreur lors de la notification à l\'employé:', notifError)
          } else {
            console.log('✅ Notification envoyée à l\'employé')
          }
        }

        // Si c'est un chef qui valide, notifier le directeur de la direction concernée
        if (currentUser.role === 'chef' && assignedUserInfo && assignedUserInfo.role === 'employe') {
          const serviceName = task.direction || assignedUserInfo.direction
          let directorId = serviceName ? await directionsService.getDirectorIdForService(serviceName) : null
          if (!directorId) directorId = await directionsService.getDirectorIdForUserId(assignedUserInfo.id)
          if (!directorId) {
            const { data: fb } = await supabase.from('users').select('id').eq('role', 'directrice').limit(1).maybeSingle()
            directorId = fb?.id
          }

          if (directorId && directorId !== authUser.id) {
            const directriceNotification = {
              user_id: directorId,
              title: '✅ Tâche validée par le chef',
              message: `${validatorName} a validé la tâche "${task.title}" de ${assignedUserInfo.nom || assignedUserInfo.email}`,
              type: 'info',
              task_id: taskId,
              read: false,
            }

            const { error: directriceNotifError } = await supabase
              .from('notifications')
              .insert(directriceNotification)

            if (directriceNotifError) {
              console.warn('⚠️ Erreur lors de la notification au directeur:', directriceNotifError)
            } else {
              console.log('✅ Notification envoyée au directeur concerné')
            }
          }

          // Notifier le chef (confirmation de sa validation)
          const chefNotification = {
            user_id: authUser.id,
            title: '✅ Validation confirmée',
            message: `Vous avez validé la tâche "${task.title}" de ${assignedUserInfo.nom || assignedUserInfo.email}`,
            type: 'success',
            task_id: taskId,
            read: false,
          }

          const { error: chefNotifError } = await supabase
            .from('notifications')
            .insert(chefNotification)

          if (chefNotifError) {
            console.warn('⚠️ Erreur lors de la notification au chef:', chefNotifError)
          } else {
            console.log('✅ Notification de confirmation envoyée au chef')
          }
        }
      } else {
        // Rejeter la tâche
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            status: 'en_cours', // Remettre en cours
            metadata: JSON.stringify({
              ...metadata,
              rejected: true,
              rejected_by: authUser.id,
              rejected_by_name: validatorName,
              rejected_at: new Date().toISOString(),
              rejection_reason: rejectionReason,
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId)

        if (updateError) {
          throw new Error(`Erreur lors du rejet: ${updateError.message}`)
        }

        // Enregistrer l'action dans l'historique
        await recordAction(taskId, 'rejected', {
          message: `Tâche rejetée${rejectionReason ? `: ${rejectionReason}` : ''}`,
          oldValue: 'en_attente_validation',
          newValue: 'en_cours',
          details: rejectionReason || '',
        }, authUser.id)

        // Notifier l'employé que la tâche est rejetée
        if (task.assigned_to) {
          const notificationData = {
            user_id: task.assigned_to,
            title: '❌ Tâche rejetée',
            message: `${validatorName} a rejeté votre tâche "${task.title}". Raison: ${rejectionReason}`,
            type: 'warning',
            task_id: taskId,
            read: false,
            metadata: JSON.stringify({
              rejection_reason: rejectionReason,
            }),
          }

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notificationData)

          if (notifError) {
            console.warn('⚠️ Erreur lors de la notification à l\'employé:', notifError)
          }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Erreur lors de la validation/rejet de la tâche:', error)
      throw error
    }
  },
}

export const notificationsService = {
  // Récupérer le nombre de notifications non lues
  getUnreadCount: async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return 0
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('read', false)

      if (error) {
        console.error('Erreur lors de la récupération du nombre de notifications non lues:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre de notifications non lues:', error)
      return 0
    }
  },

  // Récupérer toutes les notifications depuis Supabase (tolérant réseau/auth)
  getAll: async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.warn('Notifications: auth error', authError)
      }
      if (!authUser) {
        console.warn('Notifications: utilisateur non authentifié, retour []')
        return []
      }

      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Notifications: erreur Supabase', error)
        return []
      }

      return (notifications || []).map((notif) => {
        let metadata = {}
        try {
          metadata = notif.metadata ? JSON.parse(notif.metadata) : {}
        } catch (e) {
          console.warn('Erreur lors du parsing des métadonnées:', e)
        }
        
        return {
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          taskId: notif.task_id,
          reportId: notif.report_id || metadata.report_id,
          invoiceId: metadata.invoice_id,
          read: notif.read || false,
          createdAt: notif.created_at,
          employeeId: metadata.employee_id,
          employeeName: metadata.employee_name,
          acknowledged: metadata.acknowledged || false,
        }
      })
    } catch (error) {
      console.error('Notifications: récupération impossible (réseau/auth)', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        return mockNotifications.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      }
      return []
    }
  },

  // Marquer comme lu dans Supabase
  markAsRead: async (id) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      const { data: notification, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', authUser.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        taskId: notification.task_id,
        read: notification.read,
        createdAt: notification.created_at,
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la notification:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        const notification = mockNotifications.find((n) => n.id === id)
        if (notification) {
          notification.read = true
        }
        return notification
      }
      throw error
    }
  },

  // Marquer toutes comme lues dans Supabase
  markAllAsRead: async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', authUser.id)
        .eq('read', false)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des notifications:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        mockNotifications.forEach((n) => (n.read = true))
        return { success: true }
      }
      throw error
    }
  },

  // Supprimer une notification
  delete: async (id) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', authUser.id)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error)
      throw error
    }
  },

  // Supprimer toutes les notifications lues
  deleteAllRead: async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', authUser.id)
        .eq('read', true)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Erreur lors de la suppression des notifications lues:', error)
      throw error
    }
  },

  // Supprimer toutes les notifications
  deleteAll: async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', authUser.id)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Erreur lors de la suppression des notifications:', error)
      throw error
    }
  },

  // Envoyer un accusé de réception à l'employé qui a soumis la tâche
  sendAcknowledgment: async (notificationId, taskId, employeeId) => {
    try {
      // 1. Vérification de l'authentification
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // 2. Vérification du rôle (seule la directrice peut envoyer un accusé)
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('role, nom, email')
        .eq('id', authUser.id)
        .single()

      if (userError || !currentUser) {
        throw new Error('Impossible de récupérer les informations utilisateur')
      }

      if (currentUser.role !== 'directrice' && currentUser.role !== 'admin') {
        throw new Error('Seuls le directeur/directrice et l\'admin peuvent envoyer un accusé de réception')
      }

      // 3. Vérification que l'employé n'est pas la directrice elle-même
      if (employeeId === authUser.id) {
        throw new Error('Vous ne pouvez pas vous envoyer un accusé de réception à vous-même')
      }

      // 4. Vérification de l'existence de la tâche
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, assigned_to')
        .eq('id', taskId)
        .single()

      if (taskError || !task) {
        throw new Error('Tâche non trouvée ou inaccessible')
      }

      // 5. Vérification que l'employé est bien assigné à la tâche
      if (task.assigned_to && task.assigned_to !== employeeId) {
        console.warn('⚠️ L\'employé spécifié n\'est pas assigné à cette tâche')
      }

      // 6. Vérification de l'existence de l'employé
      const { data: employee, error: employeeError } = await supabase
        .from('users')
        .select('id, nom, email, role')
        .eq('id', employeeId)
        .single()

      if (employeeError || !employee) {
        throw new Error('Employé non trouvé')
      }

      // 7. Vérification que ce n'est pas un autre admin/directrice
      if (employee.role === 'admin' || employee.role === 'directrice') {
        throw new Error('Les accusés de réception ne peuvent être envoyés qu\'aux employés et chefs de service')
      }

      console.log('📧 Envoi de l\'accusé de réception:', {
        from: { id: authUser.id, nom: currentUser.nom },
        to: { id: employeeId, nom: employee.nom },
        task: { id: taskId, title: task.title }
      })

      // 8. Créer la notification UNIQUEMENT pour l'employé (jamais pour la directrice)
      const acknowledgmentData = {
        user_id: employeeId, // UNIQUEMENT l'ID de l'employé - la directrice ne recevra JAMAIS cette notification
        title: 'Accusé de réception',
        message: `${currentUser.role === 'admin' ? "L'administrateur" : 'Le directeur/la directrice'} ${currentUser.nom} a bien reçu votre soumission de la tâche "${task.title}"`,
        type: 'success',
        task_id: taskId,
        read: false,
        metadata: JSON.stringify({ 
          acknowledged_by: authUser.id,
          acknowledged_by_name: currentUser.nom,
          acknowledged_at: new Date().toISOString(),
          original_notification_id: notificationId
        }),
      }

      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert(acknowledgmentData)
        .select()
        .single()

      if (notifError) {
        console.error('❌ Erreur lors de la création de la notification pour l\'employé:', notifError)
        throw new Error(`Impossible de créer l'accusé de réception: ${notifError.message}`)
      }

      // 9. Mettre à jour la notification originale pour indiquer qu'elle a été accusée
      const { data: originalNotification } = await supabase
        .from('notifications')
        .select('id, metadata, user_id')
        .eq('id', notificationId)
        .single()

      if (originalNotification) {
        let metadata = {}
        try {
          metadata = originalNotification.metadata ? JSON.parse(originalNotification.metadata) : {}
        } catch (e) {
          console.warn('⚠️ Erreur lors du parsing des métadonnées:', e)
          metadata = {}
        }

        // Mettre à jour les métadonnées
        metadata.acknowledged = true
        metadata.acknowledged_at = new Date().toISOString()
        metadata.acknowledged_by = authUser.id
        metadata.acknowledged_by_name = currentUser.nom
        metadata.acknowledgment_notification_id = notification.id

        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            // Stocker les informations d'accusé de réception dans les métadonnées
            metadata: JSON.stringify(metadata),
          })
          .eq('id', notificationId)

        if (updateError) {
          console.warn('⚠️ Erreur lors de la mise à jour de la notification originale:', updateError)
          // Ne pas bloquer si la mise à jour échoue, l'accusé a déjà été envoyé
        }
      }

      console.log('✅ Accusé de réception envoyé avec succès:', {
        notificationId: notification.id,
        employeeId: employeeId,
        employeeName: employee.nom,
        directriceId: authUser.id,
        directriceName: currentUser.nom
      })

      return {
        ...notification,
        employeeName: employee.nom,
        directriceName: currentUser.nom
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'accusé de réception:', error)
      throw error
    }
  },
}

// Messagerie directe
export const messagesService = {
  send: async ({ recipientId, content }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non authentifié')
    if (!recipientId || !content) throw new Error('Destinataire et contenu requis')

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: recipientId,
      content,
    })
    if (error) throw error

    // Créer une notification ciblée (best effort)
    try {
      await supabase.from('notifications').insert({
        user_id: recipientId,
        title: 'Nouveau message',
        message: content.slice(0, 140),
        type: 'message',
        metadata: JSON.stringify({ sender_id: user.id }),
        read: false,
      })
    } catch (e) {
      console.warn('Notification message non envoyée (continuation) :', e.message)
    }

    return { success: true }
  },

  list: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non authentifié')

    // Récupérer les messages de l'utilisateur (inbox + envoyés)
    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) throw error
    const messages = msgs || []

    // Récupérer les profils des utilisateurs impliqués (sender/recipient)
    const ids = Array.from(
      new Set(
        messages
          .map((m) => [m.sender_id, m.recipient_id])
          .flat()
          .filter(Boolean)
      )
    )

    let usersMap = {}
    if (ids.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, nom, name, email, role')
        .in('id', ids)

      if (!usersError && usersData) {
        usersMap = usersData.reduce((acc, u) => {
          acc[u.id] = u
          return acc
        }, {})
      }
    }

    return messages.map((m) => ({
      ...m,
      sender: usersMap[m.sender_id] || null,
      recipient: usersMap[m.recipient_id] || null,
    }))
  },

  markRead: async (messageId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non authentifié')
    if (!messageId) return
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .eq('recipient_id', user.id)
  },

  update: async ({ id, content }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non authentifié')
    if (!id || !content) throw new Error('Identifiant et contenu requis')
    const { error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', id)
      .eq('sender_id', user.id)
    if (error) throw error
    return { success: true }
  },

  remove: async (id) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non authentifié')
    if (!id) return
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('sender_id', user.id)
    if (error) throw error
    return { success: true }
  }
}

export const reportsService = {
  // Récupérer tous les rapports depuis Supabase
  getAll: async (filters = {}) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le profil utilisateur
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Construire la requête selon le rôle
      let query = supabase.from('reports').select('*')

      // Filtrer selon le rôle
      if (userProfile?.role === 'employe' || userProfile?.role === 'chef') {
        query = query.eq('user_id', authUser.id)
      } else if (userProfile?.role === 'directrice') {
        // Le directeur ne voit que les rapports de sa direction
        const serviceNames = await directionsService.getServiceNamesForDirectorId(authUser.id)
        if (serviceNames?.length) {
          query = query.in('direction', serviceNames)
        }
      }
      // admin voit tout

      // Appliquer les filtres
      if (filters.week) {
        query = query.eq('week', filters.week)
      }
      if (filters.direction) {
        const structure = await directionsService.getStructure()
        const dirServices = structure[filters.direction]?.services
        if (dirServices?.length) {
          query = query.in('direction', dirServices)
        } else {
          query = query.eq('direction', filters.direction)
        }
      }

      const { data: reports, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Transformer les données pour correspondre au format attendu par l'UI
      return (reports || []).map((report) => {
        // Parser les données JSON si présentes
        let taskIds = []
        let taskStatistics = null
        let aiGeneratedContent = null
        
        try {
          if (report.task_ids) {
            taskIds = typeof report.task_ids === 'string' 
              ? JSON.parse(report.task_ids) 
              : report.task_ids
          }
          if (report.task_statistics) {
            taskStatistics = typeof report.task_statistics === 'string'
              ? JSON.parse(report.task_statistics)
              : report.task_statistics
          }
          if (report.ai_generated_content) {
            aiGeneratedContent = typeof report.ai_generated_content === 'string'
              ? JSON.parse(report.ai_generated_content)
              : report.ai_generated_content
          }
        } catch (e) {
          console.warn('Erreur lors du parsing des données JSON du rapport:', e)
        }

        return {
          id: report.id,
          userId: report.user_id,
          userName: report.user_name,
          direction: report.direction,
          week: report.week,
          status: report.status,
          sections: {
            objectifs: report.objectifs,
            realisations: report.realisations,
            difficultes: report.difficultes,
            solutions: report.solutions,
            besoins: report.besoins,
            perspectives: report.perspectives,
            conclusion: report.conclusion || null, // Gérer le cas où la colonne n'existe pas encore
          },
          taskIds,
          taskStatistics,
          aiGeneratedContent,
          autoGenerated: report.auto_generated || false,
          createdAt: report.created_at,
          updatedAt: report.updated_at,
        }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des rapports:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        let filtered = [...mockReports]
        if (filters.week) {
          filtered = filtered.filter((r) => r.week === filters.week)
        }
        if (filters.direction) {
          const structure = await directionsService.getStructure()
          const dirServices = structure[filters.direction]?.services
          if (dirServices?.length) {
            filtered = filtered.filter((r) => dirServices.includes(r.direction))
          } else {
            filtered = filtered.filter((r) => r.direction === filters.direction)
          }
        }
        return filtered
      }
      return []
    }
  },

  // Récupérer un rapport par ID depuis Supabase
  getById: async (id) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      const { data: report, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      if (!report) {
        throw new Error('Rapport non trouvé')
      }

      return {
        id: report.id,
        userId: report.user_id,
        userName: report.user_name,
        direction: report.direction,
        week: report.week,
        status: report.status,
        sections: {
          objectifs: report.objectifs,
          realisations: report.realisations,
          difficultes: report.difficultes,
          solutions: report.solutions,
          besoins: report.besoins,
          perspectives: report.perspectives,
          conclusion: report.conclusion || null, // Gérer le cas où la colonne n'existe pas encore
        },
        createdAt: report.created_at,
        updatedAt: report.updated_at,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du rapport:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        return mockReports.find((r) => r.id === parseInt(id))
      }
      throw error
    }
  },

  // Créer un rapport dans Supabase
  create: async (reportData) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le profil utilisateur pour obtenir la direction si non fournie
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      const insertData = {
        user_id: reportData.userId || authUser.id,
        user_name: reportData.userName || userProfile?.nom || 'Utilisateur',
        direction: reportData.direction || userProfile?.direction || 'Non renseigné',
        week: reportData.week,
        status: reportData.status || 'brouillon',
        objectifs: reportData.objectifs || reportData.sections?.objectifs || null,
        realisations: reportData.realisations || reportData.sections?.realisations || null,
        difficultes: reportData.difficultes || reportData.sections?.difficultes || null,
        solutions: reportData.solutions || reportData.sections?.solutions || null,
        besoins: reportData.besoins || reportData.sections?.besoins || null,
        perspectives: reportData.perspectives || reportData.sections?.perspectives || null,
      }
      
      // Inclure la conclusion si elle existe dans les données
      const conclusionValue = reportData.conclusion !== undefined 
        ? reportData.conclusion 
        : (reportData.sections?.conclusion !== undefined ? reportData.sections.conclusion : '')
      
      // Ajouter conclusion seulement si elle a une valeur (pour éviter erreur 400 si colonne n'existe pas)
      // Si la colonne n'existe pas, le retry la retirera automatiquement
      if (conclusionValue !== null && conclusionValue !== undefined && String(conclusionValue).trim() !== '') {
        insertData.conclusion = String(conclusionValue).trim()
      }

      // Ajouter les données liées aux tâches si disponibles
      if (reportData.taskIds) {
        insertData.task_ids = JSON.stringify(reportData.taskIds)
      }
      if (reportData.taskStatistics) {
        insertData.task_statistics = typeof reportData.taskStatistics === 'string' 
          ? reportData.taskStatistics 
          : JSON.stringify(reportData.taskStatistics)
      }
      if (reportData.autoGenerated !== undefined) {
        insertData.auto_generated = reportData.autoGenerated
      }
      if (reportData.aiGeneratedContent) {
        insertData.ai_generated_content = typeof reportData.aiGeneratedContent === 'string'
          ? reportData.aiGeneratedContent
          : JSON.stringify(reportData.aiGeneratedContent)
      }

      let { data: newReport, error } = await supabase
        .from('reports')
        .insert(insertData)
        .select()
        .single()

      // Si erreur liée à la colonne 'conclusion' manquante, réessayer sans conclusion
      if (error && (error.message?.includes('conclusion') || error.message?.includes('Could not find'))) {
        console.warn('⚠️ Colonne "conclusion" non trouvée dans la base de données')
        console.warn('⚠️ Veuillez créer la colonne "conclusion" dans la table "reports" de Supabase')
        // Retirer conclusion de insertData si elle était présente
        const { conclusion, ...insertDataWithoutConclusion } = insertData
        const retryData = insertDataWithoutConclusion
        
        const retryResult = await supabase
          .from('reports')
          .insert(retryData)
          .select()
          .single()
        
        if (retryResult.error) {
          throw retryResult.error
        }
        newReport = retryResult.data
        error = null
      }

      if (error) {
        throw error
      }

      return {
        id: newReport.id,
        userId: newReport.user_id,
        userName: newReport.user_name,
        direction: newReport.direction,
        week: newReport.week,
        status: newReport.status,
        sections: {
          objectifs: newReport.objectifs,
          realisations: newReport.realisations,
          difficultes: newReport.difficultes,
          solutions: newReport.solutions,
          besoins: newReport.besoins,
          perspectives: newReport.perspectives,
          conclusion: newReport.conclusion || null, // Gérer le cas où la colonne n'existe pas encore
        },
        createdAt: newReport.created_at,
        updatedAt: newReport.updated_at,
      }
    } catch (error) {
      console.error('Erreur lors de la création du rapport:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        const newReport = {
          id: mockReports.length + 1,
          ...reportData,
          createdAt: new Date().toISOString(),
          status: 'brouillon',
        }
        mockReports.push(newReport)
        return newReport
      }
      throw error
    }
  },

  // Récupérer un rapport par semaine pour l'utilisateur actuel
  getByWeek: async (week) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      const { data: report, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('week', week)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!report) {
        return null
      }

      return {
        id: report.id,
        userId: report.user_id,
        userName: report.user_name,
        direction: report.direction,
        week: report.week,
        status: report.status,
        sections: {
          objectifs: report.objectifs,
          realisations: report.realisations,
          difficultes: report.difficultes,
          solutions: report.solutions,
          besoins: report.besoins,
          perspectives: report.perspectives,
          conclusion: report.conclusion || null, // Gérer le cas où la colonne n'existe pas encore
        },
        createdAt: report.created_at,
        updatedAt: report.updated_at,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du rapport par semaine:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        return mockReports.find((r) => r.week === week) || null
      }
      throw error
    }
  },

  // Mettre à jour un rapport
  update: async (id, reportData) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le profil utilisateur pour obtenir la direction si non fournie
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      const updateData = {
        user_name: reportData.userName || userProfile?.nom || 'Utilisateur',
        direction: reportData.direction || userProfile?.direction || 'Non renseigné',
        status: reportData.status || 'brouillon',
        objectifs: reportData.objectifs || reportData.sections?.objectifs || null,
        realisations: reportData.realisations || reportData.sections?.realisations || null,
        difficultes: reportData.difficultes || reportData.sections?.difficultes || null,
        solutions: reportData.solutions || reportData.sections?.solutions || null,
        besoins: reportData.besoins || reportData.sections?.besoins || null,
        perspectives: reportData.perspectives || reportData.sections?.perspectives || null,
      }
      
      // Inclure la conclusion si elle existe dans les données
      const conclusionValue = reportData.conclusion !== undefined 
        ? reportData.conclusion 
        : (reportData.sections?.conclusion !== undefined ? reportData.sections.conclusion : '')
      
      // Essayer d'ajouter conclusion seulement si elle a une valeur (pour éviter erreur si colonne n'existe pas)
      // Si la colonne n'existe pas, le retry la retirera automatiquement
      if (conclusionValue !== null && conclusionValue !== undefined && String(conclusionValue).trim() !== '') {
        updateData.conclusion = String(conclusionValue).trim()
      }

      // Ajouter les données liées aux tâches si disponibles
      if (reportData.taskIds) {
        updateData.task_ids = JSON.stringify(reportData.taskIds)
      }
      if (reportData.taskStatistics) {
        updateData.task_statistics = typeof reportData.taskStatistics === 'string' 
          ? reportData.taskStatistics 
          : JSON.stringify(reportData.taskStatistics)
      }
      if (reportData.autoGenerated !== undefined) {
        updateData.auto_generated = reportData.autoGenerated
      }
      if (reportData.aiGeneratedContent) {
        updateData.ai_generated_content = typeof reportData.aiGeneratedContent === 'string'
          ? reportData.aiGeneratedContent
          : JSON.stringify(reportData.aiGeneratedContent)
      }

      let { data: updatedReport, error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', authUser.id) // S'assurer que l'utilisateur ne peut mettre à jour que ses propres rapports
        .select()
        .single()

      // Si erreur liée à la colonne 'conclusion' manquante, réessayer sans conclusion
      if (error && (error.message?.includes('conclusion') || error.message?.includes('Could not find'))) {
        console.warn('⚠️ Colonne "conclusion" non trouvée dans la base de données')
        console.warn('⚠️ Veuillez créer la colonne "conclusion" dans la table "reports" de Supabase')
        // Retirer conclusion de updateData si elle était présente
        const { conclusion, ...updateDataWithoutConclusion } = updateData
        const retryData = updateDataWithoutConclusion
        
        const retryResult = await supabase
          .from('reports')
          .update(retryData)
          .eq('id', id)
          .eq('user_id', authUser.id)
          .select()
          .single()
        
        if (retryResult.error) {
          throw retryResult.error
        }
        updatedReport = retryResult.data
        error = null
      }

      if (error) {
        throw error
      }

      return {
        id: updatedReport.id,
        userId: updatedReport.user_id,
        userName: updatedReport.user_name,
        direction: updatedReport.direction,
        week: updatedReport.week,
        status: updatedReport.status,
        sections: {
          objectifs: updatedReport.objectifs,
          realisations: updatedReport.realisations,
          difficultes: updatedReport.difficultes,
          solutions: updatedReport.solutions,
          besoins: updatedReport.besoins,
          perspectives: updatedReport.perspectives,
          conclusion: updatedReport.conclusion || null, // Gérer le cas où la colonne n'existe pas encore
        },
        createdAt: updatedReport.created_at,
        updatedAt: updatedReport.updated_at,
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rapport:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        const index = mockReports.findIndex((r) => r.id === parseInt(id))
        if (index === -1) throw new Error('Rapport non trouvé')
        mockReports[index] = { ...mockReports[index], ...reportData }
        return mockReports[index]
      }
      throw error
    }
  },

  // Envoyer un rapport
  submit: async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const index = mockReports.findIndex((r) => r.id === parseInt(id))
    if (index === -1) throw new Error('Rapport non trouvé')
    mockReports[index].status = 'envoye'
    return mockReports[index]
  },

  // Générer automatiquement un rapport à partir des tâches de la semaine
  generateFromTasks: async (weekStart) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Importer le service de génération IA
      const { generateWeeklyReportWithAI } = await import('./aiReportGenerator.js')
      
      // Générer le rapport avec l'IA
      const generatedReport = await generateWeeklyReportWithAI(authUser.id, weekStart)
      
      return generatedReport
    } catch (error) {
      console.error('Erreur lors de la génération automatique du rapport:', error)
      throw error
    }
  },

  // Envoyer automatiquement le rapport à la directrice
  sendToDirectrice: async (reportId) => {
    try {
      const { sendReportToDirectrice } = await import('./aiReportGenerator.js')
      return await sendReportToDirectrice(reportId)
    } catch (error) {
      console.error('Erreur lors de l\'envoi du rapport à la directrice:', error)
      throw error
    }
  },
}

const INVOICES_LOCAL_STORAGE_KEY = 'crg-invoices-v1'

const readLocalInvoices = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(INVOICES_LOCAL_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeLocalInvoices = (rows) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(INVOICES_LOCAL_STORAGE_KEY, JSON.stringify(rows || []))
}

const mapInvoiceRow = (row) => ({
  id: row.id,
  createdBy: row.created_by,
  createdByName: row.created_by_name,
  direction: row.direction,
  date: row.date || null,
  natureDepense: row.nature_depense || '',
  items: Array.isArray(row.items)
    ? row.items
    : (typeof row.items === 'string'
        ? (() => {
            try {
              return JSON.parse(row.items)
            } catch {
              return []
            }
          })()
        : []),
  walletNumber: row.wallet_number || '',
  applyFees: row.apply_fees !== false,
  isMedicalReimbursement: row.is_medical_reimbursement === true,
  totals: {
    totalDepenses: Number(row.total_depenses || 0),
    basePriseEnCharge: Number(row.base_prise_en_charge || 0),
    resteEmploye: Number(row.reste_employe || 0),
    fraisWallet: Number(row.frais_wallet || 0),
    totalFacture: Number(row.total_facture || 0),
  },
  imputationGenerale: {
    debit: row.imputation_debit || ['', '', ''],
    credit: row.imputation_credit || ['', '', ''],
  },
  imputationAnalytique: row.imputation_analytique || ['', '', ''],
  status: row.status || 'brouillon',
  applicantSignature: row.applicant_signature || '',
  applicantSignatureImage: row.applicant_signature_image || '',
  directorSignature: row.director_signature || '',
  directorStamp: row.director_stamp || '',
  directorStampImage: row.director_stamp_image || '',
  signedBy: row.signed_by || null,
  signedAt: row.signed_at || null,
  transmittedAt: row.transmitted_at || null,
  paidAt: row.paid_at || null,
  paidBy: row.paid_by || null,
  paymentReference: row.payment_reference || '',
  archivedAt: row.archived_at || null,
  archivedBy: row.archived_by || null,
  rejectionReason: row.rejection_reason || '',
  createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
})

const makeInvoicePayload = (invoiceData, authUser, userProfile) => ({
  created_by: authUser.id,
  created_by_name: invoiceData.createdByName || userProfile?.nom || userProfile?.username || authUser.email || 'Utilisateur',
  direction: invoiceData.direction || userProfile?.direction || null,
  date: invoiceData.date || null,
  nature_depense: invoiceData.natureDepense || '',
  items: JSON.stringify(invoiceData.items || []),
  wallet_number: invoiceData.walletNumber || '',
  apply_fees: invoiceData.applyFees !== false,
  is_medical_reimbursement: invoiceData.isMedicalReimbursement === true,
  total_depenses: Number(invoiceData.totals?.totalDepenses || 0),
  base_prise_en_charge: Number(invoiceData.totals?.basePriseEnCharge || 0),
  reste_employe: Number(invoiceData.totals?.resteEmploye || 0),
  frais_wallet: Number(invoiceData.totals?.fraisWallet || 0),
  total_facture: Number(invoiceData.totals?.totalFacture || 0),
  imputation_debit: invoiceData.imputationGenerale?.debit || ['', '', ''],
  imputation_credit: invoiceData.imputationGenerale?.credit || ['', '', ''],
  imputation_analytique: invoiceData.imputationAnalytique || ['', '', ''],
  status: invoiceData.status || 'brouillon',
})

const notifyUsers = async (userIds, title, message, metadata = {}) => {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))]
  if (!uniqueIds.length) return
  const payload = uniqueIds.map((uid) => ({
    user_id: uid,
    title,
    message,
    type: 'invoice',
    read: false,
    metadata: JSON.stringify({
      ...metadata,
      created_at: new Date().toISOString(),
    }),
  }))
  const { data, error } = await supabase.from('notifications').insert(payload).select()
  if (error) {
    console.error('❌ [notifyUsers] Erreur insertion notifications factures:', error)
    throw error
  }
  if (data?.length) {
    console.log('✅ [notifyUsers] Notifications factures insérées:', data.length, 'pour', uniqueIds)
  }
}

// S'assurer d'avoir un utilisateur authentifié (rafraîchit ou restaure la session si nécessaire)
const ensureAuthUser = async () => {
  let user = null
  try {
    // 1. Essayer getSession (cache local, ne lance pas si session manquante)
    const { data: { session } } = await supabase.auth.getSession()
    user = session?.user
  } catch (_) {
    /* ignore */
  }
  if (!user) {
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      user = u
    } catch (_) {
      /* ignore */
    }
  }
  if (!user) {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (!error && session?.user) user = session.user
    } catch (_) {
      /* ignore */
    }
  }
  if (!user) {
    // Dernier recours: restaurer depuis le localStorage (crg-auth-storage)
    try {
      const stored = typeof localStorage !== 'undefined' && localStorage.getItem('crg-auth-storage')
      if (stored) {
        const parsed = JSON.parse(stored)
        const token = parsed.token || parsed.state?.token
        const refreshToken = parsed.refreshToken || parsed.state?.refreshToken
        if (token && refreshToken) {
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken,
          })
          if (!error && session?.user) return session.user
        }
      }
    } catch (e) {
      console.warn('⚠️ Restauration session depuis localStorage:', e?.message)
    }
  }
  if (!user) throw new Error('Utilisateur non authentifié')
  return user
}

export const invoicesService = {
  getAll: async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Utilisateur non authentifié')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, role, direction')
        .eq('id', authUser.id)
        .single()

      let query = supabase.from('invoices').select('*').order('created_at', { ascending: false })
      const role = String(userProfile?.role || '').toLowerCase()

      if (role === 'employe' || role === 'chef') {
        query = query.eq('created_by', authUser.id)
      } else if (role === 'comptable') {
        query = query.in('status', ['transmis_comptabilite', 'virement_effectue'])
      } else if (role === 'gestion') {
        query = query.in('status', ['controle_gestion', 'transmis_comptabilite', 'virement_effectue'])
      } else if (role === 'directrice') {
        // Le directeur ne voit que les factures de sa direction
        const serviceNames = await directionsService.getServiceNamesForDirectorId(authUser.id)
        if (serviceNames.length) {
          const { data: userIds } = await supabase.from('users').select('id').in('direction', serviceNames)
          const ids = (userIds || []).map((u) => u.id)
          query = ids.length ? query.in('created_by', ids) : query.in('created_by', []) // Aucun membre = aucune facture
        }
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []).map(mapInvoiceRow)
    } catch (error) {
      console.warn('⚠️ invoicesService.getAll fallback local:', error?.message)
      const localRows = readLocalInvoices()
      return localRows.map(mapInvoiceRow).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
  },

  create: async (invoiceData) => {
    const authUser = await ensureAuthUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, nom, username, email, direction')
      .eq('id', authUser.id)
      .single()

    const payload = makeInvoicePayload(invoiceData, authUser, userProfile)

    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error
      return mapInvoiceRow(data)
    } catch (error) {
      console.warn('⚠️ invoicesService.create fallback local:', error?.message)
      const rows = readLocalInvoices()
      const newRow = {
        id: `local-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      rows.unshift(newRow)
      writeLocalInvoices(rows)
      return mapInvoiceRow(newRow)
    }
  },

  update: async (id, partialData) => {
    const patch = { ...partialData, updated_at: new Date().toISOString() }
    if (patch.items && !Array.isArray(patch.items) && typeof patch.items !== 'string') {
      patch.items = JSON.stringify(patch.items)
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return mapInvoiceRow(data)
    } catch (error) {
      const rows = readLocalInvoices()
      const idx = rows.findIndex((r) => String(r.id) === String(id))
      if (idx < 0) throw error
      rows[idx] = { ...rows[idx], ...patch }
      writeLocalInvoices(rows)
      return mapInvoiceRow(rows[idx])
    }
  },

  submitToDirectrice: async (id, { applicantSignature = '', applicantSignatureImage = null } = {}) => {
    const authUser = await ensureAuthUser()

    // SÉCURITÉ : Seul le créateur peut signer sa partie (signature du demandeur)
    const { data: invoiceRow, error: fetchErr } = await supabase
      .from('invoices')
      .select('id, created_by, status')
      .eq('id', id)
      .single()
    if (fetchErr || !invoiceRow) {
      throw new Error('Facture introuvable.')
    }
    if (invoiceRow.status !== 'brouillon') {
      throw new Error('Seules les factures en brouillon peuvent être soumises.')
    }
    if (invoiceRow.created_by !== authUser.id) {
      throw new Error('Vous ne pouvez signer que les factures que vous avez créées. Seul le créateur peut apposer sa signature et soumettre.')
    }

    const invoice = await invoicesService.update(id, {
      status: 'soumis_directrice',
      submitted_at: new Date().toISOString(),
      applicant_signature: applicantSignature || null,
      applicant_signature_image: applicantSignatureImage || null,
    })

    try {
      // Notifier uniquement le directeur de la direction de l'expéditeur
      const directorId = await directionsService.getDirectorIdForUserId(invoice.createdBy || invoice.created_by)
      const targetIds = directorId ? [directorId] : []
      if (targetIds.length === 0) {
        const { data: fallback } = await supabase.from('users').select('id').eq('role', 'directrice')
        if (fallback?.length) targetIds.push(...fallback.map((u) => u.id))
      }
      if (targetIds.length > 0) {
        await notifyUsers(
          targetIds,
          'Nouvelle facture à signer',
          `${invoice.createdByName || 'Un employé'} a soumis une facture pour validation.`,
          { invoice_id: invoice.id, status: 'soumis_directrice' }
        )
      }
    } catch (e) {
      console.warn('⚠️ Notification directeur non envoyée:', e?.message)
    }

    return invoice
  },

  signAndTransmit: async (id, { signatureName, stampLabel, stampImage, signaturePin }) => {
    const authUser = await ensureAuthUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, direction')
      .eq('id', authUser.id)
      .single()
    const role = String(userProfile?.role || '').toLowerCase()

    // SÉCURITÉ : Seul le directeur/directrice ou admin peut signer
    if (role !== 'directrice' && role !== 'admin') {
      throw new Error('Seul le directeur/directrice ou l\'admin peut signer une facture.')
    }

    // SÉCURITÉ : Le directeur/admin DOIT avoir un PIN défini pour signer
    const hasPin = await usersService.hasSignaturePin()
    if (!hasPin) {
      throw new Error('Vous devez définir votre PIN de signature dans votre profil avant de pouvoir signer des factures.')
    }
    if (!signaturePin || String(signaturePin).trim().length < 4) {
      throw new Error('PIN de signature requis (4 à 6 chiffres).')
    }
    await usersService.verifySignaturePin(signaturePin)

    // Récupérer la facture avant signature
    const { data: invoiceRow, error: fetchError } = await supabase
      .from('invoices')
      .select('id, created_by, direction, status')
      .eq('id', id)
      .single()
    if (fetchError || !invoiceRow) {
      throw new Error('Facture introuvable.')
    }
    if (invoiceRow.status !== 'soumis_directrice') {
      throw new Error('Cette facture n\'est pas en attente de signature.')
    }

    // SÉCURITÉ : Interdire de signer sa propre facture (employé malveillant)
    if (invoiceRow.created_by === authUser.id) {
      throw new Error('Vous ne pouvez pas signer votre propre facture. La signature doit être effectuée par le directeur/directrice de votre direction.')
    }

    // SÉCURITÉ : Le directeur ne peut signer que les factures de sa direction
    if (role === 'directrice') {
      const directorIdForInvoice = await directionsService.getDirectorIdForUserId(invoiceRow.created_by)
      if (directorIdForInvoice !== authUser.id) {
        throw new Error('Vous ne pouvez signer que les factures des employés de votre direction.')
      }
    }

    const signedAt = new Date().toISOString()
    const invoice = await invoicesService.update(id, {
      status: 'controle_gestion',
      director_signature: signatureName || '',
      director_stamp: stampLabel || '',
      director_stamp_image: stampImage || null,
      signed_by: authUser?.id || null,
      signed_at: signedAt,
      transmitted_at: null,
    })

    try {
      let { data: gestionUsers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'gestion')

      if (gestionUsers?.length) {
        await notifyUsers(
          gestionUsers.map((u) => u.id),
          'Facture signée – Contrôle Service Gestion',
          `Facture signée par le directeur/directrice, en attente de contrôle.`,
          { invoice_id: invoice.id, status: 'controle_gestion' }
        )
      }
    } catch (e) {
      console.warn('⚠️ Notification Service Gestion non envoyée:', e?.message)
    }

    return invoice
  },

  transferToFinance: async (id) => {
    const authUser = await ensureAuthUser()
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    const role = String(userProfile?.role || '').toLowerCase()
    if (role !== 'gestion' && role !== 'admin') {
      throw new Error('Seul le Service Gestion peut transférer les factures vers le Service Financier.')
    }
    const transmittedAt = new Date().toISOString()
    const invoice = await invoicesService.update(id, {
      status: 'transmis_comptabilite',
      transmitted_at: transmittedAt,
    })

    try {
      let { data: accountants } = await supabase
        .from('users')
        .select('id')
        .in('role', ['comptable'])
      if (!accountants || accountants.length === 0) {
        const { data: lectureUsers } = await supabase.from('users').select('id').eq('role', 'lecture')
        accountants = lectureUsers || []
      }
      if (accountants?.length) {
        await notifyUsers(
          accountants.map((u) => u.id),
          'Facture transmise au Service Financier',
          `Facture contrôlée et transmise pour virement.`,
          { invoice_id: invoice.id, status: 'transmis_comptabilite' }
        )
      }
    } catch (e) {
      console.warn('⚠️ Notification Service Financier non envoyée:', e?.message)
    }

    return invoice
  },

  rejectByGestion: async (id, rejectionReason = '') => {
    const authUser = await ensureAuthUser()
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    const role = String(userProfile?.role || '').toLowerCase()
    if (role !== 'gestion' && role !== 'admin') {
      throw new Error('Seul le Service Gestion peut rejeter une facture en contrôle.')
    }
    const invoice = await invoicesService.update(id, {
      status: 'rejete',
      rejection_reason: rejectionReason || null,
      rejected_at: new Date().toISOString(),
      rejected_by: authUser?.id || null,
    })
    try {
      if (invoice.createdBy) {
        await notifyUsers(
          [invoice.createdBy],
          'Facture rejetée par le Service Gestion',
          rejectionReason ? `Raison : ${rejectionReason}` : 'La facture a été rejetée. Veuillez la modifier et la resoumettre.',
          { invoice_id: invoice.id, status: 'rejete' }
        )
      }
    } catch (e) {
      console.warn('⚠️ Notification rejet non envoyée:', e?.message)
    }
    return invoice
  },

  rejectByDirector: async (id, rejectionReason = '') => {
    const authUser = await ensureAuthUser()
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    const role = String(userProfile?.role || '').toLowerCase()
    if (role !== 'directrice' && role !== 'admin') {
      throw new Error('Seul le directeur/directrice peut rejeter une facture en attente de signature.')
    }
    const invoice = await invoicesService.update(id, {
      status: 'rejete',
      rejection_reason: rejectionReason || null,
      rejected_at: new Date().toISOString(),
      rejected_by: authUser?.id || null,
    })
    try {
      if (invoice.createdBy) {
        await notifyUsers(
          [invoice.createdBy],
          'Facture rejetée par le directeur/directrice',
          rejectionReason ? `Raison : ${rejectionReason}` : 'La facture a été rejetée. Veuillez la modifier et la resoumettre.',
          { invoice_id: invoice.id, status: 'rejete' }
        )
      }
    } catch (e) {
      console.warn('⚠️ Notification rejet non envoyée:', e?.message)
    }
    return invoice
  },

  markPaid: async (id, paymentReference = '') => {
    const authUser = await ensureAuthUser()
    const paidAt = new Date().toISOString()
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    const isComptable = ['comptable', 'lecture'].includes((userProfile?.role || '').toLowerCase())
    const updatePayload = {
      status: 'virement_effectue',
      paid_at: paidAt,
      paid_by: authUser?.id || null,
      payment_reference: paymentReference || '',
    }
    if (isComptable) {
      updatePayload.archived_at = paidAt
      updatePayload.archived_by = authUser?.id || null
    }
    const invoice = await invoicesService.update(id, updatePayload)

    try {
      const toNotify = []
      if (invoice.createdBy) toNotify.push(invoice.createdBy)
      const { data: directrices } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'directrice')
      if (directrices?.length) {
        directrices.forEach((d) => {
          if (d.id && !toNotify.includes(d.id)) toNotify.push(d.id)
        })
      }
      if (toNotify.length > 0) {
        await notifyUsers(
          toNotify,
          'Virement validé par la comptabilité',
          `La facture de ${invoice.createdByName || 'un employé'} a été validée et le virement est effectué.`,
          { invoice_id: invoice.id, status: 'virement_effectue' }
        )
      }
    } catch (e) {
      console.warn('⚠️ Notification validation comptable non envoyée:', e?.message)
    }

    return invoice
  },

  archive: async (id) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Utilisateur non authentifié')
    return invoicesService.update(id, {
      archived_at: new Date().toISOString(),
      archived_by: authUser.id,
    })
  },
}

export const usersService = {
  // Récupérer tous les utilisateurs depuis Supabase
  getAll: async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le profil utilisateur pour vérifier les permissions
      console.log('🔍 [usersService.getAll] Début de la récupération du profil...')
      console.log('  - Auth User ID:', authUser.id)
      console.log('  - Auth User Email:', authUser.email)
      
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      console.log('🔍 [usersService.getAll] Résultat de la requête profil:')
      console.log('  - User Profile:', userProfile)
      console.log('  - User Role:', userProfile?.role)
      console.log('  - Profile Error:', profileError)
      console.log('  - Profile Error Code:', profileError?.code)
      console.log('  - Profile Error Message:', profileError?.message)

      if (profileError) {
        console.error('❌ [usersService.getAll] Erreur lors de la récupération du profil:', profileError)
        // Si c'est une erreur de permission (RLS), donner un message plus clair
        if (profileError.code === 'PGRST116' || profileError.message?.includes('permission') || profileError.message?.includes('policy')) {
          throw new Error(`Erreur de permission: ${profileError.message}. Vérifiez que RLS est désactivé pour la table users ou que les politiques RLS sont correctement configurées.`)
        }
        throw new Error(`Erreur lors de la récupération du profil: ${profileError.message}`)
      }

      if (!userProfile) {
        console.error('❌ [usersService.getAll] Profil utilisateur non trouvé')
        throw new Error('Profil utilisateur non trouvé dans la base de données')
      }

      console.log('🔍 [usersService.getAll] Vérification du rôle:', userProfile.role)

      // Construire la requête selon le rôle
      let query = supabase.from('users').select('*', { count: 'exact' })

      // Admin voit tous les utilisateurs
      if (userProfile?.role === 'admin') {
        console.log('✅ [usersService.getAll] Accès autorisé - Rôle admin confirmé')
        // Pas de filtre, voir tous les utilisateurs
      } 
      // Chef voit les utilisateurs de sa direction
      else if (userProfile?.role === 'chef' && userProfile.direction) {
        console.log('✅ [usersService.getAll] Accès autorisé - Chef, filtre par direction:', userProfile.direction)
        query = query.eq('direction', userProfile.direction)
      }
      // Directrice voit tous les utilisateurs
      else if (userProfile?.role === 'directrice') {
        console.log('✅ [usersService.getAll] Accès autorisé - Rôle directrice confirmé')
        // Pas de filtre, voir tous les utilisateurs
      }
      // Autres rôles ne peuvent pas voir les utilisateurs
      else {
        console.warn('⚠️ [usersService.getAll] Accès refusé - Rôle actuel:', userProfile?.role)
        throw new Error(`Accès non autorisé. Rôle actuel: ${userProfile?.role || 'non défini'}. Seul l'admin, le directeur/directrice ou le chef peuvent voir les utilisateurs.`)
      }

      // Exécuter la requête
      const { data: users, error, count } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur Supabase lors de la récupération des utilisateurs:', error)
        throw error
      }

      console.log(`Nombre d'utilisateurs récupérés: ${users?.length || 0} (total dans DB: ${count || 0})`)

      // Transformer les données pour correspondre au format attendu par l'UI
      const transformedUsers = (users || []).map((user) => {
        const transformed = {
          id: user.id,
          email: user.email,
          name: [user.prenom, user.nom].filter(Boolean).join(' ').trim() || user.nom || user.username || user.email?.split('@')[0] || 'Utilisateur',
          username: user.username,
          nom: user.nom,
          prenom: user.prenom,
          matricule: user.matricule,
          role: user.role, // Rôle depuis la base de données
          direction: user.direction,
          fonction: user.fonction,
          gender: user.gender || null,
          isActive: user.is_active,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        }
        // Debug: Log chaque utilisateur transformé
        console.log(`  📋 [usersService.getAll] Utilisateur transformé: ${transformed.name} (${transformed.email}) - rôle: "${transformed.role}"`)
        return transformed
      })
      return transformedUsers
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error)
      // Fallback sur les données mockées
      if (!import.meta.env.VITE_SUPABASE_URL) {
        return []
      }
      throw error
    }
  },

  // Récupérer un utilisateur par ID depuis Supabase
  getById: async (id) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      if (!user) {
        throw new Error('Utilisateur non trouvé')
      }

      return {
        id: user.id,
        email: user.email,
        name: user.nom || user.username || user.email?.split('@')[0] || 'Utilisateur',
        username: user.username,
        role: user.role,
        direction: user.direction,
        fonction: user.fonction,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error)
      throw error
    }
  },

  // Mettre à jour un utilisateur dans Supabase
  update: async (id, userData) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le profil utilisateur pour vérifier les permissions
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Vérifier si l'utilisateur modifie son propre profil
      const isOwnProfile = authUser.id === id

      // Si ce n'est pas son propre profil, seul admin peut modifier
      if (!isOwnProfile) {
        if (userProfile?.role !== 'admin') {
          throw new Error('Accès non autorisé. Seul l\'admin peut modifier les autres utilisateurs.')
        }
        if (userProfile?.is_active === false) {
          throw new Error('Votre compte administrateur est désactivé.')
        }

        // Empêcher admin de modifier le compte admin (la directrice peut être modifiée)
        const { data: targetUser } = await supabase
          .from('users')
          .select('role')
          .eq('id', id)
          .single()

        if (targetUser && targetUser.role === 'admin') {
          throw new Error('Vous ne pouvez pas modifier le compte admin.')
        }
      } else {
        // L'utilisateur modifie son propre profil
        // Empêcher de modifier le rôle et l'email (géré séparément)
        if (userData.role && userData.role !== userProfile?.role) {
          throw new Error('Vous ne pouvez pas modifier votre propre rôle.')
        }
      }

      // Construire les données à mettre à jour
      const updateData = {
        updated_at: new Date().toISOString(),
      }

      // Ajouter les champs modifiables
      if (userData.name !== undefined) {
        updateData.nom = userData.name
      }
      if (userData.nom !== undefined) {
        updateData.nom = userData.nom
      }
      if (userData.prenom !== undefined) {
        updateData.prenom = userData.prenom
      }
      if (userData.matricule !== undefined) {
        updateData.matricule = userData.matricule
      }
      if (userData.email !== undefined && !isOwnProfile) {
        // L'email est géré séparément pour son propre profil
        updateData.email = userData.email
      }
      if (userData.role !== undefined && !isOwnProfile) {
        // Seul admin peut modifier le rôle (et pas son propre rôle)
        updateData.role = userData.role
      }
      if (userData.direction !== undefined) {
        updateData.direction = userData.direction || null
      }
      if (userData.fonction !== undefined) {
        updateData.fonction = userData.fonction || null
      }
      if (userData.gender !== undefined) {
        updateData.gender = userData.gender && ['M', 'F'].includes(String(userData.gender).toUpperCase()) ? String(userData.gender).toUpperCase() : null
      }
      console.log('💾 [usersService.update] Données à mettre à jour:', updateData)
      console.log('💾 [usersService.update] ID utilisateur:', id)

      // Mettre à jour l'email dans Supabase Auth si nécessaire
      if (userData.email) {
        const { data: targetUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single()

        if (targetUser && targetUser.email !== userData.email) {
          console.log('📧 [usersService.update] Email changé, mise à jour dans la table users uniquement')
          // Mettre à jour l'email dans Auth (nécessite la clé service_role ou l'utilisateur lui-même)
          // Pour l'instant, on met juste à jour dans la table users
          // L'utilisateur devra mettre à jour son email via la page Profile
        }
      }

      console.log('🔄 [usersService.update] Exécution de la mise à jour dans Supabase...')
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ [usersService.update] Erreur Supabase:', error)
        console.error('   Code:', error.code)
        console.error('   Message:', error.message)
        console.error('   Details:', error.details)
        throw error
      }

      if (!updatedUser) {
        throw new Error('Aucune donnée retournée après la mise à jour')
      }

      // Si directeur·trice, synchroniser directions.director_id
      if (updatedUser.role === 'directrice') {
        if (updatedUser.direction) {
          await supabase.from('directions').update({ director_id: null, updated_at: new Date().toISOString() }).eq('director_id', id)
          const { data: dir } = await supabase.from('directions').select('id').eq('name', updatedUser.direction).single()
          if (dir) {
            await supabase.from('directions').update({ director_id: id, updated_at: new Date().toISOString() }).eq('id', dir.id)
          }
        } else {
          await supabase.from('directions').update({ director_id: null, updated_at: new Date().toISOString() }).eq('director_id', id)
        }
      } else {
        await supabase.from('directions').update({ director_id: null, updated_at: new Date().toISOString() }).eq('director_id', id)
      }

      console.log('✅ [usersService.update] Utilisateur mis à jour avec succès:', updatedUser)

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.nom || updatedUser.username || updatedUser.email?.split('@')[0] || 'Utilisateur',
        username: updatedUser.username,
        role: updatedUser.role,
        direction: updatedUser.direction,
        fonction: updatedUser.fonction,
        gender: updatedUser.gender || null,
        isActive: updatedUser.is_active,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error)
      throw error
    }
  },

  // Supprimer un utilisateur (métadonnées seulement)
  delete: async (id) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le profil utilisateur pour vérifier les permissions
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Seul admin peut supprimer les utilisateurs
      if (userProfile?.role !== 'admin') {
        throw new Error('Accès non autorisé. Seul l\'admin peut supprimer les utilisateurs.')
      }
      if (userProfile?.is_active === false) {
        throw new Error('Votre compte administrateur est désactivé.')
      }

      // Ne pas permettre de se supprimer soi-même
      if (id === authUser.id) {
        throw new Error('Vous ne pouvez pas supprimer votre propre compte.')
      }

      // Empêcher admin de supprimer uniquement le compte admin (la directrice peut être supprimée)
      const { data: targetUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', id)
        .single()

      if (targetUser && targetUser.role === 'admin') {
        throw new Error('Vous ne pouvez pas supprimer le compte admin.')
      }

      console.log('🗑️ [usersService.delete] Suppression de l\'utilisateur:', id)

      // Supprimer aussi dans auth.users si service_role disponible (permet de recréer proprement)
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (serviceRoleKey && supabaseUrl) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
          await admin.auth.admin.deleteUser(id)
          console.log('✅ [usersService.delete] Utilisateur supprimé de auth.users')
        } catch (authDelErr) {
          console.warn('⚠️ [usersService.delete] auth.users non supprimé (peut-être orphelin):', authDelErr?.message)
        }
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ [usersService.delete] Erreur Supabase:', error)
        throw error
      }

      console.log('✅ [usersService.delete] Utilisateur supprimé avec succès')
      return { success: true }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error)
      throw error
    }
  },

  // Créer un nouvel utilisateur dans Supabase (uniquement @domaine autorisé)
  create: async (userData) => {
    try {
      if (!isAllowedEmail(userData.email)) {
        throw new Error(INSCRIPTION_RESERVEE_MSG)
      }
      if (userData.password) {
        const { valid, message } = validatePassword(userData.password)
        if (!valid) throw new Error(message || 'Mot de passe invalide')
      }

      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le profil utilisateur pour vérifier les permissions
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Seul admin peut créer des utilisateurs
      if (userProfile?.role !== 'admin') {
        throw new Error('Accès non autorisé. Seul l\'admin peut créer des utilisateurs.')
      }

      // Seul l'admin peut créer des directrices (la directrice n'a pas accès à cette page)

      // Avertissement si création d'un admin (mais permettre)
      if (userData.role === 'admin') {
        console.warn('⚠️ [usersService.create] Création d\'un compte admin par un admin existant')
      }

      console.log('🆕 [usersService.create] Création d\'un nouvel utilisateur:', userData.email)

      // Étape 1: Créer l'utilisateur dans Supabase Auth via Edge Function
      // Cela permet de créer l'utilisateur avec email_confirm: true sans confirmation d'email
      let authUserId = null
      let authCreatedSuccessfully = false
      
      try {
        console.log('🔐 [usersService.create] Tentative de création via Edge Function...')
        
        // Récupérer le token de l'utilisateur actuel
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Session expirée. Veuillez vous reconnecter.')
        }

        // Appeler l'Edge Function pour créer l'utilisateur
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        // En dev : proxy Vite contourne CORS (localhost -> pas de cross-origin)
        const functionUrl = import.meta.env.DEV && typeof window !== 'undefined'
          ? `${window.location.origin}/api/supabase-functions/v1/create-user`
          : `${supabaseUrl}/functions/v1/create-user`

        const callEdgeFunction = async () => {
          const res = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            },
            body: JSON.stringify({
              email: userData.email,
              password: userData.password,
              name: userData.name,
              nom: userData.nom || userData.name,
              prenom: userData.prenom || null,
              matricule: userData.matricule || null,
              role: userData.role,
              direction: userData.direction || null,
              fonction: userData.fonction || null,
              gender: userData.gender && ['M', 'F'].includes(String(userData.gender).toUpperCase()) ? String(userData.gender).toUpperCase() : null,
              mustChangePassword: userData.mustChangePassword === true,
            }),
          })
          let result
          try {
            result = await res.json()
          } catch {
            result = { error: res.status === 503 ? 'Service temporairement indisponible (503). Réessayez dans quelques instants.' : `Erreur ${res.status}` }
          }
          return { response: res, result }
        }

        let { response, result } = await callEdgeFunction()
        // Retry une fois en cas de 503 (erreur temporaire Supabase)
        if (response.status === 503) {
          console.warn('⚠️ [usersService.create] 503 reçu, nouvelle tentative dans 3s...')
          await new Promise((r) => setTimeout(r, 3000))
          const retry = await callEdgeFunction()
          response = retry.response
          result = retry.result
        }

        if (!response.ok) {
          throw new Error(result?.error || `Erreur lors de la création (${response.status})`)
        }

        if (result.success && result.user) {
          authUserId = result.user.id
          authCreatedSuccessfully = result.authCreated || false
          console.log('✅ [usersService.create] Utilisateur créé via Edge Function:', authUserId)
          
          // Si directeur·trice avec direction, synchroniser directions.director_id
          if (result.user.role === 'directrice' && result.user.direction) {
            const { data: dir } = await supabase.from('directions').select('id').eq('name', result.user.direction).single()
            if (dir) {
              await supabase.from('directions').update({ director_id: result.user.id, updated_at: new Date().toISOString() }).eq('id', dir.id)
            }
          }
          
          // Retourner directement le résultat de l'Edge Function
          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            username: result.user.username,
            role: result.user.role,
            direction: result.user.direction,
            fonction: result.user.fonction,
            gender: result.user.gender || null,
            isActive: result.user.isActive,
            createdAt: result.user.createdAt,
            updatedAt: result.user.updatedAt,
            authCreated: authCreatedSuccessfully,
            emailSent: result.emailSent === true,
            emailError: result.emailError || null,
          }
        } else {
          throw new Error('Aucun utilisateur n\'a été créé')
        }
      } catch (authErr) {
        console.error('❌ [usersService.create] Erreur lors de la création via Edge Function:', authErr)

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

        // Fallback 1 : API Admin createUser (si service_role_key disponible) - plus fiable que signUp
        if (supabaseUrl && serviceRoleKey) {
          try {
            console.warn('⚠️ [usersService.create] Tentative via API Admin createUser...')
            const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
            const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
              auth: { autoRefreshToken: false, persistSession: false }
            })

            const { data: authData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
              email: userData.email,
              password: userData.password,
              email_confirm: true,
              user_metadata: {
                name: userData.name,
                role: userData.role,
                direction: userData.direction || null,
                fonction: userData.fonction || null,
              }
            })

            if (!adminError && authData?.user) {
              authUserId = authData.user.id
              authCreatedSuccessfully = true
              console.log('✅ [usersService.create] Utilisateur créé via API Admin:', authUserId)
            } else if (adminError?.message?.includes('already') || adminError?.message?.includes('exists')) {
              // Utilisateur existe déjà : récupérer son ID via listUsers
              const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
              const existingAuth = listData?.users?.find(u => (u.email || '').toLowerCase() === (userData.email || '').toLowerCase())
              if (existingAuth) {
                authUserId = existingAuth.id
                authCreatedSuccessfully = false
                console.log('✅ [usersService.create] Utilisateur existant trouvé dans Auth:', authUserId)
              } else {
                throw new Error('Un utilisateur avec cet email existe déjà. Veuillez utiliser un autre email.')
              }
            } else {
              throw adminError || new Error('Erreur API Admin')
            }
          } catch (adminErr) {
            console.warn('⚠️ [usersService.create] API Admin échouée:', adminErr?.message)
            // Continuer vers signUp
          }
        }

        // Fallback 2 : signUp (si API Admin non disponible ou a échoué)
        if (!authUserId) {
          try {
            console.warn('⚠️ [usersService.create] Tentative avec signUp...')
            const { data: authData, error: authError } = await supabase.auth.signUp({
              email: userData.email,
              password: userData.password,
              options: {
                data: {
                  name: userData.name,
                  role: userData.role,
                  direction: userData.direction,
                  fonction: userData.fonction,
                },
              }
            })

            if (authError) {
              if (authError.message?.includes('already registered') || authError.message?.includes('already exists') || authError.message?.includes('User already registered')) {
                const { data: existingByEmail } = await supabase.from('users').select('id').eq('email', userData.email).single()
                if (existingByEmail && serviceRoleKey && supabaseUrl) {
                  const { createClient } = await import('@supabase/supabase-js')
                  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
                  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
                  const authUser = listData?.users?.find(u => (u.email || '').toLowerCase() === (userData.email || '').toLowerCase())
                  if (authUser) {
                    authUserId = authUser.id
                    authCreatedSuccessfully = false
                  }
                }
                if (!authUserId) {
                  throw new Error('Un utilisateur avec cet email existe déjà. Supprimez-le dans Supabase (Authentication → Users) puis réessayez.')
                }
              } else {
                throw authError
              }
            } else if (authData?.user) {
              authUserId = authData.user.id
              authCreatedSuccessfully = true
              if (serviceRoleKey && supabaseUrl) {
                try {
                  const { createClient } = await import('@supabase/supabase-js')
                  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
                  await admin.auth.admin.updateUserById(authUserId, { email_confirm: true })
                } catch (_) {}
              }
            } else {
              throw new Error('Aucun utilisateur n\'a été créé dans Supabase Auth')
            }
          } catch (fallbackErr) {
            throw new Error(
              'Impossible de créer le compte. Ajoutez VITE_SUPABASE_SERVICE_ROLE_KEY dans .env (Dashboard Supabase → Settings → API → service_role) puis redémarrez. ' +
              'Erreur : ' + (fallbackErr.message || String(fallbackErr))
            )
          }
        }
      }

      // Étape 2: Vérifier si l'utilisateur existe déjà dans users
      console.log('🔍 [usersService.create] Vérification de l\'existence de l\'utilisateur:', authUserId)
      
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .single()

      let createdUser

      if (existingUser) {
        // L'utilisateur existe déjà, mettre à jour
        console.log('⚠️ [usersService.create] Utilisateur existant trouvé, mise à jour...')
        
        const genderVal = userData.gender && ['M', 'F'].includes(String(userData.gender).toUpperCase()) ? String(userData.gender).toUpperCase() : null
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            email: userData.email,
            username: userData.email.split('@')[0],
            nom: userData.nom || userData.name,
            prenom: userData.prenom || null,
            matricule: userData.matricule || null,
            role: userData.role,
            direction: userData.direction || null,
            fonction: userData.fonction || null,
            gender: genderVal,
            is_active: true,
            must_change_password: userData.mustChangePassword === true,
          })
          .eq('id', authUserId)
          .select()
          .single()

        if (updateError) {
          console.error('❌ [usersService.create] Erreur lors de la mise à jour:', updateError)
          throw new Error(`Erreur lors de la mise à jour de l'utilisateur: ${updateError.message}`)
        }

        createdUser = updatedUser
        console.log('✅ [usersService.create] Utilisateur mis à jour:', createdUser)
      } else {
        // Créer l'utilisateur dans la table users avec l'ID de Auth
        const genderVal = userData.gender && ['M', 'F'].includes(String(userData.gender).toUpperCase()) ? String(userData.gender).toUpperCase() : null
        const newUserData = {
          id: authUserId,
          email: userData.email,
          username: userData.email.split('@')[0],
          nom: userData.nom || userData.name,
          prenom: userData.prenom || null,
          matricule: userData.matricule || null,
          role: userData.role,
          direction: userData.direction || null,
          fonction: userData.fonction || null,
          gender: genderVal,
          is_active: true,
          must_change_password: userData.mustChangePassword === true,
        }

        console.log('💾 [usersService.create] Insertion dans la table users:', newUserData)

        const { data: insertedUser, error } = await supabase
          .from('users')
          .insert(newUserData)
          .select()
          .single()

        if (error) {
          console.error('❌ [usersService.create] Erreur Supabase:', error)
          
          // Si l'erreur est due à un utilisateur existant (race condition), essayer de récupérer l'utilisateur
          if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
            console.warn('⚠️ [usersService.create] Conflit détecté, récupération de l\'utilisateur existant...')
            
            const { data: conflictUser, error: fetchError } = await supabase
              .from('users')
              .select('*')
              .eq('id', authUserId)
              .single()

            if (fetchError || !conflictUser) {
              // Vérifier aussi par email
              const { data: emailUser, error: emailError } = await supabase
                .from('users')
                .select('*')
                .eq('email', userData.email)
                .single()

              if (emailError || !emailUser) {
                throw new Error('Un utilisateur avec cet email existe déjà dans la base de données.')
              }
              
              createdUser = emailUser
            } else {
              createdUser = conflictUser
            }
            
            console.log('✅ [usersService.create] Utilisateur récupéré après conflit:', createdUser)
          } else {
            throw error
          }
        } else {
          createdUser = insertedUser
          console.log('✅ [usersService.create] Utilisateur créé dans la table users:', createdUser)
        }
      }

      console.log('✅ [usersService.create] Utilisateur créé dans la table users:', createdUser)

      // Si directeur·trice avec direction, synchroniser directions.director_id
      if (createdUser.role === 'directrice' && createdUser.direction) {
        const { data: dir } = await supabase.from('directions').select('id').eq('name', createdUser.direction).single()
        if (dir) {
          await supabase.from('directions').update({ director_id: createdUser.id, updated_at: new Date().toISOString() }).eq('id', dir.id)
        }
      }

      // Vérifier si l'utilisateur Auth a été créé avec succès
      const wasAuthCreated = authCreatedSuccessfully && createdUser.id === authUserId

      // Confirmer automatiquement l'email si l'utilisateur a été créé et que service_role_key est disponible
      if (wasAuthCreated && authUserId) {
        const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          try {
            console.log('🔄 [usersService.create] Confirmation automatique de l\'email pour le nouvel utilisateur...')
            const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
            const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            })
            
            const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
              authUserId,
              {
                email_confirm: true,
              }
            )
            
            if (confirmError) {
              console.warn('⚠️ [usersService.create] Impossible de confirmer l\'email automatiquement:', confirmError)
            } else {
              console.log('✅ [usersService.create] Email confirmé automatiquement pour le nouvel utilisateur')
            }
          } catch (confirmErr) {
            console.warn('⚠️ [usersService.create] Erreur lors de la confirmation automatique:', confirmErr)
            // Ne pas échouer si la confirmation échoue, l'utilisateur peut être activé manuellement
          }
        }
      }

      return {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.nom || createdUser.username || createdUser.email?.split('@')[0] || 'Utilisateur',
        username: createdUser.username,
        role: createdUser.role,
        direction: createdUser.direction,
        fonction: createdUser.fonction,
        isActive: createdUser.is_active,
        createdAt: createdUser.created_at,
        updatedAt: createdUser.updated_at,
        authCreated: wasAuthCreated,
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error)
      throw error
    }
  },

  // Activer ou désactiver un compte (admin uniquement)
  setActive: async (userId, isActive) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Utilisateur non authentifié')

    const { data: userProfile } = await supabase.from('users').select('role, is_active').eq('id', authUser.id).single()
    if (userProfile?.role !== 'admin') {
      throw new Error('Accès non autorisé. Seul l\'admin peut activer ou désactiver les comptes.')
    }
    if (userProfile?.is_active === false) {
      throw new Error('Votre compte administrateur est désactivé.')
    }

    const { data: targetUser } = await supabase.from('users').select('role').eq('id', userId).single()
    if (targetUser?.role === 'admin') {
      throw new Error('Vous ne pouvez pas désactiver le compte admin.')
    }

    const { error } = await supabase.from('users').update({ is_active: !!isActive, updated_at: new Date().toISOString() }).eq('id', userId)
    if (error) throw new Error(error.message || 'Erreur lors de la mise à jour du statut.')
    return { success: true, isActive: !!isActive }
  },

  // PIN de signature (directeur/admin) – 4 à 6 chiffres
  setSignaturePin: async (pin) => {
    try {
      const { data, error } = await supabase.rpc('set_signature_pin', { p_pin: String(pin || '') })
      if (error) {
        const msg = String(error.message || error.details || '')
        if (msg.includes('gen_salt') || msg.includes('crypt') || /does not exist/i.test(msg)) {
          throw new Error('Migration PIN requise : exécutez supabase/apply_signature_pin.sql dans le SQL Editor de Supabase (Dashboard → SQL Editor).')
        }
        throw new Error(msg || 'Erreur lors de la définition du PIN.')
      }
      const result = data || {}
      if (result.success === false) throw new Error(result.error || 'Erreur')
      return { success: true }
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg.includes('gen_salt') || msg.includes('crypt') || /does not exist/i.test(msg)) {
        throw new Error('Migration PIN requise : exécutez supabase/apply_signature_pin.sql dans le SQL Editor de Supabase (Dashboard → SQL Editor).')
      }
      throw e
    }
  },

  hasSignaturePin: async () => {
    const { data, error } = await supabase.rpc('has_signature_pin')
    if (error) return false
    return !!data
  },

  verifySignaturePin: async (pin) => {
    try {
      const { data, error } = await supabase.rpc('verify_signature_pin', { p_pin: String(pin || '') })
      if (error) {
        const msg = String(error.message || error.details || '')
        if (msg.includes('gen_salt') || msg.includes('crypt') || /does not exist/i.test(msg)) {
          throw new Error('Migration PIN requise : exécutez supabase/apply_signature_pin.sql dans le SQL Editor de Supabase.')
        }
        throw new Error(msg || 'Erreur de vérification.')
      }
      const result = data || {}
      if (result.valid === false) throw new Error(result.error || 'PIN incorrect.')
      return true
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg.includes('gen_salt') || msg.includes('crypt') || /does not exist/i.test(msg)) {
        throw new Error('Migration PIN requise : exécutez supabase/apply_signature_pin.sql dans le SQL Editor de Supabase.')
      }
      throw e
    }
  },

  // Réinitialiser le mot de passe d'un utilisateur (admin uniquement, sans email)
  resetPasswordByAdmin: async (userId, newPassword) => {
    try {
      const { valid, message } = validatePassword(newPassword)
      if (!valid) throw new Error(message || 'Mot de passe invalide')

      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Utilisateur non authentifié')

      const { data: userProfile } = await supabase.from('users').select('role').eq('id', authUser.id).single()
      if (userProfile?.role !== 'admin') {
        throw new Error('Accès non autorisé. Seul l\'admin peut réinitialiser les mots de passe.')
      }

      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!serviceRoleKey || !supabaseUrl) {
        throw new Error('VITE_SUPABASE_SERVICE_ROLE_KEY est requis pour réinitialiser les mots de passe. Vérifiez votre fichier .env')
      }

      const { createClient } = await import('@supabase/supabase-js')
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      })

      if (error) throw new Error(error.message)
      return { success: true, message: 'Mot de passe réinitialisé. Communiquez le nouveau mot de passe à l\'utilisateur.' }
    } catch (err) {
      console.error('Erreur resetPasswordByAdmin:', err)
      throw err
    }
  },

  // Note: Pour créer l'utilisateur dans Supabase Auth, utilisez le script create-all-users.js
  // ou créez-le via l'interface Supabase (Authentication → Users)
}

export const directionsService = {
  getAll: async () => {
    const { data: directions, error } = await supabase
      .from('directions')
      .select('*, services(*)')
      .order('label')
    if (error) throw error

    const withDirectors = await Promise.all((directions || []).map(async (d) => {
      let director = null
      if (d.director_id) {
        const { data: u } = await supabase.from('users').select('id, nom, email, role, gender').eq('id', d.director_id).single()
        director = u
      }
      return { ...d, director }
    }))
    return withDirectors
  },

  getById: async (id) => {
    const { data: dir, error } = await supabase
      .from('directions')
      .select('*, services(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    let director = null
    if (dir?.director_id) {
      const { data: u } = await supabase.from('users').select('id, nom, email, role, gender').eq('id', dir.director_id).single()
      director = u
    }
    return { ...dir, director }
  },

  create: async ({ name, label, directorId }) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Utilisateur non authentifié')
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    if (userProfile?.role !== 'admin') throw new Error('Accès non autorisé')

    const { data, error } = await supabase
      .from('directions')
      .insert({ name, label, director_id: directorId || null })
      .select()
      .single()
    if (error) throw error
    return data
  },

  update: async (id, { name, label, directorId }) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Utilisateur non authentifié')
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    if (userProfile?.role !== 'admin') throw new Error('Accès non autorisé')

    const { data: existing } = await supabase.from('directions').select('director_id').eq('id', id).single()
    const oldDirectorId = existing?.director_id

    const updateData = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (label !== undefined) updateData.label = label
    if (directorId !== undefined) updateData.director_id = directorId || null

    const { data, error } = await supabase
      .from('directions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    if (oldDirectorId && oldDirectorId !== (directorId || null)) {
      await supabase.from('users').update({ direction: null, updated_at: new Date().toISOString() }).eq('id', oldDirectorId)
    }
    if (directorId) {
      await supabase.from('users').update({ direction: data.name, updated_at: new Date().toISOString() }).eq('id', directorId)
    }
    return data
  },

  delete: async (id) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Utilisateur non authentifié')
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    if (userProfile?.role !== 'admin') throw new Error('Accès non autorisé')

    const { error } = await supabase.from('directions').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getStructure: async () => {
    try {
      const { data: dirs } = await supabase.from('directions').select('*, services(*)')
      if (!dirs?.length) throw new Error('No directions')
      const structure = {}
      dirs.forEach(d => {
        structure[d.name] = { services: (d.services || []).map(s => s.name) }
      })
      return structure
    } catch {
      const { DIRECTIONS } = await import('../constants/directions')
      return Object.fromEntries(Object.entries(DIRECTIONS).map(([k, v]) => [v.value || k, { services: v.services || [] }]))
    }
  },

  /** Retourne l'ID du directeur pour un service donné (nom du service) */
  getDirectorIdForService: async (serviceName) => {
    if (!serviceName) return null
    const { data: svc } = await supabase.from('services').select('direction_id').eq('name', serviceName).limit(1).maybeSingle()
    if (!svc) return null
    const { data: dir } = await supabase.from('directions').select('director_id').eq('id', svc.direction_id).single()
    return dir?.director_id || null
  },

  /** Retourne l'ID du directeur pour un utilisateur (chef/employe) selon son service */
  getDirectorIdForUserId: async (userId) => {
    const { data: u } = await supabase.from('users').select('direction').eq('id', userId).single()
    if (!u?.direction) return null
    return directionsService.getDirectorIdForService(u.direction)
  },

  /** Retourne les noms des services d'une direction (pour un directeur) */
  getServiceNamesForDirectorId: async (directorId) => {
    const { data: dir } = await supabase.from('directions').select('id').eq('director_id', directorId).single()
    if (!dir) return []
    const { data: svcs } = await supabase.from('services').select('name').eq('direction_id', dir.id)
    return (svcs || []).map(s => s.name)
  },
}

export const servicesService = {
  getByDirection: async (directionId) => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('direction_id', directionId)
      .order('label')
    if (error) throw error
    return data || []
  },

  create: async (directionId, { name, label }) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Utilisateur non authentifié')
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    if (userProfile?.role !== 'admin') throw new Error('Accès non autorisé')

    const { data, error } = await supabase
      .from('services')
      .insert({ direction_id: directionId, name, label: label || name })
      .select()
      .single()
    if (error) throw error
    return data
  },

  update: async (id, { name, label }) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Utilisateur non authentifié')
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    if (userProfile?.role !== 'admin') throw new Error('Accès non autorisé')

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (label !== undefined) updateData.label = label

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  delete: async (id) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Utilisateur non authentifié')
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    if (userProfile?.role !== 'admin') throw new Error('Accès non autorisé')

    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },
}

export const dashboardService = {
  // Données vides pour fallback en cas d'erreur réseau
  _emptyStats: () => ({
    totalMissions: 0,
    totalTasks: 0,
    tasksCompleted: 0,
    tasksOverdue: 0,
    completionRate: 0,
  }),
  _emptyCharts: () => ({
    statusData: [
      { name: 'Terminé', value: 0, fill: '#10b981' },
      { name: 'En cours', value: 0, fill: '#3b82f6' },
      { name: 'Planifié', value: 0, fill: '#f59e0b' },
      { name: 'En retard', value: 0, fill: '#ef4444' },
    ],
    weeklyData: [],
    missionPerformance: [],
    productivityData: [],
  }),

  // Récupérer les statistiques du dashboard depuis Supabase
  getStats: async () => {
    try {
      // Récupérer l'utilisateur actuel pour filtrer selon le rôle
      let authUser
      try {
        const { data: { user } } = await supabase.auth.getUser()
        authUser = user
      } catch (authErr) {
        if (/failed to fetch|network|connection/i.test(String(authErr?.message || authErr))) {
          return dashboardService._emptyStats()
        }
        throw authErr
      }
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le profil utilisateur
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Construire la requête selon le rôle
      let query = supabase.from('tasks').select('*', { count: 'exact' })

      // Filtrer selon le rôle
      if (userProfile?.role === 'chef') {
        if (!userProfile.direction) {
          console.warn('⚠️ [dashboardService.getStats] Chef sans direction, aucune tâche ne sera retournée')
          return {
            totalMissions: 0,
            totalTasks: 0,
            tasksCompleted: 0,
            tasksOverdue: 0,
            completionRate: 0,
          }
        }
        query = query.eq('direction', userProfile.direction)
        console.log('📊 [dashboardService.getStats] Filtrage pour chef:', {
          userId: authUser.id,
          role: userProfile.role,
          direction: userProfile.direction,
        })
      } else if (userProfile?.role === 'employe') {
        query = query.eq('assigned_to', authUser.id)
      }
      // directrice et admin voient tout

      const { data: tasks, error, count } = await query
      
      // Log pour déboguer (uniquement en développement)
      if (import.meta.env.DEV) {
        console.log(`📊 [dashboardService.getStats] Tâches pour ${userProfile?.role}:`, {
          userId: authUser.id,
          role: userProfile?.role,
          direction: userProfile?.direction,
          tasksCount: tasks?.length || 0,
          totalCount: count || 0,
        })
      }

      if (error) {
        throw error
      }

      const tasksList = tasks || []

      // Calculer les statistiques
      const totalMissions = count || tasksList.length
      const totalTasks = count || tasksList.length
      const tasksCompleted = tasksList.filter((t) => t.status === 'termine').length
      const tasksOverdue = tasksList.filter((t) => {
        if (t.status === 'en_retard') return true
        if (t.due_date) {
          const dueDate = new Date(t.due_date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          return dueDate < today && t.status !== 'termine'
        }
        return false
      }).length
      const completionRate = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0

      return {
        totalMissions,
        totalTasks,
        tasksCompleted,
        tasksOverdue,
        completionRate: Math.round(completionRate),
      }
    } catch (error) {
      const msg = String(error?.message || '')
      const isNetwork = /failed to fetch|network|connection|reset|closed/i.test(msg) || error?.name === 'TypeError'
      if (isNetwork) {
        if (import.meta.env.DEV) console.warn('⚠️ [getStats] Erreur réseau, données vides:', msg)
        return dashboardService._emptyStats()
      }
      if (!import.meta.env.VITE_SUPABASE_URL) {
        const totalMissions = mockTasks.length
        const totalTasks = mockTasks.length
        const tasksCompleted = mockTasks.filter((t) => t.status === 'termine').length
        const tasksOverdue = mockTasks.filter((t) => t.status === 'en_retard').length
        const completionRate = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0
        return { totalMissions, totalTasks, tasksCompleted, tasksOverdue, completionRate: Math.round(completionRate) }
      }
      throw error
    }
  },

  // Récupérer les données pour les graphiques depuis Supabase
  getChartData: async () => {
    try {
      // Récupérer l'utilisateur actuel pour filtrer selon le rôle
      let authUser
      try {
        const { data: { user } } = await supabase.auth.getUser()
        authUser = user
      } catch (authErr) {
        if (/failed to fetch|network|connection/i.test(String(authErr?.message || authErr))) {
          return dashboardService._emptyCharts()
        }
        throw authErr
      }
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer le profil utilisateur
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Construire la requête selon le rôle
      let query = supabase.from('tasks').select('*')

      // Filtrer selon le rôle
      if (userProfile?.role === 'chef') {
        if (!userProfile.direction) {
          console.warn('⚠️ [dashboardService.getChartData] Chef sans direction, aucune tâche ne sera retournée')
          return {
            statusData: [
              { name: 'Terminé', value: 0, fill: '#10b981' },
              { name: 'En cours', value: 0, fill: '#3b82f6' },
              { name: 'Planifié', value: 0, fill: '#f59e0b' },
              { name: 'En retard', value: 0, fill: '#ef4444' },
            ],
            weeklyData: [],
          }
        }
        query = query.eq('direction', userProfile.direction)
        console.log('📊 [dashboardService.getChartData] Filtrage pour chef:', {
          userId: authUser.id,
          role: userProfile.role,
          direction: userProfile.direction,
        })
      } else if (userProfile?.role === 'employe') {
        query = query.eq('assigned_to', authUser.id)
      }

      const { data: tasks, error } = await query
      
      // Log pour déboguer (uniquement en développement)
      if (import.meta.env.DEV) {
        console.log(`📊 [dashboardService.getChartData] Tâches pour ${userProfile?.role}:`, {
          userId: authUser.id,
          role: userProfile?.role,
          direction: userProfile?.direction,
          tasksCount: tasks?.length || 0,
        })
      }

      if (error) {
        throw error
      }

      const tasksList = tasks || []

      // Données pour le camembert des statuts
      const statusData = [
        { name: 'Terminé', value: tasksList.filter((t) => t.status === 'termine').length, fill: '#10b981' },
        { name: 'En cours', value: tasksList.filter((t) => t.status === 'en_cours').length, fill: '#3b82f6' },
        { name: 'Planifié', value: tasksList.filter((t) => t.status === 'planifie').length, fill: '#f59e0b' },
        { name: 'En retard', value: tasksList.filter((t) => {
          if (t.status === 'en_retard') return true
          if (t.due_date) {
            const dueDate = new Date(t.due_date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            return dueDate < today && t.status !== 'termine'
          }
          return false
        }).length, fill: '#ef4444' },
      ]

      // Données pour les tâches par semaine (4 dernières semaines)
      const weeklyData = []
      const now = new Date()
      
      for (let i = 3; i >= 0; i--) {
        const weekDate = new Date(now)
        weekDate.setDate(weekDate.getDate() - i * 7)
        const weekStart = new Date(weekDate)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Début de semaine (dimanche)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6) // Fin de semaine (samedi)

        // Compter les tâches créées cette semaine
        const weekTasks = tasksList.filter((t) => {
          if (!t.created_at) return false
          const taskDate = new Date(t.created_at)
          return taskDate >= weekStart && taskDate <= weekEnd
        }).length

        weeklyData.push({
          week: `Semaine ${4 - i}`,
          tasks: weekTasks,
        })
      }

      // Données pour la performance par mission (limité à 10 pour l'affichage)
      const missionPerformance = tasksList
        .slice(0, 10)
        .map((task) => ({
          name: task.title?.substring(0, 20) + (task.title?.length > 20 ? '...' : '') || 'Sans titre',
          progress: task.progress || 0,
        }))

      // Données pour l'évolution de la productivité (12 dernières semaines)
      // Basé sur le taux de complétion des tâches par semaine
      const productivityData = []
      for (let i = 11; i >= 0; i--) {
        const weekDate = new Date(now)
        weekDate.setDate(weekDate.getDate() - i * 7)
        const weekStart = new Date(weekDate)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)

        // Tâches créées cette semaine
        const weekTasks = tasksList.filter((t) => {
          if (!t.created_at) return false
          const taskDate = new Date(t.created_at)
          return taskDate >= weekStart && taskDate <= weekEnd
        })

        // Tâches terminées cette semaine
        const weekCompleted = tasksList.filter((t) => {
          if (t.status !== 'termine' || !t.updated_at) return false
          const taskDate = new Date(t.updated_at)
          return taskDate >= weekStart && taskDate <= weekEnd
        })

        // Calculer la productivité (taux de complétion)
        const productivity = weekTasks.length > 0
          ? Math.round((weekCompleted.length / weekTasks.length) * 100)
          : 0

        productivityData.push({
          week: `S${12 - i}`,
          productivity: Math.max(0, Math.min(100, productivity)),
        })
      }

      return {
        statusData,
        weeklyData,
        missionPerformance,
        productivityData,
      }
    } catch (error) {
      const msg = String(error?.message || '')
      const isNetwork = /failed to fetch|network|connection|reset|closed|Utilisateur non authentifié/i.test(msg) || error?.name === 'TypeError'
      if (isNetwork) {
        if (import.meta.env.DEV) console.warn('⚠️ [getChartData] Erreur réseau ou auth, données vides:', msg)
        return dashboardService._emptyCharts()
      }
      if (!import.meta.env.VITE_SUPABASE_URL) {
        const statusData = [
          { name: 'Terminé', value: mockTasks.filter((t) => t.status === 'termine').length, fill: '#10b981' },
          { name: 'En cours', value: mockTasks.filter((t) => t.status === 'en_cours').length, fill: '#3b82f6' },
          { name: 'Planifié', value: mockTasks.filter((t) => t.status === 'planifie').length, fill: '#f59e0b' },
          { name: 'En retard', value: mockTasks.filter((t) => t.status === 'en_retard').length, fill: '#ef4444' },
        ]

        const weeklyData = []
        for (let i = 3; i >= 0; i--) {
          weeklyData.push({
            week: `Semaine ${4 - i}`,
            tasks: Math.floor(Math.random() * 10) + 5,
          })
        }

        const missionPerformance = mockTasks.map((task) => ({
          name: task.title.substring(0, 20) + (task.title.length > 20 ? '...' : ''),
          progress: task.progress,
        }))

        const productivityData = []
        for (let i = 11; i >= 0; i--) {
          productivityData.push({
            week: `S${12 - i}`,
            productivity: Math.floor(Math.random() * 30) + 70,
          })
        }

        return {
          statusData,
          weeklyData,
          missionPerformance,
          productivityData,
        }
      }
      throw error
    }
  },
}

// Service de gestion des fichiers (pièces jointes)
export const fileService = {
  // Uploader un fichier pour une tâche
  uploadTaskFile: async (taskId, file) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Vérifier que l'utilisateur est assigné à la tâche ou est admin/directrice
      const { data: task } = await supabase
        .from('tasks')
        .select('assigned_to')
        .eq('id', taskId)
        .single()

      if (!task) {
        throw new Error('Tâche non trouvée')
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (currentUser?.role !== 'admin' && currentUser?.role !== 'directrice' && task.assigned_to !== authUser.id) {
        throw new Error('Vous ne pouvez ajouter des fichiers qu\'à vos propres tâches')
      }

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop()
      const fileName = `${taskId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      
      // Uploader le fichier dans Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Erreur lors de l'upload: ${uploadError.message}`)
      }

      // Récupérer l'URL publique du fichier
      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName)

      // Mettre à jour les métadonnées de la tâche pour inclure le fichier
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('metadata')
        .eq('id', taskId)
        .single()

      let metadata = {}
      try {
        metadata = existingTask?.metadata ? (typeof existingTask.metadata === 'string' ? JSON.parse(existingTask.metadata) : existingTask.metadata) : {}
      } catch (e) {
        metadata = {}
      }

      if (!metadata.attachments) {
        metadata.attachments = []
      }

      metadata.attachments.push({
        id: Date.now().toString(),
        fileName: file.name,
        filePath: fileName,
        fileUrl: publicUrl,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: authUser.id,
        uploadedAt: new Date().toISOString(),
      })

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          metadata: JSON.stringify(metadata),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (updateError) {
        throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`)
      }

      // Enregistrer l'action dans l'historique
      await recordAction(taskId, 'file_uploaded', {
        message: `Fichier ajouté: "${file.name}"`,
        newValue: file.name,
      }, authUser.id)

      return {
        id: metadata.attachments[metadata.attachments.length - 1].id,
        fileName: file.name,
        fileUrl: publicUrl,
        fileSize: file.size,
        fileType: file.type,
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload du fichier:', error)
      throw error
    }
  },

  // Supprimer un fichier attaché
  deleteTaskFile: async (taskId, fileId) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('Utilisateur non authentifié')
      }

      // Récupérer la tâche et ses métadonnées
      const { data: task } = await supabase
        .from('tasks')
        .select('metadata, assigned_to')
        .eq('id', taskId)
        .single()

      if (!task) {
        throw new Error('Tâche non trouvée')
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (currentUser?.role !== 'admin' && currentUser?.role !== 'directrice' && task.assigned_to !== authUser.id) {
        throw new Error('Vous ne pouvez supprimer des fichiers que de vos propres tâches')
      }

      let metadata = {}
      try {
        metadata = task.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
      } catch (e) {
        metadata = {}
      }

      if (!metadata.attachments) {
        throw new Error('Fichier non trouvé')
      }

      // Trouver le fichier à supprimer
      const fileIndex = metadata.attachments.findIndex(f => f.id === fileId)
      if (fileIndex === -1) {
        throw new Error('Fichier non trouvé')
      }

      const fileToDelete = metadata.attachments[fileIndex]

      // Supprimer le fichier du storage
      const { error: deleteError } = await supabase.storage
        .from('task-attachments')
        .remove([fileToDelete.filePath])

      if (deleteError) {
        console.warn('⚠️ Erreur lors de la suppression du fichier du storage:', deleteError)
        // Continuer quand même pour supprimer la référence
      }

      // Supprimer la référence du fichier
      metadata.attachments.splice(fileIndex, 1)

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          metadata: JSON.stringify(metadata),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (updateError) {
        throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`)
      }

      // Enregistrer l'action dans l'historique
      await recordAction(taskId, 'file_deleted', {
        message: `Fichier supprimé: "${fileToDelete.fileName}"`,
        oldValue: fileToDelete.fileName,
      }, authUser.id)

      return { success: true }
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error)
      throw error
    }
  },
}

export default api


