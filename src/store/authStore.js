import { create } from 'zustand'
import { supabase } from '../services/supabaseClient'
import useNotificationsStore from './notificationsStore'

/**
 * Store d'authentification avec Zustand
 * Gère l'état de l'utilisateur connecté et le token JWT
 * Utilise Supabase Auth pour la persistance
 */
const useAuthStore = create((set, get) => {
  // État initial
  const initialState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
  }

  // Initialiser l'état depuis Supabase au démarrage (de manière asynchrone)
  const initAuth = async () => {
    try {
      // Vérifier si une déconnexion explicite a été effectuée
      // Si oui, ne pas restaurer la session même si elle existe dans Supabase
      const explicitLogout = sessionStorage.getItem('crg-explicit-logout')
      if (explicitLogout === 'true') {
        console.log('🚪 Déconnexion explicite détectée, ne pas restaurer la session')
        // Nettoyer le flag
        sessionStorage.removeItem('crg-explicit-logout')
        // Forcer la suppression de la session Supabase
        await supabase.auth.signOut()
        // Nettoyer localStorage
        localStorage.removeItem('crg-auth-storage')
        set(initialState)
        return
      }

      // Vérifier si Supabase est configuré
      if (!import.meta.env.VITE_SUPABASE_URL) {
        console.warn('Supabase non configuré, utilisation de localStorage uniquement')
        // Fallback sur localStorage
        const stored = localStorage.getItem('crg-auth-storage')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (parsed.user && parsed.token) {
              set({
                user: parsed.user,
                token: parsed.token,
                isAuthenticated: true,
              })
              return
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
        set(initialState)
        return
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (session && !error) {
        // Récupérer les métadonnées utilisateur
        try {
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (userProfile && !profileError) {
            // SÉCURITÉ : Vérifier que le compte est actif
            if (userProfile.is_active === false) {
              console.warn('⚠️ Compte désactivé, déconnexion forcée')
              await supabase.auth.signOut()
              localStorage.removeItem('crg-auth-storage')
              set(initialState)
              return
            }
            console.log('🔐 Rôle récupéré depuis Supabase (initAuth):', userProfile.role)
            console.log('📋 Profil complet:', userProfile)
            
            const userData = {
              id: userProfile.id,
              email: userProfile.email,
              name: userProfile.nom || userProfile.username || userProfile.email?.split('@')[0],
              username: userProfile.username,
              nom: userProfile.nom,
              role: userProfile.role, // FORCER le rôle depuis la base de données
              direction: userProfile.direction,
              fonction: userProfile.fonction,
              gender: userProfile.gender || null,
              mustChangePassword: userProfile.must_change_password === true,
            }
            
            // Sauvegarder aussi dans localStorage avec le bon rôle
            localStorage.setItem('crg-auth-storage', JSON.stringify({
              user: userData,
              token: session.access_token,
              refreshToken: session.refresh_token || null,
              isAuthenticated: true,
            }))
            
            set({
              user: userData,
              token: session.access_token,
              refreshToken: session.refresh_token || null,
              isAuthenticated: true,
            })
            return
          } else {
            console.warn('⚠️ Profil non trouvé ou erreur:', profileError)
          }
        } catch (profileErr) {
          console.warn('Erreur lors de la récupération du profil:', profileErr)
          // Continue avec localStorage
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'auth:', error)
    }

    // Fallback sur localStorage si Supabase n'est pas disponible ou en cas d'erreur
    try {
      const stored = localStorage.getItem('crg-auth-storage')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.user && parsed.token) {
          // Tenter de restaurer la session Supabase si on a refreshToken
          if (parsed.refreshToken && import.meta.env.VITE_SUPABASE_URL) {
            try {
              const { error } = await supabase.auth.setSession({
                access_token: parsed.token,
                refresh_token: parsed.refreshToken,
              })
              if (!error) {
                console.log('🔐 Session Supabase restaurée depuis localStorage')
              }
            } catch (e) {
              console.warn('⚠️ Impossible de restaurer la session Supabase:', e?.message)
            }
          }
          set({
            user: parsed.user,
            token: parsed.token,
            refreshToken: parsed.refreshToken || null,
            isAuthenticated: true,
          })
          // Rafraîchir le profil en arrière-plan (récupère le rôle à jour depuis Supabase)
          if (import.meta.env.VITE_SUPABASE_URL && parsed.user?.id) {
            setTimeout(() => get().refreshProfile?.().catch(() => {}), 100)
          }
          return
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }

    // État par défaut (non authentifié)
    set(initialState)
  }

  // Initialiser l'auth au démarrage (ne pas bloquer le rendu)
  initAuth().catch(err => {
    console.error('Erreur fatale lors de l\'initialisation:', err)
    set(initialState)
  })

  return {
    ...initialState,

    // Connexion
    login: async (user, token, session = null) => {
      // FORCER la récupération du rôle depuis Supabase au lieu d'utiliser celui passé en paramètre
      // Car le rôle pourrait être obsolète
      if (import.meta.env.VITE_SUPABASE_URL && session?.user?.id) {
        try {
          const { data: userProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (userProfile) {
            console.log('🔄 Rôle récupéré depuis Supabase lors de la connexion:', userProfile.role)
            // Utiliser le rôle depuis Supabase au lieu de celui passé en paramètre
            user = {
              ...user,
              role: userProfile.role, // FORCER le rôle depuis Supabase
              nom: userProfile.nom || user.nom,
              username: userProfile.username || user.username,
              direction: userProfile.direction || user.direction,
              fonction: userProfile.fonction || user.fonction,
              gender: userProfile.gender || user.gender || null,
              mustChangePassword: userProfile.must_change_password === true,
            }
          }
        } catch (err) {
          console.warn('⚠️ Impossible de récupérer le rôle depuis Supabase, utilisation du rôle fourni:', err)
        }
      }

      const state = {
        user,
        token,
        refreshToken: session?.refresh_token || null,
        isAuthenticated: true,
      }
      
      // Sauvegarder dans localStorage avec le rôle correct
      localStorage.setItem('crg-auth-storage', JSON.stringify(state))
      console.log('💾 Rôle sauvegardé dans localStorage:', user.role)
      set(state)
    },

    // Déconnexion
    logout: async () => {
      console.log('🚪 Déconnexion en cours...')
      
      // Marquer qu'une déconnexion explicite a été effectuée
      // Ce flag empêchera initAuth de restaurer automatiquement la session
      sessionStorage.setItem('crg-explicit-logout', 'true')
      
      // Déconnexion Supabase (supprime la session côté serveur)
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error('Erreur lors de la déconnexion Supabase:', error)
        } else {
          console.log('✅ Déconnexion Supabase réussie')
        }
      } catch (err) {
        console.error('Erreur lors de la déconnexion Supabase:', err)
      }
      
      // FORCER la suppression complète du localStorage pour éviter les rôles obsolètes
      localStorage.removeItem('crg-auth-storage')
      // Supprimer aussi toutes les autres clés liées à l'auth
      Object.keys(localStorage).forEach(key => {
        if (key.includes('auth') || key.includes('crg') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
      
      // Supprimer aussi sessionStorage lié à Supabase
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('supabase')) {
          sessionStorage.removeItem(key)
        }
      })
      
      // Réinitialiser le cache des notifications (évite d'afficher les notifs du précédent utilisateur)
      try {
        useNotificationsStore.getState().resetNotifications()
      } catch (_) {
        /* ignore */
      }

      // Mettre à jour l'état immédiatement
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
      })
      
      console.log('✅ Déconnexion complète effectuée')
    },

    // Mise à jour de l'utilisateur
    updateUser: (user) => {
      set((state) => {
        const newState = {
          ...state,
          user: { ...state.user, ...user },
        }
        localStorage.setItem('crg-auth-storage', JSON.stringify(newState))
        return newState
      })
    },

    // Rafraîchir le profil depuis la base (utile après changement de rôle en SQL)
    refreshProfile: async () => {
      const { user, token, refreshToken, isAuthenticated } = get()
      if (!isAuthenticated || !user?.id || !import.meta.env.VITE_SUPABASE_URL) return
      try {
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        if (userProfile) {
          // SÉCURITÉ : Si le compte a été désactivé, déconnecter
          if (userProfile.is_active === false) {
            console.warn('⚠️ Compte désactivé, déconnexion forcée')
            await get().logout()
            return
          }
          const userData = {
            id: userProfile.id,
            email: userProfile.email,
            name: userProfile.nom || userProfile.username || userProfile.email?.split('@')[0],
            username: userProfile.username,
            nom: userProfile.nom,
            role: userProfile.role,
            direction: userProfile.direction,
            fonction: userProfile.fonction,
            gender: userProfile.gender || null,
            mustChangePassword: userProfile.must_change_password === true,
          }
          localStorage.setItem('crg-auth-storage', JSON.stringify({
            user: userData,
            token,
            refreshToken,
            isAuthenticated: true,
          }))
          set({ user: userData })
        }
      } catch (e) {
        console.warn('⚠️ Rafraîchissement profil:', e?.message)
      }
    },
  }
})

export default useAuthStore

