import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff, KeyRound, Sparkles, Shield, Check } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { authService } from '../services/api'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { passwordValidator, getPasswordRulesStatus } from '../utils/passwordValidation'
import logoCRG from '../assets/logo_crg.png'

/**
 * Page de connexion - Crédit Rural de Guinée
 * Si mustChangePassword : le formulaire login est remplacé par le formulaire de changement de mot de passe.
 */

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, logout, user, updateUser } = useAuthStore()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [forgotPasswordError, setForgotPasswordError] = useState('')
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [changePwdSuccess, setChangePwdSuccess] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showChangePwdPassword, setShowChangePwdPassword] = useState(false)
  const [showChangePwdConfirm, setShowChangePwdConfirm] = useState(false)

  // Vérifier si une déconnexion explicite a été effectuée
  // Si oui, forcer la déconnexion et ne pas rediriger
  useEffect(() => {
    const explicitLogout = sessionStorage.getItem('crg-explicit-logout')
    if (explicitLogout === 'true' && isAuthenticated) {
      console.log('🚪 Déconnexion explicite détectée sur la page Login, forcer la déconnexion')
      // Nettoyer le flag
      sessionStorage.removeItem('crg-explicit-logout')
      // Forcer la déconnexion
      logout()
    }
  }, [isAuthenticated, logout])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const {
    register: registerForgotPassword,
    handleSubmit: handleForgotPasswordSubmit,
    formState: { errors: forgotPasswordErrors },
    reset: resetForgotPasswordForm,
  } = useForm()

  const onSubmit = async (data) => {
    setError('')
    setIsLoading(true)

    try {
      const response = await authService.login(data.email, data.password)
      login(response.user, response.token, response.session)
      // Première connexion : rester sur /login et afficher le formulaire changement MDP
      if (response.mustChangePassword) {
        setError('')
        // Le formulaire login sera remplacé par le formulaire changement MDP
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la connexion')
    } finally {
      setIsLoading(false)
    }
  }

  const showChangePasswordForm = isAuthenticated && user?.mustChangePassword

  const {
    register: registerChangePwd,
    handleSubmit: handleChangePwdSubmit,
    watch: watchChangePwd,
    formState: { errors: changePwdErrors },
    reset: resetChangePwd,
  } = useForm()

  const changePwdPassword = watchChangePwd('password')

  const onSubmitChangePassword = async (data) => {
    setError('')
    setChangePwdSuccess('')
    setIsChangingPassword(true)
    try {
      await authService.changePasswordInitial(data.password)
      updateUser({ mustChangePassword: false })
      setChangePwdSuccess('Mot de passe modifié. Redirection...')
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200)
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const onForgotPasswordSubmit = async (data) => {
    setForgotPasswordError('')
    setForgotPasswordSuccess('')
    setIsSendingReset(true)

    try {
      const result = await authService.forgotPassword(data.email)
      setForgotPasswordSuccess(result.message || 'Un email de réinitialisation a été envoyé.')
      resetForgotPasswordForm()
      setTimeout(() => {
        setShowForgotPasswordModal(false)
        setForgotPasswordSuccess('')
      }, 5000)
    } catch (err) {
      setForgotPasswordError(err.message || 'Une erreur est survenue lors de l\'envoi de l\'email')
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <div className="h-dvh min-h-[500px] max-h-dvh flex flex-col lg:flex-row overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* ========== HEADER MOBILE – Logo compact (visible uniquement sur mobile) ========== */}
      <div className="lg:hidden flex items-center justify-center gap-2 py-2 px-2 sm:py-2.5 sm:px-3 border-b border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shrink-0">
        <img src={logoCRG} alt="CRG" className="h-8 sm:h-10 w-auto object-contain" />
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-[#006020] dark:text-emerald-400 truncate">Crédit Rural de Guinée</h1>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Gestion des missions</p>
        </div>
      </div>

      {/* ========== PANNEAU GAUCHE – Paysage rural CRG ========== */}
      <div className="login-brand-panel relative hidden lg:flex lg:w-1/2 min-h-[200px] lg:min-h-screen items-center justify-center overflow-hidden">
        {/* Fond + soleil doré */}
        <div className="absolute inset-0 login-landscape-bg"></div>
        <div className="absolute top-8 right-12 w-64 h-64 rounded-full bg-amber-400/15 blur-[80px] animate-pulse-slow"></div>
        <div className="absolute top-12 right-16 w-32 h-32 rounded-full bg-amber-300/20 blur-[40px]"></div>

        {/* Collines organiques – 5 couches */}
        <svg className="absolute inset-0 w-full h-full login-hills" viewBox="0 0 800 600" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="hill1" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#001a08" />
              <stop offset="100%" stopColor="#003d14" />
            </linearGradient>
            <linearGradient id="hill2" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#002a0e" />
              <stop offset="100%" stopColor="#004518" />
            </linearGradient>
            <linearGradient id="hill3" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#003310" />
              <stop offset="100%" stopColor="#005520" />
            </linearGradient>
            <linearGradient id="hill4" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#004518" />
              <stop offset="100%" stopColor="#006020" />
            </linearGradient>
            <linearGradient id="hill5" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#003d14" />
              <stop offset="100%" stopColor="#005a1f" />
            </linearGradient>
          </defs>
          <path className="login-hill login-hill-1" fill="url(#hill1)" d="M0,600 Q120,420 280,480 T560,520 T800,500 L800,600 Z" />
          <path className="login-hill login-hill-2" fill="url(#hill2)" d="M0,600 Q180,380 360,440 T720,500 T800,520 L800,600 Z" />
          <path className="login-hill login-hill-3" fill="url(#hill3)" d="M0,600 Q220,340 440,400 T800,460 L800,600 Z" />
          <path className="login-hill login-hill-4" fill="url(#hill4)" d="M0,600 Q160,360 400,420 T800,480 L800,600 Z" />
          <path className="login-hill login-hill-5" fill="url(#hill5)" d="M0,600 Q80,440 240,500 T600,550 T800,530 L800,600 Z" />
        </svg>

        {/* Palmiers – avec animation sway */}
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

        {/* Feuilles flottantes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="login-leaf absolute text-amber-200/30" style={{ left: `${10 + i * 18}%`, top: `${15 + (i % 4) * 20}%`, animationDelay: `${i * 0.8}s` }}>
              <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" style={{ transform: `rotate(${i * 30}deg)` }}>
                <path d="M6 0 Q12 9 6 18 Q0 9 6 0" />
              </svg>
            </div>
          ))}
        </div>

        {/* Particules dorées – plus nombreuses */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-amber-300/70 login-particle"
              style={{
                width: `${2 + (i % 3)}px`,
                height: `${2 + (i % 3)}px`,
                left: `${5 + (i * 5) % 90}%`,
                top: `${10 + (i % 6) * 12}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${3 + (i % 4)}s`,
              }}
            />
          ))}
        </div>

        {/* Rayon lumineux renforcé */}
        <div className="absolute inset-0 login-light-ray pointer-events-none"></div>

        {/* Texture grain subtile */}
        <div className="absolute inset-0 login-grain pointer-events-none"></div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>

        {/* Contenu – compact pour tout afficher */}
        <div className="relative z-10 flex flex-col items-center justify-center px-8 py-6 text-center max-w-md login-content-reveal">
          <div className="flex items-center gap-2 mb-4 opacity-95">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-amber-200/95 text-xs font-semibold tracking-[0.3em] uppercase">Institution financière</span>
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          </div>
          <h1 className="text-2xl xl:text-3xl font-black text-white tracking-tight leading-[1.1] mb-3 login-title-hero">
            CRÉDIT RURAL<br />DE GUINÉE
          </h1>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-0.5 bg-amber-400/80 rounded-full"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/90"></div>
            <div className="w-8 h-0.5 bg-amber-400/80 rounded-full"></div>
          </div>
          <p className="text-white/95 text-sm font-medium">
            Système de gestion des missions
          </p>
          <div className="mt-4 px-4 py-2.5 rounded-lg border border-amber-400/20 bg-white/[0.03]">
            <p className="text-amber-100/90 text-xs italic">« Au service du développement rural »</p>
          </div>
        </div>
      </div>

      {/* ========== PANNEAU DROIT – Formulaire ========== */}
      <div className="lg:w-1/2 flex flex-col p-0 login-form-panel min-h-0 flex-1 lg:flex-none overflow-hidden">
        <div className="w-full h-full flex flex-col min-h-0 animate-login-form-in">
          <div className="login-form-card group flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl lg:rounded-none lg:rounded-l-2xl">
          <div className="flex-1 flex flex-col min-h-0 w-full relative overflow-hidden justify-center items-center py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-10">
          {/* Fond décoratif – motif subtil */}
          <div className="absolute inset-0 login-form-pattern opacity-[0.02] dark:opacity-[0.03] pointer-events-none" />
          <div className="absolute top-0 left-0 w-1 h-32 bg-gradient-to-b from-[#006020] via-[#006020]/60 to-transparent dark:from-emerald-500 dark:via-emerald-500/60 rounded-b-full" />
          <div className="absolute top-1/3 -right-24 w-56 h-56 bg-[#006020]/8 dark:bg-emerald-500/8 rounded-full blur-3xl" />
          <div className="absolute top-2/3 -left-16 w-32 h-32 bg-[#006020]/5 dark:bg-emerald-500/5 rounded-full blur-2xl" />

          {/* Header */}
          <div className="hidden sm:block relative w-full flex-shrink-0 max-w-md mx-auto mb-8 lg:mb-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-br from-[#006020] to-[#004d18] dark:from-emerald-500 dark:to-emerald-700 rounded-2xl opacity-25 group-hover:opacity-40 blur-sm transition-all duration-300" />
                <div className="relative w-14 h-14 rounded-2xl bg-white dark:bg-gray-800/95 flex items-center justify-center shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-100/80 dark:border-gray-700/50">
                  <img src={logoCRG} alt="CRG" className="h-8 w-auto object-contain" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  Crédit Rural de Guinée
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Gestion des missions</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-extrabold text-gray-900 dark:text-white tracking-tight text-2xl sm:text-3xl lg:text-4xl">
                {showChangePasswordForm ? 'Nouveau mot de passe requis' : 'Bienvenue'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                Sécurisé
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-snug text-sm mb-0">
              {showChangePasswordForm
                ? 'Pour des raisons de sécurité, définissez un mot de passe personnel.'
                : 'Connectez-vous pour accéder à votre espace de travail'}
            </p>
          </div>
          <div className="sm:hidden relative flex-shrink-0 mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              {showChangePasswordForm ? 'Nouveau mot de passe' : 'Connexion'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {showChangePasswordForm ? 'Définissez votre mot de passe' : 'Entrez vos identifiants'}
            </p>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-6 py-4 px-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 flex items-center gap-3 animate-login-error-in shadow-sm max-w-md w-full mx-auto"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400" aria-hidden />
              </div>
              <span className="text-sm font-medium text-red-800 dark:text-red-200">{error}</span>
            </div>
          )}

          {/* Message succès changement MDP */}
          {changePwdSuccess && (
            <div className="mb-6 py-4 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3 max-w-md w-full mx-auto">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Shield size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{changePwdSuccess}</span>
            </div>
          )}

          {/* FORMULAIRE CHANGEMENT MOT DE PASSE (remplace le login) */}
          {showChangePasswordForm ? (
            <form onSubmit={handleChangePwdSubmit(onSubmitChangePassword)} className="max-w-md w-full mx-auto relative" noValidate>
              {/* Encart information raffiné */}
              <div className="mb-8 p-5 rounded-2xl border border-[#006020]/20 dark:border-emerald-500/20 bg-gradient-to-br from-[#006020]/5 to-emerald-500/5 dark:from-emerald-500/5 dark:to-emerald-600/5 animate-login-field">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#006020]/10 dark:bg-emerald-500/15 flex items-center justify-center">
                    <Shield size={24} className="text-[#006020] dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Première connexion — Mot de passe requis</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pour sécuriser votre compte, choisissez un mot de passe personnel et unique.</p>
                  </div>
                </div>
              </div>

              {/* Champ Nouveau mot de passe */}
              <div className="mb-4 animate-login-field" style={{ animationDelay: '0.05s' }}>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nouveau mot de passe</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#006020] dark:group-focus-within:text-emerald-400 transition-all duration-200 z-10 pointer-events-none" />
                  <input
                    id="newPassword"
                    type={showChangePwdPassword ? 'text' : 'password'}
                    {...registerChangePwd('password', {
                      required: 'Le mot de passe est requis',
                      validate: passwordValidator,
                    })}
                    className={`login-input-v3 w-full pl-11 pr-12 py-3 rounded-xl border-2 transition-all duration-300 ${
                      changePwdErrors.password
                        ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm focus:border-[#006020] dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-[#006020]/10 dark:focus:ring-emerald-500/10 focus:shadow-md focus:shadow-[#006020]/5 dark:focus:shadow-emerald-500/5'
                    }`}
                    placeholder="Entrez votre nouveau mot de passe"
                    autoFocus
                    aria-invalid={!!changePwdErrors.password}
                  />
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-[#006020] dark:bg-emerald-500 scale-y-0 group-focus-within:scale-y-100 origin-bottom transition-transform duration-300 z-10" />
                  <button
                    type="button"
                    onClick={() => setShowChangePwdPassword(!showChangePwdPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-[#006020] dark:hover:text-emerald-400 hover:bg-[#006020]/5 dark:hover:bg-emerald-500/10 transition-all"
                    aria-label={showChangePwdPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showChangePwdPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {changePwdErrors.password && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5" role="alert">
                    <AlertCircle size={14} /> {changePwdErrors.password.message}
                  </p>
                )}
                {/* Indicateur de règles en temps réel */}
                {changePwdPassword && (
                  <div className="mt-3 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/50">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Le mot de passe doit contenir :</p>
                    <ul className="space-y-1.5">
                      {getPasswordRulesStatus(changePwdPassword).map((rule, i) => (
                        <li key={i} className={`flex items-center gap-2 text-xs ${rule.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${rule.met ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-gray-200 dark:bg-gray-600'}`}>
                            {rule.met ? <Check size={10} strokeWidth={3} /> : null}
                          </span>
                          <span className={rule.met ? 'font-medium' : ''}>{rule.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Champ Confirmer mot de passe */}
              <div className="mb-6 animate-login-field" style={{ animationDelay: '0.1s' }}>
                <label htmlFor="confirmNewPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Confirmer le mot de passe</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#006020] dark:group-focus-within:text-emerald-400 transition-all duration-200 z-10 pointer-events-none" />
                  <input
                    id="confirmNewPassword"
                    type={showChangePwdConfirm ? 'text' : 'password'}
                    {...registerChangePwd('confirmPassword', {
                      required: 'Veuillez confirmer le mot de passe',
                      validate: (v) => v === changePwdPassword || 'Les mots de passe ne correspondent pas',
                    })}
                    className={`login-input-v3 w-full pl-11 pr-12 py-3 rounded-xl border-2 transition-all duration-300 ${
                      changePwdErrors.confirmPassword
                        ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm focus:border-[#006020] dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-[#006020]/10 dark:focus:ring-emerald-500/10 focus:shadow-md focus:shadow-[#006020]/5 dark:focus:shadow-emerald-500/5'
                    }`}
                    placeholder="Répétez le mot de passe"
                    aria-invalid={!!changePwdErrors.confirmPassword}
                  />
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-[#006020] dark:bg-emerald-500 scale-y-0 group-focus-within:scale-y-100 origin-bottom transition-transform duration-300 z-10" />
                  <button
                    type="button"
                    onClick={() => setShowChangePwdConfirm(!showChangePwdConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-[#006020] dark:hover:text-emerald-400 hover:bg-[#006020]/5 dark:hover:bg-emerald-500/10 transition-all"
                    aria-label={showChangePwdConfirm ? 'Masquer' : 'Afficher'}
                  >
                    {showChangePwdConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {changePwdErrors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5" role="alert">
                    <AlertCircle size={14} /> {changePwdErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Bouton submit */}
              <button
                type="submit"
                disabled={isChangingPassword}
                className="login-btn-v3 group/btn relative w-full py-3.5 px-6 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-3 overflow-hidden transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-4 focus:ring-[#006020]/30 focus:ring-offset-2 animate-login-field"
                style={{ animationDelay: '0.15s' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 pointer-events-none" />
                <span className="relative z-10 flex items-center gap-3">
                  {isChangingPassword ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Modification en cours...
                    </>
                  ) : (
                    <>
                      <Shield size={20} className="opacity-90" />
                      Définir mon mot de passe
                    </>
                  )}
                </span>
              </button>
            </form>
          ) : (
          /* Formulaire CONNEXION */
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-md w-full mx-auto relative" noValidate>
            {/* Champ Email */}
            <div className="mb-4 animate-login-field" style={{ animationDelay: '0.05s' }}>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Adresse email
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#006020] dark:group-focus-within:text-emerald-400 transition-all duration-200 z-10">
                  <Mail aria-hidden />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  {...register('email', {
                    required: "L'email est requis",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email invalide',
                    },
                  })}
                  className={`login-input-v3 w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all duration-300 ${errors.email ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm focus:border-[#006020] dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-[#006020]/10 dark:focus:ring-emerald-500/10 focus:shadow-md focus:shadow-[#006020]/5 dark:focus:shadow-emerald-500/5'}`}
                  placeholder="votre.email@crg.gn"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-[#006020] dark:bg-emerald-500 scale-y-0 group-focus-within:scale-y-100 origin-bottom transition-transform duration-300 z-10" />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5" role="alert">
                  <AlertCircle size={14} />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Champ Mot de passe */}
            <div className="mb-4 animate-login-field" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-sm font-medium text-[#006020] dark:text-emerald-400 hover:text-[#004d18] dark:hover:text-emerald-300 transition-colors focus:outline-none focus:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#006020] dark:group-focus-within:text-emerald-400 transition-all duration-200 z-10">
                  <Lock aria-hidden />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password', {
                    required: 'Le mot de passe est requis',
                    minLength: {
                      value: 6,
                      message: 'Le mot de passe doit contenir au moins 6 caractères',
                    },
                  })}
                  className={`login-input-v3 w-full pl-11 pr-12 py-3 rounded-xl border-2 transition-all duration-300 ${errors.password ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm focus:border-[#006020] dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-[#006020]/10 dark:focus:ring-emerald-500/10 focus:shadow-md focus:shadow-[#006020]/5 dark:focus:shadow-emerald-500/5'}`}
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-[#006020] dark:bg-emerald-500 scale-y-0 group-focus-within:scale-y-100 origin-bottom transition-transform duration-300 z-10" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-[#006020] dark:hover:text-emerald-400 hover:bg-[#006020]/5 dark:hover:bg-emerald-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-[#006020]/20"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5" role="alert">
                  <AlertCircle size={14} />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={isLoading}
              className="login-btn-v3 group/btn relative w-full py-3.5 px-6 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-3 mb-4 overflow-hidden transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-4 focus:ring-[#006020]/30 focus:ring-offset-2"
              aria-busy={isLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 pointer-events-none" />
              <span className="relative z-10 flex items-center gap-3">
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <LogIn size={20} className="opacity-90" />
                </>
              )}
              </span>
            </button>

            <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
              Seul l&apos;administrateur peut créer les comptes utilisateurs.
            </p>
          </form>
          )}
          </div>
          </div>
        </div>
      </div>

      {/* Modal mot de passe oublié */}
      <Modal
        isOpen={showForgotPasswordModal}
        onClose={() => {
          setShowForgotPasswordModal(false)
          setForgotPasswordError('')
          setForgotPasswordSuccess('')
          resetForgotPasswordForm()
        }}
        title="Réinitialisation du mot de passe"
        size="md"
      >
        <form onSubmit={handleForgotPasswordSubmit(onForgotPasswordSubmit)} className="space-y-4">
          {forgotPasswordError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-lg flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-800 dark:text-red-200">{forgotPasswordError}</span>
            </div>
          )}

          {forgotPasswordSuccess && (
            <div className="p-3 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 rounded-lg flex items-center gap-2">
              <AlertCircle size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-sm text-green-800 dark:text-green-200">{forgotPasswordSuccess}</span>
            </div>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            <br />
            <span className="text-xs text-gray-500 dark:text-gray-500 mt-2 block">
              Note: Cette fonctionnalité est disponible uniquement pour les employés et chefs de service.
            </span>
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Mail size={14} className="text-crg-primary dark:text-crg-secondary" />
              Adresse email
            </label>
            <input
              type="email"
              {...registerForgotPassword('email', {
                required: 'L\'email est requis',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email invalide',
                },
              })}
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-crg-primary/50 focus:border-crg-primary dark:focus:border-crg-secondary transition-all"
              placeholder="votre.email@crg.gn"
            />
            {forgotPasswordErrors.email && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle size={12} />
                {forgotPasswordErrors.email.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForgotPasswordModal(false)
                setForgotPasswordError('')
                setForgotPasswordSuccess('')
                resetForgotPasswordForm()
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSendingReset}
              className="flex-1"
            >
              {isSendingReset ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Envoi...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <KeyRound size={16} />
                  Envoyer le lien
                </span>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

