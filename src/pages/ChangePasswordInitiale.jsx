import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Lock, AlertCircle, Eye, EyeOff, CheckCircle, Shield, Sparkles } from 'lucide-react'
import { passwordValidator, PASSWORD_RULES } from '../utils/passwordValidation'
import { authService } from '../services/api'
import useAuthStore from '../store/authStore'
import logoCRG from '../assets/logo_crg.png'

/**
 * Page de changement de mot de passe obligatoire à la première connexion
 * Design aligné sur la page Login (split layout)
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
      setSuccess('Votre mot de passe a été modifié. Redirection...')
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#006020] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh min-h-[500px] max-h-dvh flex flex-col lg:flex-row overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Header mobile */}
      <div className="lg:hidden flex items-center justify-center gap-2 py-3 px-3 border-b border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 shrink-0">
        <img src={logoCRG} alt="CRG" className="h-9 w-auto object-contain" />
        <span className="text-sm font-bold text-[#006020] dark:text-emerald-400">Crédit Rural</span>
      </div>

      {/* Panneau gauche – Branding (même style que Login) */}
      <div className="login-brand-panel relative hidden lg:flex lg:w-1/2 min-h-[180px] lg:min-h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 login-landscape-bg" />
        <div className="absolute top-8 right-12 w-64 h-64 rounded-full bg-amber-400/15 blur-[80px]" />
        <svg className="absolute inset-0 w-full h-full login-hills" viewBox="0 0 800 600" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="cpg-hill1" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#001a08" />
              <stop offset="100%" stopColor="#003d14" />
            </linearGradient>
            <linearGradient id="cpg-hill2" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#002a0e" />
              <stop offset="100%" stopColor="#004518" />
            </linearGradient>
            <linearGradient id="cpg-hill3" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#003310" />
              <stop offset="100%" stopColor="#005520" />
            </linearGradient>
            <linearGradient id="cpg-hill4" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#004518" />
              <stop offset="100%" stopColor="#006020" />
            </linearGradient>
            <linearGradient id="cpg-hill5" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#003d14" />
              <stop offset="100%" stopColor="#005a1f" />
            </linearGradient>
          </defs>
          <path className="login-hill login-hill-1" fill="url(#cpg-hill1)" d="M0,600 Q120,420 280,480 T560,520 T800,500 L800,600 Z" />
          <path className="login-hill login-hill-2" fill="url(#cpg-hill2)" d="M0,600 Q180,380 360,440 T720,500 T800,520 L800,600 Z" />
          <path className="login-hill login-hill-3" fill="url(#cpg-hill3)" d="M0,600 Q220,340 440,400 T800,460 L800,600 Z" />
          <path className="login-hill login-hill-4" fill="url(#cpg-hill4)" d="M0,600 Q160,360 400,420 T800,480 L800,600 Z" />
          <path className="login-hill login-hill-5" fill="url(#cpg-hill5)" d="M0,600 Q80,440 240,500 T600,550 T800,530 L800,600 Z" />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 h-1/2 flex items-end justify-around pointer-events-none">
          <svg className="login-palm login-palm-1 w-16 h-24 mb-4 text-white/45" viewBox="0 0 32 48" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M16 46 L16 24 M16 24 Q8 14 16 8 Q24 14 16 24 M16 24 Q22 18 26 10 M16 24 Q10 18 6 10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg className="login-palm login-palm-2 w-28 h-36 mb-0 text-white/55" viewBox="0 0 32 48" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M16 46 L16 18 M16 18 Q4 8 16 2 Q28 8 16 18 M16 18 Q24 12 30 4 M16 18 Q8 12 2 4 M16 18 L22 10 M16 18 L10 10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg className="login-palm login-palm-3 w-14 h-20 mb-8 text-white/40" viewBox="0 0 32 48" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M16 46 L16 26 M16 26 Q10 18 16 12 Q22 18 16 26 M16 26 Q20 22 22 16 M16 26 Q12 22 10 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 text-center px-8">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-95">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-200/95 text-xs font-semibold tracking-[0.3em] uppercase">Sécurité</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="text-2xl xl:text-3xl font-black text-white tracking-tight leading-tight mb-3">
            CRÉDIT RURAL<br />DE GUINÉE
          </h1>
          <div className="w-12 h-1 mx-auto rounded-full bg-amber-400/80 mb-4" />
          <p className="text-white/90 text-sm">Définissez votre mot de passe personnel</p>
          <div className="mt-6 p-3 rounded-lg border border-amber-400/20 bg-white/[0.03] inline-block">
            <Shield className="w-8 h-8 text-amber-400/90 mx-auto mb-2" />
            <p className="text-amber-100/90 text-xs">Protection de votre compte</p>
          </div>
        </div>
      </div>

      {/* Panneau droit – Formulaire */}
      <div className="flex-1 flex flex-col min-h-0 lg:w-1/2 bg-white dark:bg-gray-900 lg:rounded-l-2xl lg:shadow-2xl lg:shadow-gray-900/10">
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-8 lg:p-12 max-w-md w-full mx-auto">
          <div className="lg:hidden mb-6 text-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nouveau mot de passe requis</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Pour des raisons de sécurité</p>
          </div>
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nouveau mot de passe requis</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Pour des raisons de sécurité, définissez un mot de passe personnel.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
            {success && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3">
                <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800 dark:text-emerald-200">{success}</p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#006020] dark:group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Le mot de passe est requis',
                    validate: passwordValidator,
                  })}
                  className={`w-full pl-11 pr-12 py-3 rounded-xl border-2 transition-all text-gray-900 dark:text-white placeholder-gray-400 ${
                    errors.password
                      ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#006020] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#006020]/20 dark:focus:ring-emerald-500/20'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-[#006020] dark:hover:text-emerald-400 transition-colors"
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} /> {errors.password.message}
                </p>
              )}
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{PASSWORD_RULES.join(' · ')}</p>
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
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#006020] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#006020]/20 dark:focus:ring-emerald-500/20'
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
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-[#006020] hover:bg-[#004d18] dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#006020]/20 dark:shadow-emerald-500/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Modification...
                </>
              ) : (
                <>
                  <Shield size={18} />
                  Définir mon mot de passe
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
            Crédit Rural de Guinée · Sécurité
          </p>
        </div>
      </div>
    </div>
  )
}
