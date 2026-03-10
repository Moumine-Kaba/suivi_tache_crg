import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Lock, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { passwordValidator, PASSWORD_RULES } from '../utils/passwordValidation'
import { supabase } from '../services/supabaseClient'
import { authService } from '../services/api'
import logoCRG from '../assets/logo_crg.png'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [hasValidSession, setHasValidSession] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const password = watch('password')

  useEffect(() => {
    let mounted = true

    // Vérifier si Supabase a redirigé avec une erreur (lien expiré, etc.)
    const hash = window.location.hash?.slice(1) || ''
    const params = Object.fromEntries(new URLSearchParams(hash))
    if (params.error === 'access_denied' || params.error_code === 'otp_expired') {
      setError('Ce lien a expiré ou n\'est plus valide. Les liens de réinitialisation sont valables 1 heure. Veuillez demander un nouveau lien depuis la page de connexion.')
      setIsChecking(false)
      return
    }

    const checkSession = async () => {
      try {
        // Supabase traite le hash (#access_token=...) au chargement
        let { data: { session }, error } = await supabase.auth.getSession()

        // Si hash présent mais pas de session, attendre un peu (Supabase peut traiter de façon asynchrone)
        if (!session && window.location.hash?.includes('access_token')) {
          await new Promise((r) => setTimeout(r, 500))
          const retry = await supabase.auth.getSession()
          session = retry.data.session
          error = retry.error
        }

        if (mounted) {
          if (session && !error) {
            setHasValidSession(true)
          } else {
            setError('Lien invalide ou expiré. Veuillez demander un nouveau lien de réinitialisation.')
          }
        }
      } catch (err) {
        console.error('Erreur vérification session:', err)
        if (mounted) setError('Une erreur est survenue. Veuillez réessayer.')
      } finally {
        if (mounted) setIsChecking(false)
      }
    }

    checkSession()
  }, [])

  const onSubmit = async (data) => {
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      await authService.resetPassword(data.password)
      await supabase.auth.signOut()
      setSuccess('Votre mot de passe a été réinitialisé. Redirection vers la connexion...')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
    } catch (err) {
      setError(err.message || 'Erreur lors de la réinitialisation du mot de passe')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#006020] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Vérification du lien...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoCRG} alt="CRG" className="h-12 w-auto object-contain" />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Nouveau mot de passe
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Choisissez un nouveau mot de passe sécurisé pour votre compte.
          </p>

          {!hasValidSession ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 flex items-center gap-3">
                <AlertCircle size={24} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
              <a
                href="/login"
                className="block w-full py-3 px-4 rounded-xl text-center font-semibold text-[#006020] dark:text-emerald-400 border-2 border-[#006020] dark:border-emerald-500 hover:bg-[#006020]/5 dark:hover:bg-emerald-500/10 transition-colors"
              >
                Retour à la connexion
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 flex items-center gap-3">
                  <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              {success && (
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800/50 flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10">
                    <Lock size={20} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      required: 'Le mot de passe est requis',
                      validate: passwordValidator,
                    })}
                    className={`w-full pl-11 pr-12 py-3 rounded-xl border-2 transition-all ${
                      errors.password
                        ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 focus:border-[#006020] dark:focus:border-emerald-500'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-[#006020] dark:hover:text-emerald-400"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={14} /> {errors.password.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{PASSWORD_RULES.join(' · ')}</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: 'Veuillez confirmer le mot de passe',
                    validate: (value) => value === password || 'Les mots de passe ne correspondent pas',
                  })}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                    errors.confirmPassword
                      ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 focus:border-[#006020] dark:focus:border-emerald-500'
                  }`}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={14} /> {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-[#006020] hover:bg-[#004d18] dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Réinitialisation...
                  </>
                ) : (
                  'Réinitialiser le mot de passe'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center">
          <a href="/login" className="text-sm font-medium text-gray-500 hover:text-[#006020] dark:hover:text-emerald-400">
            ← Retour à la connexion
          </a>
        </p>
      </div>
    </div>
  )
}
