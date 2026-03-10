import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

/**
 * Composant pour protéger les routes nécessitant une authentification
 */
export default function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Première connexion : changement de mot de passe obligatoire
  if (user?.mustChangePassword && !location.pathname.startsWith('/change-password-initiale')) {
    return <Navigate to="/change-password-initiale" replace />
  }

  // Vérifier le rôle si requis
  if (requiredRole) {
    // Si requiredRole est un tableau, vérifier si le rôle de l'utilisateur est dans le tableau
    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(user?.role)) {
        return <Navigate to="/dashboard" replace />
      }
    } else {
      // Si requiredRole est une chaîne, vérifier l'égalité
      if (user?.role !== requiredRole) {
        // Rediriger selon le rôle
        if (user?.role === 'lecture') {
          return <Navigate to="/dashboard" replace />
        }
        return <Navigate to="/dashboard" replace />
      }
    }
  }

  return children
}


