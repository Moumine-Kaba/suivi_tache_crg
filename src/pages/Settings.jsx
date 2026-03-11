import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { 
  Sun, 
  Moon, 
  MonitorCog, 
  SlidersHorizontal, 
  Bell, 
  Download,
  Shield,
  Key,
  User,
  Globe,
  FileText,
  Database,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Smartphone,
  Clock,
  FileDown,
  FileSpreadsheet
} from 'lucide-react'
import { getTheme, setTheme } from '../utils/theme'
import { validatePassword, PASSWORD_RULES } from '../utils/passwordValidation'
import useAuthStore from '../store/authStore'
import { reportsService, tasksService } from '../services/api'
import { supabase } from '../services/supabaseClient'

export default function Settings() {
  const { user } = useAuthStore()
  const [currentTheme, setCurrentTheme] = useState('system')
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    tasks: true,
    reports: true,
    system: true
  })
  const [language, setLanguage] = useState('fr')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [exportType, setExportType] = useState('reports')
  const [exportFormat, setExportFormat] = useState('csv')
  const [exporting, setExporting] = useState(false)
  const panelClass =
    'rounded-2xl border border-border bg-card shadow-xl shadow-black/5 backdrop-blur px-4 py-4'

  useEffect(() => {
    const th = getTheme()
    setCurrentTheme(th)
    
    const savedNotifications = localStorage.getItem('crg-notifications-prefs')
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications))
      } catch (e) {
        console.error('Erreur lors du chargement des préférences:', e)
      }
    }
    
    const savedLanguage = localStorage.getItem('crg-language')
    if (savedLanguage) {
      setLanguage(savedLanguage)
    }
  }, [])

  const handleThemeChange = (theme) => {
    setCurrentTheme(theme)
    setTheme(theme)
    showMessage('success', 'Thème mis à jour avec succès')
  }

  const handleNotificationChange = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] }
    setNotifications(updated)
    localStorage.setItem('crg-notifications-prefs', JSON.stringify(updated))
    showMessage('success', 'Préférences de notifications mises à jour')
  }

  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    localStorage.setItem('crg-language', lang)
    showMessage('success', 'Langue mise à jour')
  }

  const handlePasswordChange = async () => {
    const { valid, message } = validatePassword(passwordData.newPassword)
    if (!passwordData.newPassword || !valid) {
      showMessage('error', message || 'Mot de passe invalide')
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'Les mots de passe ne correspondent pas')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) {
        showMessage('error', error.message || 'Erreur lors du changement de mot de passe')
        return
      }

      showMessage('success', 'Mot de passe modifié avec succès')
      setShowPasswordModal(false)
      setPasswordData({ newPassword: '', confirmPassword: '' })
    } catch (error) {
      showMessage('error', 'Erreur lors du changement de mot de passe')
    } finally {
      setChangingPassword(false)
    }
  }

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      showMessage('error', 'Aucune donnée à exporter')
      return
    }

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          if (typeof value === 'object' && value !== null) {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`
          }
          return `"${String(value || '').replace(/"/g, '""')}"`
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = (data, filename, type) => {
    if (!data || data.length === 0) {
      showMessage('error', 'Aucune donnée à exporter')
      return
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #006020; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #006020; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .header { margin-bottom: 30px; }
          .date { color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${filename}</h1>
          <div class="date">Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
        </div>
        <table>
    `

    if (type === 'reports') {
      htmlContent += `
        <thead>
          <tr>
            <th>Semaine</th>
            <th>Utilisateur</th>
            <th>Direction</th>
            <th>Statut</th>
            <th>Objectifs</th>
            <th>Réalisations</th>
            <th>Date de création</th>
          </tr>
        </thead>
        <tbody>
      `
      data.forEach(report => {
        htmlContent += `
          <tr>
            <td>${report.week || ''}</td>
            <td>${report.user_name || report.userName || ''}</td>
            <td>${report.direction || ''}</td>
            <td>${report.status || ''}</td>
            <td>${report.sections?.objectifs || report.objectifs || ''}</td>
            <td>${report.sections?.realisations || report.realisations || ''}</td>
            <td>${report.created_at || report.createdAt || ''}</td>
          </tr>
        `
      })
    } else if (type === 'tasks') {
      htmlContent += `
        <thead>
          <tr>
            <th>Titre</th>
            <th>Description</th>
            <th>Statut</th>
            <th>Priorité</th>
            <th>Direction</th>
            <th>Assigné à</th>
            <th>Date d'échéance</th>
            <th>Progression</th>
          </tr>
        </thead>
        <tbody>
      `
      data.forEach(task => {
        htmlContent += `
          <tr>
            <td>${task.title || ''}</td>
            <td>${task.description || ''}</td>
            <td>${task.status || ''}</td>
            <td>${task.priority || ''}</td>
            <td>${task.direction || ''}</td>
            <td>${task.assignedTo || ''}</td>
            <td>${task.dueDate || ''}</td>
            <td>${task.progress || 0}%</td>
          </tr>
        `
      })
    }

    htmlContent += `
        </tbody>
      </table>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      let data = []
      let filename = ''

      if (exportType === 'reports') {
        const reports = await reportsService.getAll({})
        data = reports || []
        filename = 'Rapports'
      } else if (exportType === 'tasks') {
        const tasks = await tasksService.getAll({})
        data = tasks || []
        filename = 'Taches'
      } else if (exportType === 'all') {
        const [reports, tasks] = await Promise.all([
          reportsService.getAll({}),
          tasksService.getAll({})
        ])
        data = [
          ...(reports || []).map(r => ({ ...r, type: 'rapport' })),
          ...(tasks || []).map(t => ({ ...t, type: 'tache' }))
        ]
        filename = 'Toutes_les_donnees'
      } else {
        showMessage('error', 'Type d\'export non supporté')
        setExporting(false)
        return
      }

      if (data.length === 0) {
        showMessage('error', 'Aucune donnée à exporter')
        setExporting(false)
        return
      }

      if (exportFormat === 'csv') {
        exportToCSV(data, filename)
        showMessage('success', `Export CSV de ${data.length} élément(s) réussi`)
      } else if (exportFormat === 'pdf') {
        exportToPDF(data, filename, exportType === 'all' ? 'reports' : exportType)
        showMessage('success', `Export PDF de ${data.length} élément(s) réussi`)
      }

      setShowExportModal(false)
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      showMessage('error', 'Erreur lors de l\'export: ' + (error.message || 'Une erreur est survenue'))
    } finally {
      setExporting(false)
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 4000)
  }

  const clearCache = () => {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('cache') || key.includes('Cache'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    showMessage('success', `Cache vidé avec succès (${keysToRemove.length} élément(s) supprimé(s))`)
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-3">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* En-tête */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-crg-primary/10 dark:bg-crg-primary/20 rounded-lg">
              <SlidersHorizontal size={22} className="text-crg-primary dark:text-crg-secondary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Paramètres
              </h1>
              <p className="text-xs text-muted-foreground">
                Gérez vos préférences et les réglages de l'application
              </p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <Card className={`p-2.5 ${
            message.type === 'success' 
              ? 'bg-success-soft border-success' 
              : 'bg-error-soft border-error'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 size={16} className="text-success" />
              ) : (
                <AlertCircle size={16} className="text-error" />
              )}
              <p className={`text-xs font-medium ${
                message.type === 'success' 
                  ? 'text-success' 
                  : 'text-error'
              }`}>
                {message.text}
              </p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Apparence */}
          <Card className={panelClass}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-crg-primary/10 dark:bg-crg-primary/20 rounded-lg">
                <MonitorCog size={18} className="text-crg-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Apparence
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Choisissez le thème d'affichage de l'interface.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-2.5 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1.5 ${
                  currentTheme === 'light'
                    ? 'border-crg-primary bg-crg-primary/10 dark:bg-crg-primary/20 shadow-md scale-105'
                    : 'border-border hover:border-border'
                }`}
              >
                <Sun size={18} className={currentTheme === 'light' ? 'text-yellow-500' : 'text-muted-foreground'} />
                <span className={`text-xs font-medium ${currentTheme === 'light' ? 'text-crg-primary' : 'text-muted-foreground'}`}>
                  Clair
                </span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-2.5 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1.5 ${
                  currentTheme === 'dark'
                    ? 'border-crg-primary bg-crg-primary/10 dark:bg-crg-primary/20 shadow-md scale-105'
                    : 'border-border hover:border-border'
                }`}
              >
                <Moon size={18} className={currentTheme === 'dark' ? 'text-blue-500' : 'text-muted-foreground'} />
                <span className={`text-xs font-medium ${currentTheme === 'dark' ? 'text-crg-primary' : 'text-muted-foreground'}`}>
                  Sombre
                </span>
              </button>
              <button
                onClick={() => handleThemeChange('midnight')}
                className={`p-2.5 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1.5 ${
                  currentTheme === 'midnight'
                    ? 'border-crg-primary bg-black/40 dark:bg-black/60 shadow-md scale-105'
                    : 'border-border hover:border-border'
                }`}
              >
                <Moon size={18} className={currentTheme === 'midnight' ? 'text-white' : 'text-muted-foreground'} />
                <span className={`text-xs font-medium ${currentTheme === 'midnight' ? 'text-white' : 'text-muted-foreground'}`}>
                  Nuit totale
                </span>
              </button>
              <button
                onClick={() => handleThemeChange('system')}
                className={`p-2.5 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1.5 ${
                  currentTheme === 'system'
                    ? 'border-crg-primary bg-crg-primary/10 dark:bg-crg-primary/20 shadow-md scale-105'
                    : 'border-border hover:border-border'
                }`}
              >
                <MonitorCog size={18} className={currentTheme === 'system' ? 'text-purple-500' : 'text-muted-foreground'} />
                <span className={`text-xs font-medium ${currentTheme === 'system' ? 'text-crg-primary' : 'text-muted-foreground'}`}>
                  Système
                </span>
              </button>
            </div>
          </Card>

          {/* Notifications */}
          <Card className={panelClass}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-crg-primary/10 dark:bg-crg-primary/20 rounded-lg">
                <Bell size={18} className="text-crg-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Notifications
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Gérez vos préférences de notifications.
            </p>
            <div className="space-y-2">
              {[
                { key: 'email', label: 'Notifications par email', icon: Mail },
                { key: 'push', label: 'Notifications push', icon: Smartphone },
                { key: 'tasks', label: 'Notifications de tâches', icon: Clock },
                { key: 'reports', label: 'Notifications de rapports', icon: FileText },
              ].map(({ key, label, icon: Icon }) => (
                <div 
                  key={key}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                  onClick={() => handleNotificationChange(key)}
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-card rounded-lg group-hover:scale-110 transition-transform">
                      <Icon size={14} className="text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-foreground">{label}</span>
                  </div>
                  <button
                    className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                      notifications[key] 
                        ? 'bg-crg-primary shadow-lg shadow-crg-primary/30' 
                        : 'bg-muted'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${
                      notifications[key] ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Sécurité */}
          <Card className={panelClass}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-crg-primary/10 dark:bg-crg-primary/20 rounded-lg">
                <Shield size={18} className="text-crg-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Sécurité
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Gérez la sécurité de votre compte.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setShowPasswordModal(true)}
            >
              <Key size={18} />
              Changer le mot de passe
            </Button>
          </Card>

          {/* Langue */}
          <Card className={panelClass}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-crg-primary/10 dark:bg-crg-primary/20 rounded-lg">
                <Globe size={18} className="text-crg-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Langue
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Sélectionnez votre langue préférée.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleLanguageChange('fr')}
                className={`flex-1 p-2.5 rounded-lg border-2 transition-all duration-200 text-sm ${
                  language === 'fr'
                    ? 'border-crg-primary bg-crg-primary/10 dark:bg-crg-primary/20 shadow-md font-semibold text-crg-primary'
                    : 'border-border hover:border-border text-muted-foreground'
                }`}
              >
                🇫🇷 Français
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`flex-1 p-2.5 rounded-lg border-2 transition-all duration-200 text-sm ${
                  language === 'en'
                    ? 'border-crg-primary bg-crg-primary/10 dark:bg-crg-primary/20 shadow-md font-semibold text-crg-primary'
                    : 'border-border hover:border-border text-muted-foreground'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </Card>

          {/* Export de données */}
          <Card className={panelClass}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-crg-primary/10 dark:bg-crg-primary/20 rounded-lg">
                <Download size={18} className="text-crg-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Export de données
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Exportez vos données au format CSV ou PDF.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setShowExportModal(true)}
            >
              <Download size={18} />
              Exporter des données
            </Button>
          </Card>

          {/* Système */}
          <Card className={panelClass}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-crg-primary/10 dark:bg-crg-primary/20 rounded-lg">
                <Database size={18} className="text-crg-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Système
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Gestion du cache et des données locales.
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-2"
                onClick={clearCache}
              >
                <Trash2 size={18} />
                Vider le cache
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => {
                  window.location.reload()
                }}
              >
                <RefreshCw size={18} />
                Recharger l'application
              </Button>
            </div>
          </Card>
        </div>

        {/* Informations du compte */}
        <Card className={panelClass}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-crg-primary/10 dark:bg-crg-primary/20 rounded-lg">
              <User size={18} className="text-crg-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Informations du compte
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { label: 'Nom', value: user?.name || user?.nom || 'Non renseigné', icon: User },
              { label: 'Email', value: user?.email || 'Non renseigné', icon: Mail },
              { label: 'Rôle', value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Non renseigné', icon: Shield },
              { label: 'Direction', value: user?.direction || 'Non renseigné', icon: FileText },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="p-2.5 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon size={14} className="text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {label}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Modal changement de mot de passe - Design inversé */}
        {showPasswordModal && (
          <Modal
            isOpen={showPasswordModal}
            onClose={() => {
              setShowPasswordModal(false)
              setPasswordData({ newPassword: '', confirmPassword: '' })
            }}
            title="Changer le mot de passe"
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary focus:border-transparent transition-all text-sm"
                  placeholder="8 car., maj., min., chiffre, spécial"
                />
                <p className="mt-1 text-xs text-muted-foreground">{PASSWORD_RULES.join(' · ')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary focus:border-transparent transition-all text-sm"
                  placeholder="Confirmer le mot de passe"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordData({ newPassword: '', confirmPassword: '' })
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handlePasswordChange}
                  disabled={changingPassword}
                  className="shadow-md hover:shadow-lg transition-shadow"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Modification...
                    </>
                  ) : (
                    <>
                      <Key size={16} className="mr-2" />
                      Modifier
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal export - Design inversé */}
        {showExportModal && (
          <Modal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            title="Exporter des données"
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Type de données
                </label>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary focus:border-transparent transition-all text-sm"
                >
                  <option value="reports">Rapports</option>
                  <option value="tasks">Tâches</option>
                  <option value="all">Toutes les données</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Format d'export
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`p-2.5 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1.5 ${
                      exportFormat === 'csv'
                        ? 'border-crg-primary bg-crg-primary/10 dark:bg-crg-primary/20 shadow-md'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <FileSpreadsheet size={18} className={exportFormat === 'csv' ? 'text-success' : 'text-muted-foreground'} />
                    <span className={`text-xs font-medium ${exportFormat === 'csv' ? 'text-crg-primary' : 'text-muted-foreground'}`}>
                      CSV
                    </span>
                  </button>
                  <button
                    onClick={() => setExportFormat('pdf')}
                    className={`p-2.5 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1.5 ${
                      exportFormat === 'pdf'
                        ? 'border-crg-primary bg-crg-primary/10 dark:bg-crg-primary/20 shadow-md'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <FileDown size={18} className={exportFormat === 'pdf' ? 'text-error' : 'text-muted-foreground'} />
                    <span className={`text-xs font-medium ${exportFormat === 'pdf' ? 'text-crg-primary' : 'text-muted-foreground'}`}>
                      PDF
                    </span>
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setShowExportModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleExport}
                  disabled={exporting}
                  className="shadow-md hover:shadow-lg transition-shadow"
                >
                  {exporting ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Export en cours...
                    </>
                  ) : (
                    <>
                      <Download size={16} className="mr-2" />
                      Exporter
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}
