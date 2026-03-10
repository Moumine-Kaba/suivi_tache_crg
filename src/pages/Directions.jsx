import { useState, useEffect } from 'react'
import { Building2, Edit, Trash2, Plus, Users, Shield, X, AlertCircle, CheckCircle2, Layers, UserCircle } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useForm } from 'react-hook-form'
import { directionsService, servicesService, usersService } from '../services/api'
import useAuthStore from '../store/authStore'
import { getDirectorLabel } from '../utils/directorLabel'

export default function Directions() {
  const { user: currentUser } = useAuthStore()
  const [directions, setDirections] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDirModal, setShowDirModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingDirection, setEditingDirection] = useState(null)
  const [editingService, setEditingService] = useState(null)
  const [selectedDirectionId, setSelectedDirectionId] = useState(null)

  const { register: regDir, handleSubmit: handleDirSubmit, reset: resetDir, formState: { errors: errDir } } = useForm()
  const { register: regSvc, handleSubmit: handleSvcSubmit, reset: resetSvc, formState: { errors: errSvc } } = useForm()

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadData()
    } else {
      setLoading(false)
    }
  }, [currentUser?.role])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [dirsData, usersData] = await Promise.all([
        directionsService.getAll(),
        usersService.getAll(),
      ])
      setDirections(dirsData)
      setUsers(usersData)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const directrices = users.filter(u => u.role === 'directrice')

  const getUserCountByService = (serviceName) => {
    return users.filter(u => u.direction === serviceName && ['chef', 'employe', 'comptable'].includes(u.role)).length
  }

  // Sélectionner la première direction par défaut au chargement
  useEffect(() => {
    if (directions.length === 0) setSelectedDirectionId(null)
    else setSelectedDirectionId(prev => {
      if (!prev || !directions.find(d => d.id === prev)) return directions[0].id
      return prev
    })
  }, [directions])

  const handleCreateDirection = () => {
    setEditingDirection(null)
    resetDir({ name: '', label: '', directorId: '' })
    setShowDirModal(true)
  }

  const handleEditDirection = (dir) => {
    setEditingDirection(dir)
    resetDir({
      name: dir.name,
      label: dir.label,
      directorId: dir.director_id || '',
    })
    setShowDirModal(true)
  }

  const onSubmitDirection = async (data) => {
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    try {
      if (editingDirection) {
        await directionsService.update(editingDirection.id, {
          name: data.name,
          label: data.label,
          directorId: data.directorId || null,
        })
        setSuccess('Direction mise à jour')
      } else {
        await directionsService.create({
          name: data.name,
          label: data.label,
          directorId: data.directorId || null,
        })
        setSuccess('Direction créée')
      }
      setShowDirModal(false)
      loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDirection = async (dir) => {
    if (!window.confirm(`Supprimer la direction "${dir.label}" ?\n\nLes services associés seront également supprimés.`)) return
    setError(null)
    setIsSubmitting(true)
    try {
      await directionsService.delete(dir.id)
      setSuccess('Direction supprimée')
      loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddService = (dir) => {
    setSelectedDirectionId(dir.id)
    setEditingService(null)
    resetSvc({ name: '', label: '' })
    setShowServiceModal(true)
  }

  const handleEditService = (dir, svc) => {
    setSelectedDirectionId(dir.id)
    setEditingService(svc)
    resetSvc({ name: svc.name, label: svc.label })
    setShowServiceModal(true)
  }

  const onSubmitService = async (data) => {
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    try {
      if (editingService) {
        await servicesService.update(editingService.id, { name: data.name, label: data.label })
        setSuccess('Service mis à jour')
      } else {
        await servicesService.create(selectedDirectionId, { name: data.name, label: data.label })
        setSuccess('Service créé')
      }
      setShowServiceModal(false)
      loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteService = async (svc) => {
    const count = getUserCountByService(svc.name)
    if (count > 0 && !window.confirm(`${count} utilisateur(s) sont dans ce service. Les supprimer de ce service ?`)) return
    setError(null)
    setIsSubmitting(true)
    try {
      await servicesService.delete(svc.id)
      setSuccess('Service supprimé')
      loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="flex items-center gap-4 p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-50/90 to-amber-100/40 dark:from-amber-950/30 dark:to-amber-900/20 shadow-lg shadow-amber-500/5 max-w-md">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/25">
            <Shield size={28} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-100">Accès restreint</p>
            <p className="text-sm text-amber-700/90 dark:text-amber-300/90 mt-1 leading-relaxed">Cette page est réservée aux administrateurs.</p>
          </div>
        </div>
      </div>
    )
  }

  const totalServices = directions.reduce((acc, d) => acc + (d.services?.length || 0), 0)
  const totalMembers = directions.reduce((acc, d) => {
    (d.services || []).forEach(s => {
      acc += getUserCountByService(s.name)
    })
    return acc
  }, 0)

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-[var(--bg-background)]">
      {/* En-tête */}
      <header className="flex-shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-sm">
        <div className="px-2 sm:px-4 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-primary)] via-[#007a28] to-[var(--accent-primary-hover)] text-white shadow-md shadow-[var(--accent-primary)]/20 ring-1 ring-[var(--accent-primary)]/20">
                <Building2 size={20} strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--text-foreground)] tracking-tight">
                  Directions & Services
                </h1>
                {!loading && directions.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center rounded-md bg-[var(--accent-primary)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--accent-primary)]">
                      {directions.length} dir.
                    </span>
                    <span className="inline-flex items-center rounded-md bg-[var(--accent-primary)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--accent-primary)]">
                      {totalServices} serv.
                    </span>
                    <span className="inline-flex items-center rounded-md bg-[var(--accent-primary)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--accent-primary)]">
                      {totalMembers} memb.
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleCreateDirection} variant="primary" size="sm" className="w-fit shadow-md shadow-[var(--accent-primary)]/20 hover:shadow-lg transition-shadow">
              <Plus size={16} className="mr-1.5" />
              Nouvelle direction
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-shrink-0 px-2 sm:px-4 pt-1 space-y-1">
        {error && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20">
                <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
              </div>
              {error}
            </p>
            <button onClick={() => setError(null)} className="p-2 rounded-xl hover:bg-red-500/10 text-red-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{success}</p>
          </div>
        )}
      </div>

      {/* Layout sidebar + contenu */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar - liste des directions */}
        <div className="w-64 flex-shrink-0 border-r border-[var(--border-color)] bg-gradient-to-b from-[var(--bg-card)] via-[var(--bg-surface-1)] to-[var(--bg-muted)]/30 flex flex-col min-h-0 overflow-hidden shadow-[2px_0_12px_-2px_rgba(0,96,32,0.04)]" role="navigation">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 px-2 min-h-0">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl border-2 border-[var(--accent-primary)]/20" />
                <div className="absolute inset-0 h-10 w-10 rounded-xl border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
              </div>
              <p className="mt-3 text-sm font-medium text-[var(--text-foreground)]">Chargement...</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Récupération des données</p>
            </div>
          ) : directions.length === 0 ? (
            <div className="p-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/15 to-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/15">
                <Building2 size={28} className="text-[var(--accent-primary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-foreground)] mb-1">Aucune direction</p>
              <p className="text-xs text-[var(--text-muted)] mb-4">Créez votre première direction</p>
              <Button onClick={handleCreateDirection} variant="primary" size="sm" className="w-full rounded-xl shadow-md shadow-[var(--accent-primary)]/20">
                <Plus size={16} className="mr-2" />
                Créer une direction
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-shrink-0 p-2 border-b border-[var(--border-color)]">
                <Button onClick={handleCreateDirection} variant="outline" size="sm" className="w-full rounded-xl justify-center border-2 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/30 transition-colors">
                  <Plus size={16} className="mr-2" />
                  Nouvelle direction
                </Button>
              </div>
              <nav className="flex-1 min-h-0 overflow-y-auto py-1.5 px-1.5">
                {directions.map((dir) => {
                  const isSelected = selectedDirectionId === dir.id
                  return (
                    <div
                      key={dir.id}
                      onClick={() => setSelectedDirectionId(dir.id)}
                      className={`relative mb-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200 group ${
                        isSelected
                          ? 'bg-gradient-to-r from-[var(--accent-primary)]/12 via-[var(--accent-primary)]/8 to-transparent border border-[var(--accent-primary)]/20 shadow-sm'
                          : 'hover:bg-[var(--bg-muted)]/60 border border-transparent hover:border-[var(--accent-primary)]/10'
                      } ${isSelected ? 'ring-1 ring-[var(--accent-primary)]/15' : ''}`}
                    >
                      {isSelected && (
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-gradient-to-b from-[var(--accent-primary)] to-[var(--accent-primary-hover)]" />
                      )}
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                        isSelected ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'bg-[var(--bg-muted)]/70 text-[var(--text-muted)] group-hover:bg-[var(--accent-primary)]/15 group-hover:text-[var(--accent-primary)]'
                      }`}>
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[var(--text-foreground)]' : 'text-[var(--text-foreground)]'}`}>
                          {dir.label}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                          {dir.services?.length || 0} service{(dir.services?.length || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className={`flex gap-0.5 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditDirection(dir)}
                          className="p-2 rounded-lg hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-foreground)] transition-colors"
                          title="Modifier"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteDirection(dir)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </nav>
            </>
          )}
        </div>

        {/* Contenu principal - services de la direction sélectionnée */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-[var(--bg-background)]">
          {loading || directions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 px-4">
              {!loading && directions.length === 0 && (
                <>
                  <div className="flex h-14 w-14 items-center justify-center mx-auto mb-3 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/15">
                    <Building2 size={28} className="text-[var(--accent-primary)]" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-foreground)] mb-1">Aucune direction</h3>
                  <p className="text-xs text-[var(--text-muted)] text-center max-w-xs leading-relaxed">
                    Créez une direction dans le panneau de gauche pour commencer.
                  </p>
                </>
              )}
            </div>
          ) : (() => {
            const selectedDir = directions.find(d => d.id === selectedDirectionId)
            if (!selectedDir) return null
            return (
              <div className="p-2 sm:p-3 max-w-4xl h-full overflow-y-auto">
                {/* En-tête de la direction */}
                <div className="mb-3 rounded-xl bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-surface-1)] to-[var(--bg-muted)]/20 border border-[var(--border-color)] p-3 shadow-[var(--shadow-block)]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/15">
                        <Building2 size={22} className="text-[var(--accent-primary)]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-[var(--text-foreground)]">{selectedDir.label}</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                          <UserCircle size={14} className="text-[var(--accent-primary)]/80" />
                          {(() => {
                            const label = selectedDir.director ? getDirectorLabel(selectedDir.director) : 'directeur·trice'
                            const cap = label.charAt(0).toUpperCase() + label.slice(1)
                            return `${cap} : ${selectedDir.director ? (selectedDir.director.nom || selectedDir.director.email) : 'Non assigné'}`
                          })()}
                        </p>
                      </div>
                    </div>
                  <Button onClick={() => handleAddService(selectedDir)} variant="primary" size="sm" className="w-fit shadow-md shadow-[var(--accent-primary)]/15">
                    <Plus size={14} className="mr-1.5" />
                    Ajouter un service
                  </Button>
                  </div>
                </div>

                {/* Liste des services */}
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Services</h3>
                  <div className="space-y-1.5">
                    {(selectedDir.services || []).map((svc) => (
                      <div
                        key={svc.id}
                        className="group flex items-center justify-between py-2.5 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/25 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent-primary)]/15 to-[var(--accent-primary)]/5">
                            <Users size={18} className="text-[var(--accent-primary)]" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-[var(--text-foreground)]">{svc.label}</span>
                            <span className="ml-1.5 inline-flex items-center rounded-md bg-[var(--accent-primary)]/8 px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                              {getUserCountByService(svc.name)} utilisateur{getUserCountByService(svc.name) > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditService(selectedDir, svc)}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-foreground)]"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteService(svc)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-600"
                        >
                          <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!selectedDir.services || selectedDir.services.length === 0) && (
                      <div className="py-8 text-center rounded-xl border-2 border-dashed border-[var(--accent-primary)]/20 bg-gradient-to-b from-[var(--bg-card)] to-[var(--accent-primary)]/5">
                        <div className="flex h-12 w-12 items-center justify-center mx-auto mb-2 rounded-xl bg-[var(--accent-primary)]/10">
                          <Layers size={24} className="text-[var(--accent-primary)]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--text-foreground)] mb-1">Aucun service</p>
                        <p className="text-xs text-[var(--text-muted)] mb-2">Ajoutez des services à cette direction</p>
                        <Button onClick={() => handleAddService(selectedDir)} variant="primary" size="sm" className="rounded-xl shadow-md">
                          <Plus size={14} className="mr-1.5" />
                          Ajouter un service
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </main>
      </div>

      {/* Modal Direction */}
      <Modal
        isOpen={showDirModal}
        onClose={() => setShowDirModal(false)}
        title={editingDirection ? 'Modifier la direction' : 'Nouvelle direction'}
      >
        <form onSubmit={handleDirSubmit(onSubmitDirection)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-foreground)] mb-2">Nom (identifiant)</label>
            <input
              {...regDir('name', { required: 'Requis' })}
              className="w-full px-4 py-3 text-sm border border-[var(--border-color)] rounded-xl bg-[var(--bg-input)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)]/50 transition-all disabled:opacity-50"
              placeholder="ex: DSI"
              disabled={!!editingDirection}
            />
            {errDir.name && <p className="text-red-500 text-xs mt-1.5">{errDir.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-foreground)] mb-2">Libellé affiché</label>
            <input
              {...regDir('label', { required: 'Requis' })}
              className="w-full px-4 py-3 text-sm border border-[var(--border-color)] rounded-xl bg-[var(--bg-input)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)]/50 transition-all"
              placeholder="ex: DSI (Direction des Systèmes d'Information)"
            />
            {errDir.label && <p className="text-red-500 text-xs mt-1.5">{errDir.label.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-foreground)] mb-2">Directeur/Directrice</label>
            <select
              {...regDir('directorId')}
              className="w-full px-4 py-3 text-sm border border-[var(--border-color)] rounded-xl bg-[var(--bg-input)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)]/50 transition-all cursor-pointer"
            >
              <option value="">Aucun</option>
              {directrices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom || d.name || d.email} {d.direction === editingDirection?.name ? '(cette direction)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
            <Button type="button" variant="ghost" onClick={() => setShowDirModal(false)} className="rounded-xl">Annuler</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} className="rounded-xl shadow-md shadow-[var(--accent-primary)]/20">
              {editingDirection ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Service */}
      <Modal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        title={editingService ? 'Modifier le service' : 'Nouveau service'}
      >
        <form onSubmit={handleSvcSubmit(onSubmitService)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-foreground)] mb-2">Nom (identifiant)</label>
            <input
              {...regSvc('name', { required: 'Requis' })}
              className="w-full px-4 py-3 text-sm border border-[var(--border-color)] rounded-xl bg-[var(--bg-input)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)]/50 transition-all disabled:opacity-50"
              placeholder="ex: Service Digital"
              disabled={!!editingService}
            />
            {errSvc.name && <p className="text-red-500 text-xs mt-1.5">{errSvc.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-foreground)] mb-2">Libellé affiché</label>
            <input
              {...regSvc('label', { required: 'Requis' })}
              className="w-full px-4 py-3 text-sm border border-[var(--border-color)] rounded-xl bg-[var(--bg-input)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)]/50 transition-all"
              placeholder="ex: Service Digital"
            />
            {errSvc.label && <p className="text-red-500 text-xs mt-1.5">{errSvc.label.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
            <Button type="button" variant="ghost" onClick={() => setShowServiceModal(false)} className="rounded-xl">Annuler</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} className="rounded-xl shadow-md shadow-[var(--accent-primary)]/20">
              {editingService ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
