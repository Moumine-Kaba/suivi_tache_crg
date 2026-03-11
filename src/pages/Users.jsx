import { useState, useEffect } from 'react'
import { DIRECTION_OPTIONS, getServiceOptions } from '../constants/directions'
import { ROLES_CONFIG, FINANCE_ROLES } from '../constants/roles'
import { Users as UsersIcon, UserPlus, Edit, Trash2, Building2, Shield, Mail, Calendar, Search, AlertCircle, CheckCircle2, X, User, Lock, Briefcase, MapPin, Info, CheckCircle, UserX, Eye, Clock, Copy } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { useForm } from 'react-hook-form'
import { usersService, directionsService } from '../services/api'
import useAuthStore from '../store/authStore'
import { getDirectorLabel } from '../utils/directorLabel'
import { passwordValidator, validatePassword, PASSWORD_RULES, generateTemporaryPassword } from '../utils/passwordValidation'
import { ALLOWED_EMAIL_DOMAIN, isEmailAllowed } from '../constants/emailDomain'

export default function Users() {
  const { user: currentUser } = useAuthStore()
  
  // Debug: Vérifier le rôle de l'utilisateur actuel
  useEffect(() => {
    console.log('🔍 [Users] Utilisateur actuel:', currentUser)
    console.log('🔍 [Users] Rôle actuel:', currentUser?.role)
    console.log('🔍 [Users] Est admin?', currentUser?.role === 'admin')
  }, [currentUser])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [directionOptions, setDirectionOptions] = useState([])
  const [serviceOptions, setServiceOptions] = useState([])
  const [directionsWithServices, setDirectionsWithServices] = useState([])
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetPasswordError, setResetPasswordError] = useState('')
  const [deactivatingId, setDeactivatingId] = useState(null)
  const [reactivatingId, setReactivatingId] = useState(null)
  const [detailUser, setDetailUser] = useState(null)
  const [credentialsData, setCredentialsData] = useState(null)
  const [copiedField, setCopiedField] = useState(null)
  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm({
    defaultValues: { role: 'employe' }
  })
  
  // Surveiller le rôle sélectionné pour ajuster le label et les options
  const watchedRole = watch('role')
  const selectedRole = watchedRole ?? editingUser?.role ?? 'employe'
  const selectedDirection = watch('selectedDirection') || ''
  
  // Réinitialiser le service quand la direction change
  useEffect(() => {
    if (showModal && selectedDirection) {
      const dir = directionsWithServices.find(d => d.name === selectedDirection)
      const currentService = watch('direction')
      if (currentService && dir && !(dir.services || []).some(s => s.name === currentService)) {
        setValue('direction', '')
      }
    }
  }, [selectedDirection, showModal])
  
  // Services filtrés par la direction sélectionnée
  const filteredServiceOptions = selectedDirection && directionsWithServices.length
    ? (directionsWithServices.find(d => d.name === selectedDirection)?.services || []).map(s => ({ value: s.name, label: s.label }))
    : serviceOptions

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    const loadDirectionsAndServices = async () => {
      try {
        const dirs = await directionsService.getAll()
        const dirOpts = dirs.map(d => ({ value: d.name, label: d.label }))
        const svcOpts = []
        dirs.forEach(d => {
          (d.services || []).forEach(s => {
            if (!svcOpts.find(o => o.value === s.name)) {
              svcOpts.push({ value: s.name, label: s.label })
            }
          })
        })
        setDirectionOptions(dirOpts.length ? dirOpts : DIRECTION_OPTIONS)
        setServiceOptions(svcOpts.length ? svcOpts : getServiceOptions(true))
        setDirectionsWithServices(dirs || [])
      } catch {
        setDirectionOptions(DIRECTION_OPTIONS)
        setServiceOptions(getServiceOptions(true))
        setDirectionsWithServices([])
      }
    }
    if (currentUser?.role === 'admin') loadDirectionsAndServices()
  }, [currentUser?.role])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      // Vérifier le rôle de l'utilisateur actuel avant de charger
      console.log('🔍 [Users] Rôle utilisateur actuel:', currentUser?.role)
      console.log('🔍 [Users] Email utilisateur actuel:', currentUser?.email)
      console.log('🔍 [Users] Utilisateur complet:', currentUser)
      
      if (!currentUser) {
        const errorMsg = 'Utilisateur non connecté. Veuillez vous reconnecter.'
        console.error('❌', errorMsg)
        setError(errorMsg)
        setLoading(false)
        return
      }
      
      if (currentUser?.role !== 'admin') {
        const errorMsg = `Accès refusé. Rôle actuel: ${currentUser?.role || 'non défini'}. Seul l'admin peut voir tous les utilisateurs.`
        console.error('❌', errorMsg)
        setError(errorMsg)
        setLoading(false)
        return
      }
      
      console.log('✅ [Users] Rôle autorisé, chargement des utilisateurs...')
      const data = await usersService.getAll()
      console.log('✅ [Users] Utilisateurs récupérés:', data.length, data) // Debug
      // Debug: Afficher les rôles de tous les utilisateurs
      data.forEach((u, index) => {
        console.log(`  [${index}] ${u.name || u.email}: rôle="${u.role}" (type: ${typeof u.role})`)
      })
      setUsers(data)
    } catch (err) {
      console.error('❌ Erreur lors du chargement des utilisateurs:', err)
      setError(err.message || 'Erreur lors du chargement des utilisateurs')
      // Afficher plus de détails dans la console pour debug
      if (err.response) {
        console.error('Détails de l\'erreur:', err.response)
      }
    } finally {
      setLoading(false)
    }
  }

  const findDirectionForService = (serviceName) => {
    if (!serviceName) return ''
    const dir = directionsWithServices.find(d =>
      (d.services || []).some(s => s.name === serviceName)
    )
    return dir?.name || ''
  }

  const handleCreate = () => {
    setEditingUser(null)
    reset({
      nom: '',
      prenom: '',
      matricule: '',
      email: '',
      role: 'employe',
      selectedDirection: '',
      direction: '',
      fonction: '',
      gender: '',
    })
    setShowModal(true)
  }

  // Vérifier si l'utilisateur actuel est admin pour permettre la création d'admin
  const canCreateAdmin = currentUser?.role === 'admin'

  const handleEdit = (user) => {
    setEditingUser(user)
    const serviceName = user.direction || ''
    // Décomposer name en nom/prénom si nécessaire (rétrocompatibilité)
    const fullName = user.name || user.nom || ''
    const parts = fullName.trim().split(/\s+/)
    const prenom = user.prenom || (parts.length > 1 ? parts[0] : '')
    const nom = user.nom || (parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '')
    reset({
      nom: nom || fullName,
      prenom: prenom,
      matricule: user.matricule || '',
      email: user.email,
      role: user.role,
      selectedDirection: findDirectionForService(serviceName),
      direction: serviceName,
      fonction: user.fonction || '',
      gender: user.gender || '',
    })
    setShowModal(true)
  }

  const handleReactivate = async (userId) => {
    setError(null)
    setSuccess(null)
    setReactivatingId(userId)
    try {
      await usersService.setActive(userId, true)
      setSuccess('Compte réactivé.')
      await loadUsers()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err.message || 'Erreur lors de la réactivation')
    } finally {
      setReactivatingId(null)
    }
  }

  const handleDeactivate = async (userId) => {
    const u = users.find(x => x.id === userId)
    if (!window.confirm(`Désactiver le compte de "${u?.name || u?.email}" ? L'utilisateur sera déconnecté et ne pourra plus se connecter.`)) return
    setError(null)
    setSuccess(null)
    setDeactivatingId(userId)
    try {
      await usersService.setActive(userId, false)
      setSuccess('Compte désactivé. L\'utilisateur a été déconnecté.')
      await loadUsers()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err.message || 'Erreur lors de la désactivation du compte')
    } finally {
      setDeactivatingId(null)
    }
  }

  const handleDelete = async (id) => {
    const userToDelete = users.find(u => u.id === id)
    const isDirector = userToDelete?.role === 'directrice'
    const confirmMsg = isDirector
      ? `⚠️ ATTENTION : Vous êtes sur le point de supprimer un compte DIRECTRICE.\n\nÊtes-vous absolument sûr ? Cette action est irréversible.`
      : `Êtes-vous sûr de vouloir supprimer l'utilisateur "${userToDelete?.name || userToDelete?.email}" ?\n\nCette action supprimera les métadonnées de l'utilisateur dans la base de données. L'utilisateur dans Supabase Auth devra être supprimé manuellement si nécessaire.`
    if (window.confirm(confirmMsg)) {
      setError(null)
      setSuccess(null)
      setIsSubmitting(true)
      try {
        await usersService.delete(id)
        setSuccess('Utilisateur supprimé avec succès')
        await loadUsers()
        // Masquer le message de succès après 3 secondes
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        console.error('Erreur lors de la suppression:', err)
        setError(err.message || 'Erreur lors de la suppression de l\'utilisateur')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const onSubmit = async (data) => {
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    const payload = { ...data }
    delete payload.selectedDirection
    try {
      if (editingUser) {
        // Modification d'un utilisateur existant
        const updatePayload = {
          ...payload,
          name: [payload.prenom, payload.nom].filter(Boolean).join(' ').trim() || payload.nom || payload.prenom,
          nom: payload.nom,
          prenom: payload.prenom,
          matricule: payload.matricule,
        }
        console.log('💾 Mise à jour de l\'utilisateur:', editingUser.id, updatePayload)
        const updatedUser = await usersService.update(editingUser.id, updatePayload)
        console.log('✅ Utilisateur mis à jour avec succès:', updatedUser)
        setSuccess('Utilisateur modifié avec succès dans la base de données')
        setShowModal(false)
        reset()
        await loadUsers()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        // Création : mot de passe temporaire généré automatiquement
        const tempPassword = generateTemporaryPassword()
        const createPayload = {
          ...payload,
          name: [payload.prenom, payload.nom].filter(Boolean).join(' ').trim() || payload.nom || payload.prenom,
          password: tempPassword,
          mustChangePassword: true,
        }
        console.log('🆕 Création d\'un nouvel utilisateur:', createPayload.email)
        const newUser = await usersService.create(createPayload)
        const displayName = createPayload.name || createPayload.email
        console.log('✅ Utilisateur créé avec succès:', newUser)

        setShowModal(false)
        setSuccess(null)
        reset()
        await loadUsers()
        setCredentialsData({
          displayName,
          email: createPayload.email,
          tempPassword,
          isAuthCreated: !!newUser.authCreated,
        })
      }
    } catch (err) {
      console.error('❌ Erreur lors de la sauvegarde:', err)
      setError(err.message || 'Erreur lors de la sauvegarde de l\'utilisateur')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleBadge = (role) => {
    const variants = {
      admin: 'primary',
      directrice: 'primary',
      chef: 'secondary',
      employe: 'info',
      lecture: 'warning',
      comptable: 'success',
      gestion: 'success',
    }
    return variants[role] || 'info'
  }

  const getRoleLabel = (userOrRole) => {
    const role = typeof userOrRole === 'object' ? userOrRole?.role : userOrRole
    const labels = {
      admin: 'Admin',
      directrice: (u) => {
        const label = getDirectorLabel(u)
        return label.charAt(0).toUpperCase() + label.slice(1)
      },
      chef: 'Chef de Service',
      employe: 'Employé',
      lecture: 'Lecture seule',
      comptable: 'Comptable',
      gestion: 'Service Gestion',
    }
    const val = labels[role]
    return typeof val === 'function' ? val(typeof userOrRole === 'object' ? userOrRole : null) : (val || role)
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = !roleFilter || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const stats = {
    total: users.length,
    directrice: users.filter(u => u.role === 'directrice').length,
    chef: users.filter(u => u.role === 'chef').length,
    employe: users.filter(u => u.role === 'employe').length,
    lecture: users.filter(u => u.role === 'lecture').length,
    comptable: users.filter(u => u.role === 'comptable').length,
    gestion: users.filter(u => u.role === 'gestion').length,
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* En-tête avec stats compactes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vue d'ensemble</span>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006020]/10 text-[#006020] dark:bg-[#006020]/20 dark:text-emerald-300 text-sm font-medium">
              <UsersIcon size={14} /> {stats.total}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-sm">
              <Shield size={14} /> {stats.directrice}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm" title="Chefs + Employés">
              {stats.chef + stats.employe} actifs
            </span>
          </div>
        </div>
        <Button onClick={handleCreate} variant="primary" size="sm" className="flex items-center gap-2 shrink-0">
          <UserPlus size={16} />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Barre de recherche et filtre */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006020]/20 focus:border-[#006020] transition-all"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#006020]/20 cursor-pointer min-w-[160px]"
        >
          <option value="">Tous les rôles</option>
          <option value="admin">Admin</option>
          <option value="directrice">Directeur·trice</option>
          <option value="chef">Chef de Service</option>
          <option value="employe">Employé</option>
          <option value="comptable">Comptable</option>
          <option value="gestion">Service Gestion</option>
          <option value="lecture">Lecture seule</option>
        </select>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-200 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600">
            <X size={16} />
          </button>
        </div>
      )}
      {success && !credentialsData && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-800 dark:text-emerald-200 flex-1">{success}</p>
          <button onClick={() => setSuccess(null)} className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Table des utilisateurs */}
      <Card className="overflow-hidden p-0 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 shadow-sm">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-crg-primary"></div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left py-4 px-5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-4 px-5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rôle</th>
                  <th className="text-left py-4 px-5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Créé le</th>
                  <th className="text-right py-4 px-5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <UsersIcon size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3 opacity-60" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 dark:border-gray-800/80 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#006020] to-[#008030] flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                            {user.name?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[180px] block">{user.email}</span>
                      </td>
                      <td className="py-4 px-5">
                        <Badge variant={getRoleBadge(user.role)} size="sm">
                          {getRoleLabel(user)}
                        </Badge>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailUser(user)}
                            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-500/15 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye size={16} />
                          </button>
                          {currentUser?.role === 'admin' ? (
                            user.role === 'admin' ? (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">Protégé</span>
                            ) : (
                              <>
                                {user.isActive === false ? (
                                  <button
                                    onClick={() => handleReactivate(user.id)}
                                    disabled={reactivatingId !== null}
                                    className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                                    title="Réactiver"
                                  >
                                    {reactivatingId === user.id ? (
                                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <CheckCircle size={16} />
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDeactivate(user.id)}
                                    disabled={deactivatingId !== null}
                                    className="p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-colors disabled:opacity-50"
                                    title="Désactiver"
                                  >
                                    {deactivatingId === user.id ? (
                                      <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <UserX size={16} />
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEdit(user)}
                                  disabled={isSubmitting}
                                  className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 transition-colors disabled:opacity-50"
                                  title="Modifier"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setResetPasswordUser(user)
                                    setResetPasswordValue('')
                                    setResetPasswordError('')
                                    setShowResetPasswordModal(true)
                                  }}
                                  disabled={isSubmitting}
                                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-500/15 transition-colors disabled:opacity-50"
                                  title="Réinitialiser mot de passe"
                                >
                                  <Lock size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  disabled={isSubmitting}
                                  className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                                  title="Supprimer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )
                          ) : (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal création/édition */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          reset()
        }}
        title={editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        size="xl"
        disableBodyScroll
        className="max-h-none overflow-visible"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* En-tête avec icône */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="p-3 bg-gradient-to-br from-crg-primary to-crg-secondary rounded-xl shadow-lg">
              <User size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingUser ? 'Modifier les informations' : 'Créer un nouvel utilisateur'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {editingUser ? 'Mettez à jour les informations de l\'utilisateur' : 'Remplissez le formulaire pour créer un nouvel utilisateur'}
              </p>
            </div>
          </div>

          {/* Grille de champs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Nom */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <User size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span>Nom</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register('nom', { required: 'Le nom est requis' })}
                  className="w-full pl-11 pr-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 group-hover:border-gray-300 dark:group-hover:border-gray-600"
                  placeholder="Ex: Diallo"
                />
                <User size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
              </div>
              {errors.nom && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.nom.message}
                </p>
              )}
            </div>

            {/* Prénom */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <User size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span>Prénom</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register('prenom', { required: 'Le prénom est requis' })}
                  className="w-full pl-11 pr-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 group-hover:border-gray-300 dark:group-hover:border-gray-600"
                  placeholder="Ex: Mamadou"
                />
                <User size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
              </div>
              {errors.prenom && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.prenom.message}
                </p>
              )}
            </div>

            {/* Matricule */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Briefcase size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span>Matricule</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register('matricule')}
                  className="w-full pl-11 pr-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 group-hover:border-gray-300 dark:group-hover:border-gray-600"
                  placeholder="Ex: CRG-2024-001"
                />
                <Briefcase size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
              </div>
            </div>

            {/* Email */}
            <div className="md:col-span-2 group">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Mail size={16} className="text-green-600 dark:text-green-400" />
                </div>
                <span>Adresse email</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  {...register('email', {
                    required: 'L\'email est requis',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email invalide',
                    },
                    validate: (v) => editingUser || isEmailAllowed(v) || `Seuls les emails @${ALLOWED_EMAIL_DOMAIN} sont autorisés`,
                  })}
                  className="w-full pl-11 pr-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:border-green-400 transition-all duration-200 group-hover:border-gray-300 dark:group-hover:border-gray-600"
                  placeholder={`prenom.nom@${ALLOWED_EMAIL_DOMAIN}`}
                />
                <Mail size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 dark:group-focus-within:text-green-400 transition-colors" />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Rôle */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Shield size={16} className="text-purple-600 dark:text-purple-400" />
                </div>
                <span>Rôle</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  {...register('role', { required: 'Le rôle est requis' })}
                  className="w-full pl-11 pr-10 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-gray-300 dark:group-hover:border-gray-600 appearance-none"
                  disabled={editingUser && editingUser.role === 'admin'}
                >
                  <option value="employe">Employé</option>
                  <option value="chef">Chef de Service</option>
                  {currentUser?.role === 'admin' && (
                    <option value="directrice">Directeur·trice</option>
                  )}
                  <option value="comptable">Comptable</option>
                  <option value="gestion">Service Gestion</option>
                  <option value="lecture">Lecture seule</option>
                  {currentUser?.role === 'admin' && !editingUser && (
                    <option value="admin">Admin</option>
                  )}
                </select>
                <Shield size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 dark:group-focus-within:text-purple-400 transition-colors pointer-events-none" />
                <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {currentUser?.role === 'admin' && selectedRole === 'directrice' && (
                <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Info size={12} />
                  Seul l'admin peut créer ou promouvoir un utilisateur en directeur·trice
                </p>
              )}
              {editingUser && editingUser.role === 'admin' && (
                <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  Le rôle du compte admin ne peut pas être modifié (compte protégé)
                </p>
              )}
              {selectedRole && ROLES_CONFIG[selectedRole] && (
                <div className="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {ROLES_CONFIG[selectedRole].description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {ROLES_CONFIG[selectedRole].responsibilities.slice(0, 2).join(' • ')}
                  </p>
                  {FINANCE_ROLES.includes(selectedRole) && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      → Direction Financière
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Genre (pour directeur/directrice) */}
            {selectedRole === 'directrice' && (
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <User size={16} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <span>Genre (pour le titre directeur/directrice)</span>
                </label>
                <select
                  {...register('gender')}
                  className="w-full pl-11 pr-10 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer appearance-none"
                >
                  <option value="">Détection automatique (prénom)</option>
                  <option value="M">Homme (directeur)</option>
                  <option value="F">Femme (directrice)</option>
                </select>
              </div>
            )}

            {/* Direction (pour directrice uniquement) */}
            {selectedRole === 'directrice' && (
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <MapPin size={16} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <span>Direction</span>
                </label>
                <div className="relative">
                  <select
                    {...register('direction')}
                    className="w-full pl-11 pr-10 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:focus:border-orange-400 transition-all duration-200 cursor-pointer group-hover:border-gray-300 dark:group-hover:border-gray-600 appearance-none"
                  >
                    <option value="">Aucune direction</option>
                    {directionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <MapPin size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 dark:group-focus-within:text-orange-400 transition-colors pointer-events-none" />
                  <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Direction puis Service (pour chef, employé, comptable, gestion) */}
            {(selectedRole === 'chef' || selectedRole === 'employe' || selectedRole === 'comptable' || selectedRole === 'gestion') && (
              <>
                <div className="md:col-span-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                    <MapPin size={14} />
                    Sélectionnez d'abord la direction, puis le service
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Building2 size={16} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <span>Direction</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      {...register('selectedDirection', {
                        required: 'La direction est requise'
                      })}
                      className="w-full pl-11 pr-10 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:focus:border-orange-400 transition-all duration-200 cursor-pointer group-hover:border-gray-300 dark:group-hover:border-gray-600 appearance-none"
                    >
                      <option value="">Sélectionner une direction</option>
                      {directionOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <Building2 size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 dark:group-focus-within:text-orange-400 transition-colors pointer-events-none" />
                    <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.selectedDirection && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errors.selectedDirection.message}
                    </p>
                  )}
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <MapPin size={16} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <span>Service</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      {...register('direction', {
                        required: 'Le service est requis'
                      })}
                      className="w-full pl-11 pr-10 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:focus:border-orange-400 transition-all duration-200 cursor-pointer group-hover:border-gray-300 dark:group-hover:border-gray-600 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!selectedDirection}
                    >
                      <option value="">
                        {selectedDirection ? 'Sélectionner un service' : 'Sélectionnez d\'abord une direction'}
                      </option>
                      {filteredServiceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <MapPin size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 dark:group-focus-within:text-orange-400 transition-colors pointer-events-none" />
                    <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.direction && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errors.direction.message}
                    </p>
                  )}
                </div>
                  </div>
                </div>
              </>
            )}

            {/* Fonction */}
            <div className="md:col-span-2 group">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Briefcase size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span>Fonction</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register('fonction')}
                  className="w-full pl-11 pr-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 group-hover:border-gray-300 dark:group-hover:border-gray-600"
                  placeholder="Ex: Développeur, Analyste, Chef de projet, etc."
                />
                <Briefcase size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
              </div>
            </div>

            {/* Info création : mot de passe temporaire auto-généré */}
            {!editingUser && (
              <div className="md:col-span-2 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
                <p className="text-xs text-cyan-800 dark:text-cyan-200 flex items-start gap-2">
                  <Lock size={14} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Un mot de passe temporaire sera généré automatiquement. Il sera affiché après la création — communiquez-le à l&apos;utilisateur. Celui-ci devra le changer à la première connexion.</span>
                </p>
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowModal(false)
                reset()
              }}
              className="px-6"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting}
              className="px-6 bg-gradient-to-r from-crg-primary to-crg-secondary hover:from-crg-primary/90 hover:to-crg-secondary/90 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {editingUser ? 'Modification...' : 'Création...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {editingUser ? (
                    <>
                      <Edit size={16} />
                      Modifier
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Créer l'utilisateur
                    </>
                  )}
                </span>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal réinitialisation mot de passe (sans email) */}
      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false)
          setResetPasswordUser(null)
          setResetPasswordValue('')
          setResetPasswordError('')
        }}
        title="Réinitialiser le mot de passe"
        size="md"
      >
        {resetPasswordUser && (
          <div className="space-y-4">
            {resetPasswordError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center gap-2">
                <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">{resetPasswordError}</p>
              </div>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Définir un nouveau mot de passe pour <strong>{resetPasswordUser.name}</strong> ({resetPasswordUser.email}). Aucun email ne sera envoyé — communiquez le mot de passe à l'utilisateur par un autre moyen.
            </p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nouveau mot de passe</label>
              <input
                type="text"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="8 car., maj., min., chiffre, spécial"
              />
              {resetPasswordValue && (() => {
                const { valid, message } = validatePassword(resetPasswordValue)
                return !valid && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{message}</p>
              })()}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{PASSWORD_RULES.join(' · ')}</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowResetPasswordModal(false)
                  setResetPasswordUser(null)
                  setResetPasswordValue('')
                  setResetPasswordError('')
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isResettingPassword || !resetPasswordValue || !validatePassword(resetPasswordValue).valid}
                onClick={async () => {
                  setIsResettingPassword(true)
                  setResetPasswordError('')
                  try {
                    await usersService.resetPasswordByAdmin(resetPasswordUser.id, resetPasswordValue)
                    setSuccess('Mot de passe réinitialisé. Communiquez-le à l\'utilisateur.')
                    setShowResetPasswordModal(false)
                    setResetPasswordUser(null)
                    setResetPasswordValue('')
                  } catch (err) {
                    setResetPasswordError(err.message || 'Erreur lors de la réinitialisation')
                  } finally {
                    setIsResettingPassword(false)
                  }
                }}
              >
                {isResettingPassword ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Réinitialisation...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock size={16} />
                    Réinitialiser
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal identifiants temporaires (après création utilisateur) */}
      <Modal
        isOpen={!!credentialsData}
        onClose={() => { setCredentialsData(null); setCopiedField(null) }}
        title="Identifiants de connexion temporaires"
        size="md"
      >
        {credentialsData && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-800/40">
                <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">Utilisateur créé avec succès</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Communiquez ces identifiants à {credentialsData.displayName}. Il devra changer le mot de passe à sa première connexion.
                  {credentialsData.isAuthCreated === false && (
                    <span className="block mt-2 text-amber-700 dark:text-amber-300 font-medium">⚠️ Créez manuellement le compte Auth avec cet email et ce mot de passe.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Email de connexion</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-sm">
                    {credentialsData.email}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsData.email)
                      setCopiedField('email')
                      setTimeout(() => setCopiedField(null), 2000)
                    }}
                    className="p-3 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title="Copier l'email"
                  >
                    {copiedField === 'email' ? <CheckCircle size={18} className="text-emerald-600" /> : <Copy size={18} className="text-gray-600 dark:text-gray-300" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Mot de passe temporaire</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 font-mono text-sm tracking-wider">
                    {credentialsData.tempPassword}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsData.tempPassword)
                      setCopiedField('password')
                      setTimeout(() => setCopiedField(null), 2000)
                    }}
                    className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors"
                    title="Copier le mot de passe"
                  >
                    {copiedField === 'password' ? <CheckCircle size={18} className="text-emerald-600" /> : <Copy size={18} className="text-amber-700 dark:text-amber-300" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                onClick={() => {
                  const text = `Identifiants de connexion - ${credentialsData.displayName}\n\nEmail : ${credentialsData.email}\nMot de passe temporaire : ${credentialsData.tempPassword}\n\nÀ changer à la première connexion.`
                  navigator.clipboard.writeText(text)
                  setCopiedField('all')
                  setTimeout(() => setCopiedField(null), 2000)
                }}
              >
                {copiedField === 'all' ? <CheckCircle size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
                {copiedField === 'all' ? 'Copié !' : 'Copier tout'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setCredentialsData(null); setCopiedField(null) }}
              >
                J'ai terminé
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal détails utilisateur */}
      <Modal
        isOpen={!!detailUser}
        onClose={() => setDetailUser(null)}
        title="Détails de l'utilisateur"
        size="md"
      >
        {detailUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#006020] to-[#008030] flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {detailUser.name?.charAt(0) || '?'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{detailUser.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{detailUser.email}</p>
                <Badge variant={getRoleBadge(detailUser.role)} size="sm" className="mt-2">
                  {getRoleLabel(detailUser)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <User size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom complet</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{detailUser.name || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Mail size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{detailUser.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Shield size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rôle</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{getRoleLabel(detailUser) || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Building2 size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Direction / Service</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{detailUser.direction || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Briefcase size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matricule</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{detailUser.matricule || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Briefcase size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fonction</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{detailUser.fonction || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Info size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Genre</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {detailUser.gender === 'M' ? 'Homme (directeur)' : detailUser.gender === 'F' ? 'Femme (directrice)' : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <CheckCircle size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut du compte</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {detailUser.isActive ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Actif</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Inactif</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Calendar size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dernière connexion</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {detailUser.lastLogin ? new Date(detailUser.lastLogin).toLocaleString('fr-FR') : 'Jamais'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 sm:col-span-2">
                <Calendar size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Compte créé le</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleString('fr-FR') : '—'}
                  </p>
                </div>
              </div>
              {detailUser.updatedAt && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 sm:col-span-2">
                  <Clock size={18} className="text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dernière mise à jour</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(detailUser.updatedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDetailUser(null)}>Fermer</Button>
              {currentUser?.role === 'admin' && detailUser.role !== 'admin' && (
                <Button variant="primary" onClick={() => { setDetailUser(null); handleEdit(detailUser); setShowModal(true); }}>
                  <Edit size={14} className="mr-1.5" />
                  Modifier
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

