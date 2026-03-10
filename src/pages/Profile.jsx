import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Mail, Lock, Save, Eye, EyeOff, AlertCircle, CheckCircle2, Shield } from 'lucide-react'
import { passwordValidator, PASSWORD_RULES } from '../utils/passwordValidation'
import useAuthStore from '../store/authStore'
import { supabase } from '../services/supabaseClient'
import { usersService } from '../services/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function Profile() {
  const { user, updateUser, refreshProfile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [signaturePinOld, setSignaturePinOld] = useState('')
  const [signaturePin, setSignaturePin] = useState('')
  const [signaturePinConfirm, setSignaturePinConfirm] = useState('')
  const [hasSignaturePin, setHasSignaturePin] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)
  const [pinMessage, setPinMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (!user?.id) {
      setProfileLoading(false)
      return
    }
    refreshProfile().finally(() => setProfileLoading(false))
  }, [user?.id, refreshProfile])

  useEffect(() => {
    if ((user?.role === 'directrice' || user?.role === 'admin') && user?.id) {
      usersService.hasSignaturePin().then(setHasSignaturePin).catch(() => setHasSignaturePin(false))
    }
  }, [user?.role, user?.id])

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: errorsProfile },
    reset: resetProfile,
  } = useForm({
    defaultValues: {
      name: user?.nom || user?.name || '',
      email: user?.email || '',
      fonction: user?.fonction || '',
      direction: user?.direction || '',
      gender: user?.gender || '',
    },
  })

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: errorsEmail },
  } = useForm({ defaultValues: { email: user?.email || '' } })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: errorsPassword },
    watch,
    reset: resetPassword,
  } = useForm()
  const newPassword = watch('newPassword')

  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.nom || user.name || '',
        email: user.email || '',
        fonction: user.fonction || '',
        direction: user.direction || '',
        gender: user.gender || '',
      })
    }
  }, [user, resetProfile])

  const onUpdateProfile = async (data) => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const updatedUser = await usersService.update(user.id, {
        name: data.name,
        fonction: data.fonction,
        direction: data.direction,
        gender: data.gender || null,
      })
      updateUser({ nom: updatedUser.name, name: updatedUser.name, fonction: updatedUser.fonction, direction: updatedUser.direction, gender: updatedUser.gender || null })
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès dans la base de données' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la mise à jour du profil' })
    } finally {
      setLoading(false)
    }
  }

  const onUpdateEmail = async (data) => {
    if (data.email === user?.email) return
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await supabase.auth.updateUser({ email: data.email })
      await supabase.from('users').update({ email: data.email, updated_at: new Date().toISOString() }).eq('id', user.id)
      updateUser({ email: data.email })
      setMessage({ type: 'success', text: 'Email mis à jour avec succès. Vérifiez votre nouvelle boîte mail pour confirmer.' })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la mise à jour de l\'email' })
    } finally {
      setLoading(false)
    }
  }

  const onUpdatePassword = async (data) => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await supabase.auth.signInWithPassword({ email: user?.email || '', password: data.currentPassword })
      await supabase.auth.updateUser({ password: data.newPassword })
      setMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès' })
      resetPassword()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la mise à jour du mot de passe' })
    } finally {
      setLoading(false)
    }
  }

  const onSetSignaturePin = async (e) => {
    e.preventDefault()
    setPinMessage({ type: '', text: '' })
    if (hasSignaturePin && (!signaturePinOld || signaturePinOld.length < 4)) {
      setPinMessage({ type: 'error', text: 'Saisissez votre ancien PIN pour confirmer la modification.' })
      return
    }
    if (!signaturePin || signaturePin.length < 4 || signaturePin.length > 6 || !/^[0-9]+$/.test(signaturePin)) {
      setPinMessage({ type: 'error', text: 'Le PIN doit contenir 4 à 6 chiffres.' })
      return
    }
    if (signaturePin !== signaturePinConfirm) {
      setPinMessage({ type: 'error', text: 'Les deux PIN ne correspondent pas.' })
      return
    }
    setPinLoading(true)
    try {
      if (hasSignaturePin) await usersService.verifySignaturePin(signaturePinOld)
      await usersService.setSignaturePin(signaturePin)
      setHasSignaturePin(true)
      setSignaturePinOld('')
      setSignaturePin('')
      setSignaturePinConfirm('')
      setPinMessage({ type: 'success', text: hasSignaturePin ? 'PIN modifié avec succès.' : 'PIN enregistré avec succès.' })
      setTimeout(() => setPinMessage({ type: '', text: '' }), 4000)
    } catch (err) {
      setPinMessage({ type: 'error', text: err.message || 'Erreur lors de l\'enregistrement du PIN.' })
    } finally {
      setPinLoading(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-2 border-[#006020] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mon Profil</h1>

      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' : 'bg-red-50 dark:bg-red-900/20 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} className="text-green-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
          <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>{message.text}</p>
        </div>
      )}

      {/* Informations personnelles */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informations personnelles</h2>
        <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom complet</label>
              <input type="text" {...registerProfile('name', { required: 'Le nom est requis' })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-crg-primary" placeholder="Votre nom complet" />
              {errorsProfile.name && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} /> {errorsProfile.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fonction</label>
              <input type="text" {...registerProfile('fonction')} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-crg-primary" placeholder="Ex: Développeur" />
            </div>
            {(user?.role === 'directrice' || user?.role === 'admin') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Genre</label>
                <select {...registerProfile('gender')} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-crg-primary">
                  <option value="">Détection automatique</option>
                  <option value="M">Homme</option>
                  <option value="F">Femme</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{(user?.role === 'directrice' || user?.role === 'admin') ? 'Direction' : 'Service'}</label>
              <select {...registerProfile('direction')} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-crg-primary">
                <option value="">Sélectionner</option>
                <option value="Direction DSI">Direction DSI</option>
                <option value="Service Digital">Service Digital</option>
                <option value="Service Développement et Innovation">Service Développement et Innovation</option>
                <option value="Service Informatique">Service Informatique</option>
                <option value="Service Opérationnel">Service Opérationnel</option>
                <option value="Service Centre de Validation">Service Centre de Validation</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enregistrement...</span> : <span className="flex items-center gap-2"><Save size={18} />Enregistrer</span>}
          </Button>
        </form>
      </Card>

      {/* PIN de signature – directeurs */}
      {(user?.role === 'directrice' || user?.role === 'admin') && (
        <Card className="p-6 border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-900/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><Shield size={20} className="text-amber-600" />PIN de signature</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Code à 4-6 chiffres pour signer les factures.</p>
          {pinMessage.text && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${pinMessage.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
              {pinMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {pinMessage.text}
            </div>
          )}
          <form onSubmit={onSetSignaturePin} className="space-y-4">
            {hasSignaturePin && (
              <div>
                <label className="block text-sm font-medium mb-2">Ancien PIN</label>
                <input type="password" inputMode="numeric" maxLength={6} value={signaturePinOld} onChange={(e) => setSignaturePinOld(e.target.value.replace(/\D/g, ''))} className="w-full max-w-xs px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800" placeholder="••••••" autoComplete="off" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{hasSignaturePin ? 'Nouveau PIN' : 'PIN'}</label>
                <input type="password" inputMode="numeric" maxLength={6} value={signaturePin} onChange={(e) => setSignaturePin(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800" placeholder="4 à 6 chiffres" autoComplete="off" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirmer</label>
                <input type="password" inputMode="numeric" maxLength={6} value={signaturePinConfirm} onChange={(e) => setSignaturePinConfirm(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800" placeholder="Répéter le PIN" autoComplete="off" />
              </div>
            </div>
            <Button type="submit" variant="primary" disabled={pinLoading}>
              {pinLoading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enregistrement...</span> : <span className="flex items-center gap-2"><Shield size={18} />{hasSignaturePin ? 'Modifier le PIN' : 'Définir le PIN'}</span>}
            </Button>
          </form>
        </Card>
      )}

      {/* Modifier l'email */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><Mail size={20} />Modifier l&apos;email</h2>
        <form onSubmit={handleSubmitEmail(onUpdateEmail)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nouvel email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="email" {...registerEmail('email', { required: 'L\'email est requis', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Email invalide' } })} className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800" placeholder="nouvel.email@crg.gn" />
            </div>
            {errorsEmail.email && <p className="mt-1 text-sm text-red-600">{errorsEmail.email.message}</p>}
          </div>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Mise à jour...</span> : <span className="flex items-center gap-2"><Save size={18} />Enregistrer l&apos;email</span>}
          </Button>
        </form>
      </Card>

      {/* Modifier le mot de passe */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><Lock size={20} />Modifier le mot de passe</h2>
        <form onSubmit={handleSubmitPassword(onUpdatePassword)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mot de passe actuel</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type={showCurrentPassword ? 'text' : 'password'} {...registerPassword('currentPassword', { required: 'Le mot de passe actuel est requis' })} className="w-full pl-11 pr-12 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800" placeholder="••••••••" />
              <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-crg-primary">{showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {errorsPassword.currentPassword && <p className="mt-1 text-sm text-red-600">{errorsPassword.currentPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type={showNewPassword ? 'text' : 'password'} {...registerPassword('newPassword', { required: 'Le nouveau mot de passe est requis', validate: passwordValidator })} className="w-full pl-11 pr-12 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800" placeholder="••••••••" />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-crg-primary">{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {errorsPassword.newPassword && <p className="mt-1 text-sm text-red-600">{errorsPassword.newPassword.message}</p>}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Règles : {PASSWORD_RULES.join(' · ')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Confirmer le nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type={showConfirmPassword ? 'text' : 'password'} {...registerPassword('confirmPassword', { required: 'La confirmation est requise', validate: (v) => v === newPassword || 'Les mots de passe ne correspondent pas' })} className="w-full pl-11 pr-12 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800" placeholder="••••••••" />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-crg-primary">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {errorsPassword.confirmPassword && <p className="mt-1 text-sm text-red-600">{errorsPassword.confirmPassword.message}</p>}
          </div>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Mise à jour...</span> : <span className="flex items-center gap-2"><Save size={18} />Enregistrer le mot de passe</span>}
          </Button>
        </form>
      </Card>
    </div>
  )
}
