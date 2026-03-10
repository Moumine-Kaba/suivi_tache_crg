import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Redirection : le formulaire de changement de mot de passe est intégré sur /login.
 * Cette page redirige vers /login pour centraliser le flux.
 */
export default function ChangePasswordInitiale() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#006020] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Redirection...</p>
      </div>
    </div>
  )
}
