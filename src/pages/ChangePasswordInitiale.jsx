import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Lock, AlertCircle, Eye, EyeOff, CheckCircle, Shield, KeyRound } from 'lucide-react'
import { passwordValidator, PASSWORD_RULES } from '../utils/passwordValidation'
import { authService } from '../services/api'
import useAuthStore from '../store/authStore'
import logoCRG from '../assets/logo_crg.png'

/**
 * Page de changement de mot de passe obligatoire à la première connexion
 * Affichée lorsque must_change_password = true
 */
export default function ChangePasswordInitiale() {
  const navigate = useNavigate()
  const { user, isAuthenticated, updateUser } = useAuthStore()
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
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    if (user && !user.mustChangePassword) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const onSubmit = async (data) => {
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      await authService.changePasswordInitial(data.password)
      updateUser({ mustChangePassword: false })
      setSuccess('Votre mot de passe a été modifié. Redirection vers le tableau de bord...')
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 1500)
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-50 dark:from-gray-950 dark:via-emerald-950/20 dark:to-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#006020] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-50 via-emerald-50/40 to-gray-100 dark:from-gray-950 dark:via-emerald-950/30 dark:to-gray-900">
      {/* Fond décoratif */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#006020/8%,transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,_#059669/10%,transparent_50%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#006020]/5 to-transparent dark:from-emerald-500/5" />
      <div className="absolute top-1/4 -left-20 w-64 h-64 rounded-full bg-[#006020]/10 dark:bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-[#006020]/8 dark:bg-emerald-500/8 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo et branding */}
        <div className="flex flex-col items-center mb-8">
          <img src={logoCRG} alt="CRG" className="h-14 w-auto object-contain drop-shadow-sm" />
          <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">Crédit Rural de Guinée</p>
        </div>

        {/* Carte principale */}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-black/30 border border-gray-200/80 dark:border-gray-700/50 overflow-hidden">
          {/* Bandeau header */}
          <div className="bg-gradient-to-r from-[#006020] to-[#007a28] dark:from-emerald-600 dark:to-emerald-500 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                <KeyRound size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Nouveau mot de passe requis
                </h1>
                <p className="text-sm text-white/90 mt-0.5">
                  Pour des raisons de sécurité, définissez un mot de passe personnel.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6" noValidate>
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 flex items-start gap-3">
                <AlertCircle size={22} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
            {success && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3">
                <CheckCircle size={22} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800 dark:text-emerald-200">{success}</p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#006020] dark:group-focus-within:text-emerald-400 transition-colors z-10">
                  <Lock size={20} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Le mot de passe est requis',
                    validate: passwordValidator,
                  })}
                  className={`w-full pl-12 pr-12 py-3.5 rounded-2xl border-2 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 ${
                    errors.password
                      ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20 focus:border-red-500'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#006020] dark:focus:border-emerald-500 focus:ring-4 focus:ring-[#006020]/10 dark:focus:ring-emerald-500/10'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-gray-400 hover:text-[#006020] dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle size={14} /> {errors.password.message}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{PASSWORD_RULES.join(' · ')}</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: 'Veuillez confirmer le mot de passe',
                    validate: (value) => value === password || 'Les mots de passe ne correspondent pas',
                  })}
                  className={`w-full px-4 py-3.5 rounded-2xl border-2 transition-all duration-200 ${
                    errors.confirmPassword
                      ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#006020] dark:focus:border-emerald-500 focus:ring-4 focus:ring-[#006020]/10 dark:focus:ring-emerald-500/10'
                  }`}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertCircle size={14} /> {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-[#006020] to-[#007a28] hover:from-[#004d18] hover:to-[#006020] dark:from-emerald-600 dark:to-emerald-500 dark:hover:from-emerald-700 dark:hover:to-emerald-600 shadow-lg shadow-[#006020]/25 dark:shadow-emerald-500/20 hover:shadow-xl hover:shadow-[#006020]/30 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Modification en cours...
                </>
              ) : (
                <>
                  <Shield size={20} />
                  Définir mon mot de passe
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Sécurité · Crédit Rural de Guinée
        </p>
      </div>
    </div>
  )
}
