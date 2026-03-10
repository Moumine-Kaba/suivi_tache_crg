import { useState, useEffect, useRef, useMemo } from 'react'
import { Save, Send, Download, Eye, FileText, Calendar, User, Building2, CheckCircle2, Clock, TrendingUp, Printer, Sparkles, RefreshCw, Zap, Target, CheckCircle, AlertTriangle, Lightbulb, Package, Rocket, Star, ArrowRight, Info, Search, Bell, BarChart3, Archive, Users, XCircle, Filter, Trash2, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import useAuthStore from '../store/authStore'
import { reportsService, tasksService, usersService } from '../services/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import logoCRG from '../assets/logo_crg.png'

export default function Reports() {
  const { user } = useAuthStore()
  const [reports, setReports] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [historyFilters, setHistoryFilters] = useState({
    date: '',
    direction: '',
    keyword: '',
  })
  const [filters, setFilters] = useState({
    week: '',
    direction: '',
    status: '', // '' = tous, 'brouillon' = brouillons seulement, 'envoye' = envoyés seulement
  })

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      reportText: '',
      objectifs: '',
      realisations: '',
      difficultes: '',
      solutions: '',
      besoins: '',
      perspectives: '',
      conclusion: '',
    },
  })

  useEffect(() => {
    // Charger les rapports pour la directrice/admin et pour les employés/chefs (leurs propres rapports)
    if (user?.role === 'directrice' || user?.role === 'admin' || user?.role === 'employe' || user?.role === 'chef') {
      loadReports()
    }
  }, [filters, user])

  // Rafraîchissement automatique toutes les 15 secondes pour la directrice/admin
  useEffect(() => {
    if (user?.role === 'directrice' || user?.role === 'admin') {
      const interval = setInterval(() => {
        loadReports()
      }, 15000) // Rafraîchir toutes les 15 secondes pour voir rapidement les nouveaux rapports

      return () => clearInterval(interval)
    }
  }, [user?.role, filters])

  // Écouter l'événement de rechargement depuis les notifications
  useEffect(() => {
    const handleReloadReports = () => {
      if (user?.role === 'directrice' || user?.role === 'admin') {
        loadReports()
      }
    }

    window.addEventListener('reloadReports', handleReloadReports)
    return () => {
      window.removeEventListener('reloadReports', handleReloadReports)
    }
  }, [user?.role])

  const loadReports = async () => {
    setLoading(true)
    try {
      const data = await reportsService.getAll(filters)
      setReports(data)
    } catch (error) {
      if (error?.message === 'Utilisateur non authentifié') {
        // Au démarrage ou après déconnexion, ignorer simplement
      } else {
        console.error('Erreur lors du chargement des rapports:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const getReportTextFromSections = (reportLike) => {
    const sections = reportLike?.sections || reportLike || {}
    const fields = [
      ['objectifs', 'Objectifs'],
      ['realisations', 'Realisations'],
      ['difficultes', 'Difficultes'],
      ['solutions', 'Activites en cours'],
      ['besoins', 'Recommandations'],
      ['perspectives', 'Perspectives'],
      ['conclusion', 'Conclusion'],
    ]
    const blocks = fields
      .map(([key, label]) => {
        const value = String(sections?.[key] ?? reportLike?.[key] ?? '').trim()
        return value ? `${label}:\n${value}` : ''
      })
      .filter(Boolean)

    return blocks.join('\n\n')
  }

  const buildSectionsFromFormData = (data) => {
    const manualText = String(data?.reportText || '').trim()
    if (manualText) {
      return {
        objectifs: manualText,
        realisations: '',
        difficultes: '',
        solutions: '',
        besoins: '',
        perspectives: '',
        conclusion: '',
      }
    }

    return {
      objectifs: data.objectifs || '',
      realisations: data.realisations || '',
      difficultes: data.difficultes || '',
      solutions: data.solutions || '',
      besoins: data.besoins || '',
      perspectives: data.perspectives || '',
      conclusion: data.conclusion ?? '',
    }
  }

  const handleSubmitReport = async (data) => {
    setSubmitting(true)
    try {
      // Si c'est un employé, vérifier que toutes les tâches sont validées par le chef
      if (user?.role === 'employe') {
        console.log('🔍 Vérification des tâches avant envoi du rapport...')
        console.log('👤 Employé ID:', user.id)
        
        // Récupérer toutes les tâches de l'employé (tasksService.getAll filtre déjà par assigned_to pour les employés)
        const allTasks = await tasksService.getAll({})
        console.log('📋 Tâches récupérées:', allTasks.length)
        console.log('📋 Détails des tâches:', allTasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assignedToId: t.assignedToId,
          assigned_to: t.assigned_to
        })))
        
        // Filtrer les tâches assignées à cet employé (double vérification)
        // Note: tasksService.getAll filtre déjà par assigned_to pour les employés, mais on vérifie quand même
        const employeeTasks = allTasks.filter(task => {
          // assignedToId est mappé depuis task.assigned_to dans tasksService.getAll
          const isAssigned = (task.assignedToId === user.id)
          console.log(`  Tâche "${task.title}": assignedToId=${task.assignedToId}, user.id=${user.id}, isAssigned=${isAssigned}, status=${task.status}`)
          return isAssigned
        })
        
        console.log('✅ Tâches de l\'employé:', employeeTasks.length)
        
        // Vérifier s'il y a des tâches en attente de validation
        const pendingValidation = employeeTasks.filter(task => 
          task.status === 'en_attente_validation'
        )
        
        console.log('⏳ Tâches en attente de validation:', pendingValidation.length)
        
        if (pendingValidation.length > 0) {
          const taskTitles = pendingValidation.slice(0, 3).map(t => `- ${t.title}`).join('\n')
          const moreTasks = pendingValidation.length > 3 ? `\n... et ${pendingValidation.length - 3} autre(s) tâche(s)` : ''
          setErrorMessage(`❌ Impossible d'envoyer le rapport au directeur/directrice.\n\nVous avez ${pendingValidation.length} tâche(s) en attente de validation par le chef de service :\n\n${taskTitles}${moreTasks}\n\nVeuillez attendre que le chef de service valide toutes vos tâches avant d'envoyer le rapport.`)
          setShowErrorModal(true)
          setSubmitting(false)
          return
        }
        
        // Vérifier que les tâches terminées sont bien validées (statut 'termine' avec metadata validated)
        const completedTasks = employeeTasks.filter(task => task.status === 'termine')
        console.log('✅ Tâches terminées:', completedTasks.length)
        
        const unvalidatedTasks = completedTasks.filter(task => {
          // Vérifier dans les métadonnées si la tâche a été validée
          let metadata = {}
          try {
            metadata = task.metadata ? (typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata) : {}
          } catch (e) {
            metadata = {}
          }
          
          const isValidated = metadata.validated === true
          console.log(`  Tâche "${task.title}": validated=${isValidated}, metadata=`, metadata)
          
          // Si la tâche est terminée mais n'a pas été validée, elle doit être en attente
          return !isValidated
        })
        
        console.log('❌ Tâches terminées non validées:', unvalidatedTasks.length)
        
        if (unvalidatedTasks.length > 0) {
          const taskTitles = unvalidatedTasks.slice(0, 3).map(t => `- ${t.title}`).join('\n')
          const moreTasks = unvalidatedTasks.length > 3 ? `\n... et ${unvalidatedTasks.length - 3} autre(s) tâche(s)` : ''
          setErrorMessage(`❌ Impossible d'envoyer le rapport au directeur/directrice.\n\nVous avez ${unvalidatedTasks.length} tâche(s) terminée(s) qui n'ont pas encore été validées par le chef de service :\n\n${taskTitles}${moreTasks}\n\nVeuillez attendre que le chef de service valide toutes vos tâches avant d'envoyer le rapport.`)
          setShowErrorModal(true)
          setSubmitting(false)
          return
        }
        
        console.log('✅ Toutes les tâches sont validées, envoi du rapport autorisé')
      }
      
      const week = getCurrentWeek()
      
      // Vérifier si un rapport existe déjà pour cette semaine
      const existingReport = await reportsService.getByWeek(week)
      
      // Préparer les données en formatant les sections
      const reportData = {
        sections: buildSectionsFromFormData(data),
          userId: user.id,
          userName: user.name,
          direction: user.direction,
          week,
          status: 'envoye',
      }
      
      console.log('📤 Envoi rapport - Conclusion:', reportData.sections.conclusion)
      
      let report
      if (existingReport) {
        // Mettre à jour le rapport existant
        report = await reportsService.update(existingReport.id, reportData)
      } else {
        // Créer un nouveau rapport
        report = await reportsService.create(reportData)
      }
      
      // Envoyer automatiquement à la directrice
      try {
        await reportsService.sendToDirectrice(report.id)
        console.log('✅ Rapport envoyé à la directrice')
      } catch (notifError) {
        console.warn('⚠️ Erreur lors de l\'envoi de la notification:', notifError)
        // Ne pas bloquer si la notification échoue
      }
      
      // Recharger la liste des rapports pour mettre à jour l'interface
      if (user?.role === 'directrice' || user?.role === 'admin') {
        await loadReports()
      }
      
      setSuccessMessage('Rapport envoyé avec succès au directeur/directrice')
      setShowSuccessModal(true)
      reset()
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error)
      setErrorMessage('Erreur lors de l\'envoi: ' + (error.message || 'Une erreur est survenue'))
      setShowErrorModal(true)
    } finally {
      setSubmitting(false)
    }
  }

  const getCurrentWeek = () => {
    const today = new Date()
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()))
    return firstDay.toISOString().split('T')[0]
  }

  const handlePreviewReport = () => {
    const currentValues = watch()
    const manualText = String(currentValues.reportText || '').trim()
    const hasLegacySections = Object.entries(currentValues)
      .filter(([k]) => k !== 'reportText')
      .some(([, v]) => v && String(v).trim().length > 0)
    const hasContent = manualText.length > 0 || hasLegacySections
    
    if (!hasContent) {
      setErrorMessage('⚠️ Veuillez d\'abord remplir au moins une section du rapport avant de le prévisualiser.')
      setShowErrorModal(true)
      return
    }
    
    setShowPreview(true)
  }

  const getPreviewReportData = () => {
    const currentValues = watch()
    const week = getCurrentWeek()
    
    return {
      id: 'preview',
      userId: user.id,
      userName: user.name || user.nom || 'Utilisateur',
      direction: user.direction || 'Non renseigné',
      week: week,
      status: 'brouillon',
      sections: buildSectionsFromFormData(currentValues),
      createdAt: new Date().toISOString(),
    }
  }

  const handleViewReport = async (id) => {
    try {
      const report = await reportsService.getById(id)
      setSelectedReport(report)
      setShowModal(true)
    } catch (error) {
      console.error('Erreur lors du chargement du rapport:', error)
    }
  }

  const handleExport = () => {
    // Simulation d'export
    setErrorMessage('Fonctionnalité d\'export à implémenter')
    setShowErrorModal(true)
  }

  const printReport = async (report) => {
    if (!report) {
      console.error('Aucun rapport à imprimer')
      return
    }
    
    try {
      // Convertir le logo en base64 pour l'inclure dans le document
      let logoBase64 = logoCRG
      try {
        logoBase64 = await convertImageToBase64(logoCRG)
      } catch (e) {
        console.warn('Impossible de convertir le logo en base64, utilisation de l\'URL originale')
      }
      
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        setErrorMessage('Veuillez autoriser les fenêtres popup pour imprimer')
        setShowErrorModal(true)
        return
      }
      
      const printContent = generatePrintContent(report, logoBase64)
      
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      
      // Attendre que le contenu soit chargé avant d'imprimer
      setTimeout(() => {
        printWindow.print()
        // Ne pas fermer immédiatement pour permettre à l'utilisateur de voir l'aperçu
      }, 500)
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error)
      setErrorMessage('Erreur lors de l\'impression. Veuillez réessayer.')
      setShowErrorModal(true)
    }
  }

  const convertImageToBase64 = (imagePath) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        try {
          const base64 = canvas.toDataURL('image/png')
          resolve(base64)
        } catch (e) {
          // Si la conversion échoue, utiliser l'URL originale
          resolve(imagePath)
        }
      }
      img.onerror = () => {
        // En cas d'erreur, utiliser l'URL originale
        resolve(imagePath)
      }
      img.src = imagePath
    })
  }

  const formatSectionContent = (content) => {
    if (!content || content.trim().length === 0) {
      return '<p class="empty">Non renseigné</p>'
    }
    
    // Échapper les caractères HTML
    let escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
    
    // Convertir les sauts de ligne en paragraphes
    const lines = escaped.split('\n').filter(line => line.trim().length > 0)
    
    if (lines.length === 0) {
      return '<p class="empty">Non renseigné</p>'
    }
    
    // Si le contenu contient des puces ou tirets, formater en liste
    if (lines.some(line => line.trim().match(/^[-•*]\s/))) {
      return lines.map(line => {
        const trimmed = line.trim()
        if (trimmed.match(/^[-•*]\s/)) {
          // C'est une puce, la formater
          const text = trimmed.replace(/^[-•*]\s+/, '')
          return `<p style="margin-left: 15px; margin-bottom: 3px;">• ${text}</p>`
        } else {
          return `<p style="margin-bottom: 4px;">${trimmed}</p>`
        }
      }).join('')
    }
    
    // Sinon, formater en paragraphes normaux
    return lines.map(line => {
      const trimmed = line.trim()
      return `<p style="margin-bottom: 4px;">${trimmed}</p>`
    }).join('')
  }

  // Fonction pour formater le contenu dans le template d'impression
  const formatSectionContentForPrint = (content) => {
    if (!content || content.trim().length === 0) {
      return '<p class="empty">Non renseigné</p>'
    }
    
    // Échapper les caractères HTML
    let escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
    
    // Convertir les sauts de ligne en paragraphes
    const lines = escaped.split('\n').filter(line => line.trim().length > 0)
    
    if (lines.length === 0) {
      return '<p class="empty">Non renseigné</p>'
    }
    
    // Si le contenu contient des puces ou tirets, formater en liste
    if (lines.some(line => line.trim().match(/^[-•*]\s/))) {
      return lines.map(line => {
        const trimmed = line.trim()
        if (trimmed.match(/^[-•*]\s/)) {
          // C'est une puce, la formater
          const text = trimmed.replace(/^[-•*]\s+/, '')
          return `<p style="margin-left: 15px; margin-bottom: 3px;">• ${text}</p>`
        } else {
          return `<p style="margin-bottom: 4px;">${trimmed}</p>`
        }
      }).join('')
    }
    
    // Sinon, formater en paragraphes normaux
    return lines.map(line => {
      const trimmed = line.trim()
      return `<p style="margin-bottom: 4px;">${trimmed}</p>`
    }).join('')
  }

  const generatePrintContent = (report, logoBase64 = '') => {
    // Calculer les dates de début et fin de semaine
    const weekStart = new Date(report.week)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    const weekStartStr = weekStart.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    
    const weekEndStr = weekEnd.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    
    // Formater le contenu de chaque section de manière simple (sans titres)
    const formatSimpleContent = (content, keyword) => {
      if (!content || content.trim().length === 0) {
        return ''
      }
      
      // Échapper les caractères HTML
      let escaped = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
      
      // Convertir les sauts de ligne en paragraphes
      // Ne pas filtrer les lignes vides pour préserver la structure
      const lines = escaped.split('\n')
      
      // Filtrer les lignes vides mais garder au moins une ligne si le contenu existe
      const nonEmptyLines = lines.filter(line => line.trim().length > 0)
      
      if (nonEmptyLines.length === 0) {
        return ''
      }
      
      // Commencer par le mot-clé en gras, suivi du contenu
      const firstLine = nonEmptyLines[0].trim()
      const remainingLines = nonEmptyLines.slice(1)
      
      // Vérifier si la première ligne commence par '-'
      const isFirstLineBullet = firstLine.startsWith('-')
      const firstLineContent = isFirstLineBullet ? firstLine.substring(1).trim() : firstLine
      const firstLineStyle = isFirstLineBullet 
        ? 'margin-bottom: 8px; text-align: justify; line-height: 1.5; padding-left: 30px; overflow: visible; white-space: normal; word-wrap: break-word; overflow-wrap: break-word;'
        : 'margin-bottom: 8px; text-align: justify; line-height: 1.5; overflow: visible; white-space: normal; word-wrap: break-word; overflow-wrap: break-word;'
      
      let result = `<p style="${firstLineStyle}"><strong>${keyword}:</strong> ${firstLineContent}</p>`
      
      // Ajouter les lignes restantes avec tabulation pour les puces
      remainingLines.forEach(line => {
        const trimmed = line.trim()
        // Ne pas filtrer les lignes vides si elles font partie du contenu
        if (trimmed.length === 0) {
          result += `<p style="margin-bottom: 4px; line-height: 1.5;">&nbsp;</p>`
          return
        }
        
        const isBullet = trimmed.startsWith('-')
        const lineContent = isBullet ? trimmed.substring(1).trim() : trimmed
        const lineStyle = isBullet
          ? 'margin-bottom: 8px; text-align: justify; line-height: 1.5; padding-left: 30px; overflow: visible; white-space: normal; word-wrap: break-word; overflow-wrap: break-word;'
          : 'margin-bottom: 8px; text-align: justify; line-height: 1.5; overflow: visible; white-space: normal; word-wrap: break-word; overflow-wrap: break-word;'
        
        result += `<p style="${lineStyle}">${lineContent}</p>`
      })
      
      return result
    }
    
    // Récupérer le contenu depuis sections ou directement depuis report
    const getSectionContent = (sectionName) => {
      // Essayer plusieurs chemins pour récupérer le contenu
      let content = ''
      
      // 1. Essayer report.sections[sectionName]
      if (report.sections && report.sections[sectionName] !== undefined && report.sections[sectionName] !== null) {
        content = report.sections[sectionName]
      }
      // 2. Essayer report[sectionName] directement
      else if (report[sectionName] !== undefined && report[sectionName] !== null) {
        content = report[sectionName]
      }
      // 3. Pour la conclusion, essayer aussi report.conclusion directement
      else if (sectionName === 'conclusion' && report.conclusion !== undefined && report.conclusion !== null) {
        content = report.conclusion
      }
      
      return content || ''
    }
    
    const formattedObjectifs = formatSimpleContent(getSectionContent('objectifs'), 'Objectifs')
    const formattedRealisations = formatSimpleContent(getSectionContent('realisations'), 'Réalisations')
    const formattedSolutions = formatSimpleContent(getSectionContent('solutions'), 'Activités en cours')
    const formattedDifficultes = formatSimpleContent(getSectionContent('difficultes'), 'Difficultés')
    const formattedBesoins = formatSimpleContent(getSectionContent('besoins'), 'Recommandations')
    const formattedPerspectives = formatSimpleContent(getSectionContent('perspectives'), 'Perspectives')
    
    // Récupérer la conclusion avec vérification détaillée
    const conclusionContent = getSectionContent('conclusion')
    const formattedConclusion = formatSimpleContent(conclusionContent, 'Conclusion')
    
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'activités hebdomadaires - ${report.userName || 'N/A'}</title>
  <style>
    @page {
      margin: 0.8cm 1.5cm 2.5cm 1.5cm;
      size: A4;
    }
    
    body {
      margin-top: 0;
      padding-top: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #1a1a1a;
      line-height: 1.5;
      background: white;
      font-size: 11pt;
      margin: 0;
      padding: 0;
      text-align: justify;
    }
    
    /* Justifier tous les paragraphes par défaut */
    p {
      text-align: justify;
      line-height: 1.5;
      overflow: visible;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;
      text-overflow: clip;
    }
    
    .print-container {
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
      min-height: 100vh;
      display: block;
    }
    
    /* Header avec logo */
    .header-section {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 0;
      margin-bottom: 15px;
      margin-left: 0;
      margin-right: 0;
      padding-top: 0;
      padding-bottom: 12px;
      padding-left: 0;
      padding-right: 0;
      border-bottom: 2px solid #e8e8e8;
      page-break-after: avoid;
      width: 100%;
    }
    
    .logo-container {
      flex-shrink: 0;
      display: flex;
      align-items: flex-start;
      height: 100%;
    }
    
    .logo-img {
      height: 145px;
      width: auto;
      display: block;
      object-fit: contain;
    }
    
    .header-info {
      flex: 1;
      padding-left: 8px;
      padding-top: 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
    
    .company-title {
      font-size: 14pt;
      font-weight: bold;
      color: #006020;
      margin-bottom: 8px;
      margin-top: 0;
      text-transform: uppercase;
      border-bottom: 2px solid #006020;
      padding-bottom: 4px;
      display: inline-block;
      line-height: 1.3;
    }
    
    .company-info {
      font-size: 8.5pt;
      color: #1a1a1a;
      line-height: 1.6;
      margin: 0;
    }
    
    .company-info-line {
      margin: 3px 0;
    }
    
    /* Informations de la personne */
    .person-info {
      text-align: center;
      margin: 8px 0 10px 0;
      padding: 8px 12px;
      background: linear-gradient(to right, #f0f7f4 0%, #f8f9fa 50%, #f0f7f4 100%);
      border-left: 4px solid #006020;
      border-right: 4px solid #006020;
      border-radius: 4px;
    }
    
    .person-info-item {
      display: inline-block;
      margin: 0 18px;
      font-size: 9.5pt;
      color: #333;
      padding: 2px 0;
    }
    
    .person-info-label {
      font-weight: bold;
      color: #006020;
      margin-right: 8px;
      text-transform: uppercase;
      font-size: 9pt;
      letter-spacing: 0.3px;
    }
    
    .person-info-value {
      color: #1a1a1a;
      font-weight: 500;
    }
    
    /* Titre principal */
    .main-title {
      text-align: center;
      margin: 10px 0 8px 0;
      position: relative;
    }
    
    .main-title h1 {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #006020;
      margin: 0;
      padding-bottom: 6px;
      display: inline-block;
      border-bottom: 2px solid #006020;
      margin-bottom: 0;
    }
    
    /* Date de la semaine */
    .week-date {
      text-align: center;
      margin: 8px 0 12px 0;
      font-size: 10pt;
      color: #333;
      padding: 4px 0;
    }
    
    .week-date strong {
      font-weight: bold;
      color: #006020;
      font-size: 11pt;
      letter-spacing: 0.8px;
    }
    
    /* Sections */
    .sections-container {
      margin: 15px 0;
      width: 100%;
      overflow: visible;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .section {
      margin-bottom: 18px;
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
    }
    
    .section-title {
      font-weight: bold;
      margin: 0;
      font-size: 11.5pt;
      color: #ffffff;
      background: linear-gradient(135deg, #006020 0%, #408060 100%);
      padding: 10px 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #004020;
      page-break-after: avoid;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-title::before {
      content: '';
      width: 4px;
      height: 20px;
      background: #ffffff;
      border-radius: 2px;
      flex-shrink: 0;
    }
    
    .section-content {
      margin: 0;
      padding: 15px 18px;
      line-height: 1.5;
      text-align: justify;
      background: #ffffff;
      page-break-inside: avoid;
      word-wrap: break-word;
      overflow-wrap: break-word;
      overflow: visible;
      white-space: normal;
      min-height: 40px;
    }
    
    .section-content p {
      margin: 0 0 8px 0;
      padding: 0;
      color: #1a1a1a;
      font-size: 10.5pt;
      text-indent: 0;
      line-height: 1.5;
      text-align: justify;
      overflow: visible;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .section-content p:last-child {
      margin-bottom: 0;
    }
    
    .section-content .empty {
      color: #999;
      font-style: italic;
      text-align: center;
      padding: 10px 0;
    }
    
    .section-content ul,
    .section-content ol {
      margin: 8px 0;
      padding-left: 25px;
    }
    
    .section-content li {
      margin: 4px 0;
      line-height: 1.5;
      font-size: 10.5pt;
      text-align: justify;
    }
    
    /* Gestion des sauts de page */
    .section:not(:first-child) {
      page-break-before: auto;
    }
    
    .section-title + .section-content {
      page-break-before: avoid;
    }
    
    /* Signature */
    .signature-block {
      margin-top: 30px;
      padding-top: 25px;
      text-align: right;
      padding-right: 0;
      page-break-inside: avoid;
      break-inside: avoid;
      width: 100%;
    }
    
    .signature-line {
      margin-bottom: 12px;
      font-size: 11pt;
      color: #006020;
      line-height: 1.5;
      text-align: right;
      padding-right: 0;
    }
    
    .signature-line strong {
      font-weight: bold;
      color: #006020;
      font-size: 11pt;
    }
    
    /* Amélioration de l'espacement */
    .section:last-of-type {
      margin-bottom: 10px;
    }
    
    /* Gestion du contenu long */
    .section-content {
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    /* Amélioration de la lisibilité */
    .person-info {
      page-break-inside: avoid;
    }
    
    .main-title {
      page-break-after: avoid;
    }
    
    .week-date {
      page-break-after: avoid;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .section-content {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .signature-block {
        page-break-inside: avoid;
        break-inside: avoid;
        page-break-before: auto;
      }
      
      .person-info {
        background: #f8f9fa !important;
        page-break-inside: avoid;
      }
      
      .section-content {
        background: #fafafa !important;
      }
      
      /* Éviter les orphelins et veuves */
      p {
        orphans: 3;
        widows: 3;
      }
      
      /* S'assurer que les sections ne sont pas coupées */
      .section-title {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <!-- Header avec logo -->
    <div class="header-section">
      <div class="logo-container">
        <img src="${logoBase64 || logoCRG}" alt="CRG Logo" class="logo-img" onerror="this.style.display='none'" />
      </div>
      
      <div class="header-info">
        <div class="company-title">CREDIT RURAL DE GUINEE S.A</div>
        <div class="company-info">
          <div class="company-info-line">Société Anonyme avec Conseil d'Administration au Capital de 8 000 000 000 GNF</div>
          <div class="company-info-line">Institution de Micro Finance régit par la Loi L/2005/020/AN</div>
          <div class="company-info-line">AGREMENT N° 001/LSFD/BCRG/CAM du 16/04/2002</div>
          <div class="company-info-line">IMF de la 2è catégorie immatriculée RCCM/GC-KAL-M2/041.711/2012 du 16 Février 2012</div>
        </div>
      </div>
    </div>
    
    <!-- Informations de la personne -->
    <div class="person-info">
      <span class="person-info-item">
        <span class="person-info-label">Nom:</span>
        <span class="person-info-value">${report.userName || 'Non renseigné'}</span>
      </span>
      <span class="person-info-item">
        <span class="person-info-label">Service:</span>
        <span class="person-info-value">${report.direction || 'Non renseigné'}</span>
      </span>
      <span class="person-info-item">
        <span class="person-info-label">Date d'édition:</span>
        <span class="person-info-value">${currentDate}</span>
      </span>
    </div>
    
    <!-- Titre -->
    <div class="main-title">
      <h1>Rapport d'activités hebdomadaires</h1>
    </div>
    
    <!-- Semaine -->
    <div class="week-date">
      <strong>Semaine du ${weekStartStr} au ${weekEndStr}</strong>
    </div>
    
    <!-- Contenu du rapport - Format simple Word -->
    <div class="sections-container" style="margin-top: 20px; padding: 0; text-align: justify;">
      ${report.sections || report.objectifs || report.realisations ? `
        ${formattedObjectifs ? formattedObjectifs + '<div style="margin-bottom: 15px;"></div>' : ''}
        ${formattedRealisations ? formattedRealisations + '<div style="margin-bottom: 15px;"></div>' : ''}
        ${formattedSolutions ? formattedSolutions + '<div style="margin-bottom: 15px;"></div>' : ''}
        ${formattedDifficultes ? formattedDifficultes + '<div style="margin-bottom: 15px;"></div>' : ''}
        ${formattedBesoins ? formattedBesoins + '<div style="margin-bottom: 15px;"></div>' : ''}
        ${formattedPerspectives ? formattedPerspectives + '<div style="margin-bottom: 15px;"></div>' : ''}
        ${formattedConclusion ? formattedConclusion + '<div style="margin-bottom: 15px;"></div>' : ''}
      ` : '<p style="text-align: justify;">Aucune section disponible</p>'}
    </div>
    
    <!-- Signature -->
    <div class="signature-block">
      <div class="signature-line">
        Conakry le <strong>${currentDate}</strong>
      </div>
      <div class="signature-line">
        <strong>${report.userName || 'Non renseigné'}</strong>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }

  // Si l'utilisateur est un employé, afficher le formulaire
  if (user?.role === 'employe' || user?.role === 'chef') {
    const watchedValues = watch()
    
    const myReports = reports.filter(r => r.userId === user.id)
    const mySentReports = myReports.filter(r => r.status === 'envoye')
    
    // Filtrer les rapports pour l'historique
    const filteredHistoryReports = useMemo(() => {
      let filtered = myReports.filter(r => r.status === 'envoye')
      
      if (historyFilters.date) {
        filtered = filtered.filter(r => {
          const reportDate = new Date(r.week)
          const filterDate = new Date(historyFilters.date)
          return reportDate.toDateString() === filterDate.toDateString()
        })
      }
      
      if (historyFilters.direction) {
        filtered = filtered.filter(r => r.direction === historyFilters.direction)
      }
      
      if (historyFilters.keyword) {
        const keyword = historyFilters.keyword.toLowerCase()
        filtered = filtered.filter(r => 
          r.userName?.toLowerCase().includes(keyword) ||
          r.direction?.toLowerCase().includes(keyword) ||
          r.sections?.objectifs?.toLowerCase().includes(keyword)
        )
      }
      
      return filtered.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at))
    }, [myReports, historyFilters])

    return (
      <div className="h-[calc(100dvh-86px)] bg-background text-foreground p-3 overflow-hidden">
        <div className="h-full grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-3 rounded-2xl max-w-[1500px] mx-auto items-start overflow-hidden">
          {/* Panneau de pilotage */}
          <div className="w-full bg-card border border-border flex flex-col rounded-2xl shadow-sm h-full overflow-hidden">
            {/* Header Sidebar */}
            <div className="p-4 border-b border-border bg-muted/35 rounded-t-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-foreground inline-flex items-center gap-2">
                  <FileText className="text-crg-primary" size={22} />
                  Espace Rapports
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">{myReports.length} rapport(s)</span>
                  <span className="px-2 py-1 rounded-full bg-success-soft text-success">{mySentReports.length} envoyé(s)</span>
                </div>
              </div>
            </div>

            {/* Historique uniquement */}
            <div className="p-4 bg-background/40 rounded-b-2xl flex-1 min-h-0 overflow-auto">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-crg-primary/10 text-crg-primary text-sm font-medium">
                  <Archive size={15} />
                  Historique des rapports envoyes
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary"
                    />
                  </div>
                  <input
                    type="date"
                    value={historyFilters.date}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary"
                  />
                  <select
                    value={historyFilters.direction}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, direction: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary"
                  >
                    <option value="">Tous les services</option>
                    <option value={user.direction}>{user.direction}</option>
                  </select>
                  {(historyFilters.date || historyFilters.direction || historySearch) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setHistoryFilters({ date: '', direction: '', keyword: '' })
                        setHistorySearch('')
                      }}
                      className="w-full"
                    >
                      <XCircle size={14} className="mr-1" />
                      Reinitialiser
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {filteredHistoryReports.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Aucun rapport envoye trouve
                    </p>
                  ) : (
                    filteredHistoryReports.map((report) => (
                      <Card
                        key={report.id}
                        className="p-3 hover:bg-crg-primary/5 dark:hover:bg-crg-primary/10 transition-colors cursor-pointer border-l-4 border-l-blue-400"
                        onClick={async () => {
                          try {
                            const reportData = await reportsService.getById(report.id)
                            if (reportData) {
                              reset({
                                reportText: getReportTextFromSections(reportData),
                                objectifs: reportData.sections?.objectifs || reportData.objectifs || '',
                                realisations: reportData.sections?.realisations || reportData.realisations || '',
                                difficultes: reportData.sections?.difficultes || reportData.difficultes || '',
                                solutions: reportData.sections?.solutions || reportData.solutions || '',
                                besoins: reportData.sections?.besoins || reportData.besoins || '',
                                perspectives: reportData.sections?.perspectives || reportData.perspectives || '',
                                conclusion: (reportData.sections?.conclusion !== null && reportData.sections?.conclusion !== undefined)
                                  ? reportData.sections.conclusion
                                  : (reportData.conclusion !== null && reportData.conclusion !== undefined
                                      ? reportData.conclusion
                                      : ''),
                              })
                            }
                          } catch (error) {
                            console.error('Erreur:', error)
                            setErrorMessage('Erreur lors du chargement du rapport')
                            setShowErrorModal(true)
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground">
                            {new Date(report.week).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <Badge variant="success" size="sm">Envoye</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {report.direction}
                        </p>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire principal */}
          <div className="w-full p-0 rounded-2xl bg-background h-full overflow-hidden">
            <div className="max-w-4xl mx-auto w-full h-full flex flex-col overflow-hidden">
        {/* Formulaire avec design moderne */}
        <form id="report-form" className="flex-1 min-h-0 flex flex-col gap-3">
          <div className="bg-card rounded-xl shadow-sm p-4 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-crg-primary/10">
                <FileText size={20} className="text-crg-primary" />
              </div>
              <label className="text-lg font-bold text-foreground">
                Rapport hebdomadaire
              </label>
            </div>
            <p className="text-xs text-muted-foreground mb-3 ml-11">
              Redigez votre rapport librement dans un seul champ (format texte).
            </p>
            <textarea
              {...register('reportText')}
              className="w-full flex-1 min-h-0 px-4 py-3 rounded-xl bg-input text-foreground focus:outline-none resize-none text-sm leading-6 overflow-auto"
              placeholder="Ecrivez ici votre rapport de la semaine..."
            />
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-3 shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviewReport}
                className="flex items-center justify-center gap-2 px-6 py-3"
              >
                <Eye size={18} />
                <span>Aperçu</span>
              </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setConfirmAction(() => () => {
                      setClearing(true)
                      reset({
                        reportText: '',
                        objectifs: '',
                        realisations: '',
                        difficultes: '',
                        solutions: '',
                        besoins: '',
                        perspectives: '',
                        conclusion: '',
                      })
                      setTimeout(() => setClearing(false), 500)
                    })
                    setShowConfirmModal(true)
                  }}
                  disabled={clearing}
                  className="flex items-center justify-center gap-2 px-6 py-3 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {clearing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Vidage...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      <span>Vider</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSubmit(handleSubmitReport)}
                  className="flex items-center justify-center gap-2 px-6 py-3"
                >
                  <Send size={18} />
                  <span>Envoyer</span>
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Aperçu du rapport pour l'employé */}
        <Modal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-crg-primary/10 to-crg-secondary/10 dark:from-crg-primary/20 dark:to-crg-secondary/20 rounded-lg">
                <Eye size={20} className="text-crg-primary dark:text-crg-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Aperçu du rapport</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Vérifiez votre rapport avant impression</p>
              </div>
            </div>
          }
          size="xl"
        >
          {(() => {
            const previewData = getPreviewReportData()
            const weekDate = new Date(previewData.week)
            const weekStart = new Date(weekDate)
            weekStart.setDate(weekDate.getDate() - weekDate.getDay() + 1) // Lundi
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6) // Dimanche
            
            return (
              <div className="space-y-6">
                {/* En-tête magnifique */}
                <div className="relative overflow-hidden bg-gradient-to-br from-crg-primary via-crg-primary/95 to-crg-secondary dark:from-crg-primary/90 dark:via-crg-primary/80 dark:to-crg-secondary/90 rounded-xl shadow-lg border border-crg-primary/20 dark:border-crg-primary/30">
                  {/* Effet de brillance en arrière-plan */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-pulse"></div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>
                  
                  {/* Contenu */}
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="p-2 bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-lg">
                            <FileText size={20} className="text-white" />
                          </div>
                          <h2 className="text-xl font-bold text-white">Rapport d'activités hebdomadaires</h2>
                        </div>
                        <p className="text-white/90 text-sm ml-12">Aperçu du rapport avant impression</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Semaine */}
                      <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 dark:bg-white/10 rounded-lg">
                            <Calendar size={18} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">Période</p>
                            <p className="text-sm font-bold text-white">
                              {weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - {weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-white/70 mt-1">
                              {weekDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                      </div>
                      
                      {/* Service */}
                      <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 dark:bg-white/10 rounded-lg">
                            <Building2 size={18} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">Service</p>
                            <p className="text-sm font-bold text-white">
                        {previewData.direction}
                      </p>
                            <p className="text-xs text-white/70 mt-1">
                              {previewData.userName || 'Utilisateur'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sections avec design premium */}
                {previewData.sections && (
                  <div className="space-y-6">
                    {/* Section I */}
                    <div className="group relative">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                            I
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full border-2 border-white dark:border-gray-900"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                              Les tâches prévues de la semaine
                      </h3>
                            <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-justify leading-relaxed">
                              {previewData.sections.objectifs || <span className="text-gray-400 italic">Non renseigné</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section II */}
                    <div className="group relative">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-green-500/30">
                            II
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-900"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                              Les activités réalisées
                      </h3>
                            <div className="h-1 w-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full"></div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-justify leading-relaxed">
                              {previewData.sections.realisations || <span className="text-gray-400 italic">Non renseigné</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section III */}
                    <div className="group relative">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/30">
                            III
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full border-2 border-white dark:border-gray-900"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                              Les activités en cours de réalisation
                      </h3>
                            <div className="h-1 w-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-justify leading-relaxed">
                              {previewData.sections.solutions || <span className="text-gray-400 italic">Non renseigné</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section IV */}
                    <div className="group relative">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/30">
                            IV
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 rounded-full border-2 border-white dark:border-gray-900"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                              Les difficultés rencontrées
                      </h3>
                            <div className="h-1 w-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"></div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-justify leading-relaxed">
                              {previewData.sections.difficultes || <span className="text-gray-400 italic">Aucune difficulté renseignée</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section V */}
                    <div className="group relative">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/30">
                            V
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white dark:border-gray-900"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                              Les recommandations pour améliorations
                      </h3>
                            <div className="h-1 w-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"></div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-justify leading-relaxed">
                              {previewData.sections.besoins || <span className="text-gray-400 italic">Aucune recommandation renseignée</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section VI */}
                    <div className="group relative">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
                            VI
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-400 rounded-full border-2 border-white dark:border-gray-900"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                              Les perspectives
                      </h3>
                            <div className="h-1 w-16 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"></div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-justify leading-relaxed">
                              {previewData.sections.perspectives || <span className="text-gray-400 italic">Non renseigné</span>}
                      </p>
                    </div>
                        </div>
                      </div>
                    </div>

                    {/* Section VII */}
                    <div className="group relative">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-500/30">
                            VII
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-400 rounded-full border-2 border-white dark:border-gray-900"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                              Conclusion
                            </h3>
                            <div className="h-1 w-16 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full"></div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-justify leading-relaxed">
                              {previewData.sections.conclusion || <span className="text-gray-400 italic">Non renseigné</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions avec style amélioré */}
                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(false)}
                    className="flex items-center gap-2 px-5"
                  >
                    Fermer
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      const previewData = getPreviewReportData()
                      printReport(previewData)
                    }}
                    className="flex items-center gap-2 px-5"
                  >
                    <Printer size={18} />
                    Imprimer
                  </Button>
                </div>
              </div>
            )
          })()}
        </Modal>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Si l'utilisateur est la Directrice, afficher le tableau
  const sentReports = reports.filter(r => r.status === 'envoye').length
  const draftReports = reports.filter(r => r.status === 'brouillon').length

  return (
    <div className="space-y-4 p-4">
      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="group relative bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 dark:from-blue-900/20 dark:via-blue-800/20 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-700 p-5 hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 dark:bg-blue-800/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-wider">Total rapports</p>
              <p className="text-3xl font-extrabold text-blue-900 dark:text-blue-100">{reports.length}</p>
            </div>
            <div className="p-3 bg-blue-500/20 dark:bg-blue-500/30 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
              <FileText className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </Card>
        <Card className="group relative bg-gradient-to-br from-green-50 via-green-100 to-green-50 dark:from-green-900/20 dark:via-green-800/20 dark:to-green-900/20 border-2 border-green-200 dark:border-green-700 p-5 hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 dark:bg-green-800/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2 uppercase tracking-wider">Envoyés</p>
              <p className="text-3xl font-extrabold text-green-900 dark:text-green-100">{sentReports}</p>
            </div>
            <div className="p-3 bg-green-500/20 dark:bg-green-500/30 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </Card>
        <Card className="group relative bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 dark:from-orange-900/20 dark:via-orange-800/20 dark:to-orange-900/20 border-2 border-orange-200 dark:border-orange-700 p-5 hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/30 dark:bg-orange-800/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-2 uppercase tracking-wider">Brouillons</p>
              <p className="text-3xl font-extrabold text-orange-900 dark:text-orange-100">{draftReports}</p>
            </div>
            <div className="p-3 bg-orange-500/20 dark:bg-orange-500/30 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
              <Clock className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <Card className="p-5 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
              Semaine
            </label>
            <input
              type="week"
              value={filters.week}
              onChange={(e) => setFilters({ ...filters, week: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-crg-primary/50 focus:border-crg-primary transition-all"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
              Service
            </label>
            <select
              value={filters.direction}
              onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-crg-primary/50 focus:border-crg-primary transition-all cursor-pointer"
            >
              <option value="">Tous les services</option>
              <option value="DSI">DSI (tous)</option>
              <option value="Service Digital">Service Digital</option>
              <option value="Service Développement et Innovation">Service Développement et Innovation</option>
              <option value="Service Informatique">Service Informatique</option>
              <option value="Service Opérationnel">Service Opérationnel</option>
              <option value="Service Centre de Validation">Service Centre de Validation</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
              Statut
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-crg-primary/50 focus:border-crg-primary transition-all cursor-pointer"
            >
              <option value="">Tous les statuts</option>
              <option value="brouillon">Brouillons</option>
              <option value="envoye">Envoyés</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={loadReports} 
              size="sm" 
              className="flex items-center shadow-md"
              disabled={loading}
              title="Actualiser la liste des rapports"
            >
              <RefreshCw size={16} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button variant="accent" onClick={handleExport} size="sm" className="flex items-center shadow-md">
              <Download size={16} className="mr-1.5" />
              Exporter
            </Button>
          </div>
        </div>
      </Card>

      {/* Tableau des rapports */}
      {loading ? (
        <Card>
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-crg-primary"></div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
          </div>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aucun rapport trouvé</p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Semaine
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Employé
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-right py-4 px-5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                {reports
                  .filter(report => {
                    // Filtrer par statut si un filtre est sélectionné
                    if (filters.status && report.status !== filters.status) {
                      return false
                    }
                    return true
                  })
                  .map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50 dark:hover:from-gray-800/50 dark:hover:to-gray-800/30 transition-all duration-200 group"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {new Date(report.week).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <User size={14} className="text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {report.userName}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Building2 size={14} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {report.direction}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <Badge
                        variant={report.status === 'envoye' ? 'success' : 'warning'}
                        size="sm"
                        className="font-semibold"
                      >
                        {report.status === 'envoye' ? 'Envoyé' : 'Brouillon'}
                      </Badge>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {new Date(report.createdAt || report.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewReport(report.id)}
                          className="p-2.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hover:scale-110 shadow-sm hover:shadow-md"
                          title="Voir le rapport"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => printReport(report)}
                          className="p-2.5 rounded-xl text-crg-primary dark:text-crg-secondary hover:bg-crg-primary/10 dark:hover:bg-crg-secondary/10 transition-all hover:scale-110 shadow-sm hover:shadow-md"
                          title="Imprimer le rapport"
                        >
                          <Printer size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal détail rapport */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelectedReport(null)
        }}
        title={
          <div className="flex items-center justify-between w-full pr-8">
            <span>Rapport - {selectedReport?.userName}</span>
          </div>
        }
        size="xl"
      >
        {selectedReport && (() => {
          // Fonction pour formater le contenu comme dans l'impression
          const formatContentForDisplay = (content, keyword) => {
            if (!content || content.trim().length === 0) {
              return null
            }
            
            // Convertir les sauts de ligne en paragraphes
            const lines = content.split('\n').filter(line => line.trim().length > 0)
            
            if (lines.length === 0) {
              return null
            }
            
            // Commencer par le mot-clé en gras
            const firstLine = lines[0].trim()
            const remainingLines = lines.slice(1)
            
            const isFirstLineBullet = firstLine.startsWith('-')
            const firstLineContent = isFirstLineBullet ? firstLine.substring(1).trim() : firstLine
            
            return (
              <div className="space-y-3">
                <p className="text-justify text-gray-700 dark:text-gray-300" style={{ lineHeight: '1.8', fontSize: '14px', fontFamily: 'Georgia, Times New Roman, serif' }}>
                  <strong className="text-gray-900 dark:text-white font-semibold">{keyword}:</strong> {firstLineContent}
                </p>
                {remainingLines.map((line, index) => {
                  const trimmed = line.trim()
                  if (trimmed.length === 0) {
                    return <div key={index} className="h-2"></div>
                  }
                  
                  const isBullet = trimmed.startsWith('-')
                  const lineContent = isBullet ? trimmed.substring(1).trim() : trimmed
                  
                  return (
                    <p 
                      key={index} 
                      className={`text-justify text-gray-700 dark:text-gray-300 ${isBullet ? 'pl-6 relative before:content-["•"] before:absolute before:left-0 before:text-crg-primary dark:before:text-crg-secondary before:font-bold' : ''}`}
                      style={{ 
                        lineHeight: '1.8', 
                        fontSize: '14px', 
                        fontFamily: 'Georgia, Times New Roman, serif', 
                        marginBottom: '6px'
                      }}
                    >
                      {lineContent}
                    </p>
                  )
                })}
              </div>
            )
          }
          
          const formattedObjectifs = formatContentForDisplay(selectedReport.sections?.objectifs || selectedReport.objectifs, 'Objectifs')
          const formattedRealisations = formatContentForDisplay(selectedReport.sections?.realisations || selectedReport.realisations, 'Réalisations')
          const formattedSolutions = formatContentForDisplay(selectedReport.sections?.solutions || selectedReport.solutions, 'Activités en cours')
          const formattedDifficultes = formatContentForDisplay(selectedReport.sections?.difficultes || selectedReport.difficultes, 'Difficultés')
          const formattedBesoins = formatContentForDisplay(selectedReport.sections?.besoins || selectedReport.besoins, 'Recommandations')
          const formattedPerspectives = formatContentForDisplay(selectedReport.sections?.perspectives || selectedReport.perspectives, 'Perspectives')
          const formattedConclusion = formatContentForDisplay(selectedReport.sections?.conclusion || selectedReport.conclusion, 'Conclusion')
          
          return (
            <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 min-h-full">
              {/* En-tête avec logo et informations */}
              <div className="relative bg-white dark:bg-gray-900 border-b-2 border-crg-primary/20 dark:border-crg-primary/30">
                <div className="p-6">
                  {/* Logo et titre */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-crg-primary/10 dark:bg-crg-primary/20 rounded-xl">
                        <img src={logoCRG} alt="CRG Logo" className="h-10 w-auto" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                          Rapport d'Activités Hebdomadaires
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Centre de Recherche et de Gestion - CRG
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={selectedReport.status === 'envoye' ? 'success' : 'secondary'} 
                      size="md"
                      className="text-xs"
                    >
                      {selectedReport.status === 'envoye' ? '✓ Envoyé' : 'Brouillon'}
                    </Badge>
                  </div>

                  {/* Informations du rapport en ligne */}
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <User size={16} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Auteur</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {selectedReport.userName || 'Non renseigné'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Building2 size={16} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Service</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {selectedReport.direction || 'Non renseigné'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Calendar size={16} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Semaine</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Date(selectedReport.week).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenu du rapport avec design moderne */}
              <div className="p-6 space-y-5">
                {formattedObjectifs && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-blue-200 dark:bg-blue-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Target size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Objectifs</h3>
                      </div>
                      <div className="pl-12 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-justify">
                        {formattedObjectifs}
                      </div>
                    </div>
                  </div>
                )}

                {formattedRealisations && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-green-200 dark:bg-green-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Réalisations</h3>
                      </div>
                      <div className="pl-12 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-justify">
                        {formattedRealisations}
                      </div>
                    </div>
                  </div>
                )}

                {formattedSolutions && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-purple-200 dark:bg-purple-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Lightbulb size={20} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Activités en cours</h3>
                      </div>
                      <div className="pl-12 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-justify">
                        {formattedSolutions}
                      </div>
                    </div>
                  </div>
                )}

                {formattedDifficultes && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-orange-200 dark:bg-orange-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                          <AlertTriangle size={20} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Difficultés</h3>
                      </div>
                      <div className="pl-12 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-justify">
                        {formattedDifficultes}
                      </div>
                    </div>
                  </div>
                )}

                {formattedBesoins && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-amber-200 dark:bg-amber-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl border-l-4 border-amber-500 shadow-sm hover:shadow-md transition-shadow p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                          <Package size={20} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recommandations</h3>
                      </div>
                      <div className="pl-12 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-justify">
                        {formattedBesoins}
                      </div>
                    </div>
                  </div>
                )}

                {formattedPerspectives && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-indigo-200 dark:bg-indigo-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl border-l-4 border-indigo-500 shadow-sm hover:shadow-md transition-shadow p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <Rocket size={20} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Perspectives</h3>
                      </div>
                      <div className="pl-12 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-justify">
                        {formattedPerspectives}
                      </div>
                    </div>
                  </div>
                )}

                {formattedConclusion && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-teal-200 dark:bg-teal-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
                    <div className="relative bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl border-l-4 border-teal-500 shadow-sm hover:shadow-md transition-shadow p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                          <Star size={20} className="text-teal-600 dark:text-teal-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Conclusion</h3>
                      </div>
                      <div className="pl-12 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-justify">
                        {formattedConclusion}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Signature avec design moderne */}
              <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-t-2 border-gray-200 dark:border-gray-700">
                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Conakry, le <span className="font-semibold text-gray-900 dark:text-white">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="w-48 h-px bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-gray-400 dark:to-gray-600"></div>
                    <p className="text-base font-bold text-crg-primary dark:text-crg-secondary">
                      {selectedReport.userName || 'Non renseigné'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Modal de confirmation */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirmation"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {confirmAction === null || (confirmAction.toString().includes('reset') && confirmAction.toString().includes('objectifs')) ? (
              'Êtes-vous sûr de vouloir vider tous les champs du formulaire ?'
            ) : (
              'Générer automatiquement le rapport à partir de vos tâches de la semaine ?\n\nLe contenu sera pré-rempli avec une analyse intelligente de vos tâches.'
            )}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2"
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (confirmAction) {
                  confirmAction()
                }
                setShowConfirmModal(false)
              }}
              className="px-4 py-2"
            >
              Confirmer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de succès */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title=""
        size="md"
      >
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle size={48} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {successMessage}
          </p>
          <div className="flex justify-center">
            <Button
              variant="primary"
              onClick={() => setShowSuccessModal(false)}
              className="px-6 py-2"
            >
              OK
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal d'erreur */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title=""
        size="md"
      >
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <XCircle size={48} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {errorMessage}
          </p>
          <div className="flex justify-center">
            <Button
              variant="primary"
              onClick={() => setShowErrorModal(false)}
              className="px-6 py-2 bg-red-500 hover:bg-red-600"
            >
              OK
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

