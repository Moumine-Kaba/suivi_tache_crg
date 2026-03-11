import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Save, Printer, Plus, Trash2, FileText, FileCheck, Loader2, Eye, EyeOff, Stamp, Upload, CheckCircle2, Archive, LayoutList, Receipt, Menu, X, ArrowLeft, RefreshCw, ChevronRight, ChevronLeft, Sparkles, Search, Download, ArrowUpDown, Banknote, CircleDollarSign, Shield, Lock } from 'lucide-react'
import useAuthStore from '../store/authStore'
import useNotificationsStore from '../store/notificationsStore'
import { invoicesService, usersService } from '../services/api'
import { getDirectorLabel } from '../utils/directorLabel'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import logoCRG from '../assets/logo_crg.png'

// Fonction pour convertir un nombre en lettres (français)
function numberToWords(num) {
  const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']
  
  if (num === 0) return 'zéro'
  if (num < 20) return ones[num]
  
  if (num < 100) {
    const ten = Math.floor(num / 10)
    const one = num % 10
    
    if (ten === 7 || ten === 9) {
      const base = ten === 7 ? 60 : 80
      const remainder = num - base
      if (remainder === 0) return tens[ten]
      if (remainder < 20) return tens[ten] + '-' + ones[remainder]
      return tens[ten] + '-' + numberToWords(remainder)
    }
    
    if (one === 0) return tens[ten]
    if (one === 1 && ten !== 8) return tens[ten] + '-et-un'
    return tens[ten] + '-' + ones[one]
  }
  
  if (num < 1000) {
    const hundred = Math.floor(num / 100)
    const remainder = num % 100
    let result = hundred === 1 ? 'cent' : ones[hundred] + ' cent'
    if (remainder > 0) result += ' ' + numberToWords(remainder)
    if (hundred > 1 && remainder === 0) result += 's'
    return result
  }
  
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000)
    const remainder = num % 1000
    let result = thousand === 1 ? 'mille' : numberToWords(thousand) + ' mille'
    if (remainder > 0) result += ' ' + numberToWords(remainder)
    return result
  }
  
  if (num < 1000000000) {
    const million = Math.floor(num / 1000000)
    const remainder = num % 1000000
    let result = million === 1 ? 'un million' : numberToWords(million) + ' millions'
    if (remainder > 0) result += ' ' + numberToWords(remainder)
    return result
  }
  
  return num.toString()
}

const STATUS_LABELS = {
  brouillon: 'Brouillon',
  soumis_directrice: 'En attente directeur·trice',
  controle_gestion: 'Contrôle Service Gestion',
  transmis_comptabilite: 'Transmis Service Financier',
  virement_effectue: 'Virement effectué',
  rejete: 'Rejeté',
}

const WORKFLOW_STEPS = ['Employé', 'Directeur·trice', 'Service Gestion', 'Service Comptable']
const STATUS_TO_STEP = { brouillon: 0, soumis_directrice: 1, controle_gestion: 2, transmis_comptabilite: 3, virement_effectue: 4, rejete: 0 }

function FullInvoiceDirectorView({
  selectedInvoice,
  watch,
  items,
  date,
  totalDepenses,
  basePriseEnCharge,
  resteEmploye,
  fraisWallet,
  totalFacture,
  isMedicalReimbursement,
  montantEnLettres,
  applicantSignatureDisplay,
  applicantSignatureImageDisplay,
  stampImage,
  directorStampText,
  directorSignatureText,
  logoCRG,
  numberToWords,
  onBack,
  onPrint,
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <Button type="button" variant="outline" size="sm" onClick={onBack} className="flex items-center gap-1.5 text-xs">
          <ArrowLeft size={14} />
          Retour
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onPrint} className="flex items-center gap-1 text-xs">
          <Printer size={14} />
          Impression
        </Button>
      </div>
      <div className="invoice-preview-bg invoice-document invoice-document-compact invoice-sheet-scroll flex-1 overflow-y-auto overflow-x-hidden bg-white rounded-lg p-3 min-h-0">
        <div className="header">
          <img src={logoCRG} alt="Logo CRG" className="logo" />
          <div className="company-info">
            <div className="company-name">CREDIT RURAL DE GUINEE S.A</div>
            <div className="company-details">
              Société Anonyme avec Conseil d&apos;Administration au Capital de 8 000 000 000 GNF<br/>
              Institution de Micro Finance régit par la Loi L/2005/020/AN<br/>
              AGREMENT N° 001/LSFD/BCRG/CAM du 16/04/2002<br/>
              IMF de la 2è catégorie immatriculée RCCM/GC-KAL-M2/041.711/2012 du 16 Février 2012
            </div>
          </div>
        </div>
        <hr />
        <div className="invoice-title">FACTURE INTERNE FOLIO N°.........</div>
        <div className="invoice-date">Date : {(selectedInvoice?.date || date) ? new Date(selectedInvoice?.date || date).toLocaleDateString('fr-FR') : '—'}</div>
        <div className="nature-depense">
          <strong>Nature de la dépense/ objet de la mission...</strong> {selectedInvoice?.natureDepense || watch('natureDepense') || '—'}
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '70%' }}>Libellé du détail de la facture</th>
              <th style={{ width: '30%' }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {(selectedInvoice?.items || items || []).filter((i) => i.libelle || i.montant).map((item, idx) => (
              <tr key={idx}>
                <td>
                  {(item.libelle || '') + ' '}
                  {item.quantity || item.montant ? (
                    <span style={{ fontSize: '10pt', marginLeft: '8px' }}>
                      ({parseFloat(item.quantity || 1).toLocaleString('fr-FR')}x {parseFloat(item.montant || 0).toLocaleString('fr-FR')} GNF)
                    </span>
                  ) : null}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  {item.montant ? `# ${(parseFloat(item.montant || 0) * (parseFloat(item.quantity) || 1)).toLocaleString('fr-FR')} GNF #` : ''}
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <td style={{ textAlign: 'right' }}><strong>TOTAL DEPENSES</strong></td>
              <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {(selectedInvoice?.totals?.totalDepenses ?? totalDepenses).toLocaleString('fr-FR')} GNF #</strong></td>
            </tr>
            {(selectedInvoice?.isMedicalReimbursement ?? isMedicalReimbursement) && (
              <>
                <tr className="total-row">
                  <td style={{ textAlign: 'right' }}><strong>PRISE EN CHARGE ENTREPRISE (80%)</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {(selectedInvoice?.totals?.basePriseEnCharge ?? basePriseEnCharge).toLocaleString('fr-FR')} GNF #</strong></td>
                </tr>
                <tr className="total-row">
                  <td style={{ textAlign: 'right' }}><strong>RESTE A CHARGE EMPLOYE (20%)</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {(selectedInvoice?.totals?.resteEmploye ?? resteEmploye).toLocaleString('fr-FR')} GNF #</strong></td>
                </tr>
              </>
            )}
            <tr className="fee-row">
              <td style={{ textAlign: 'right' }}><strong>FRAIS WALLET (1%)</strong></td>
              <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {(selectedInvoice?.totals?.fraisWallet ?? fraisWallet).toLocaleString('fr-FR')} GNF#</strong></td>
            </tr>
            <tr className="grand-total-row">
              <td style={{ textAlign: 'right' }}><strong>TOTAL FACTURE A PAYER PAR WALLET</strong></td>
              <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {(selectedInvoice?.totals?.totalFacture ?? totalFacture).toLocaleString('fr-FR')} GNF #</strong></td>
            </tr>
          </tbody>
        </table>
        <div className="wallet-section">
          <div className="wallet-label">Numéro Tél wallet Crédit Rural du bénéficiaire :</div>
          <div className="wallet-input">{selectedInvoice?.walletNumber || watch('walletNumber') || ''}</div>
        </div>
        <div className="amount-words">
          <strong>Montant En Toutes Lettres :</strong> {selectedInvoice?.totals?.totalFacture ? numberToWords(Math.floor(selectedInvoice.totals.totalFacture)) + ' Franc Guinéen' : montantEnLettres}
        </div>
        <table className="accounting-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '25px', border: '1px solid #000' }}>
          <thead>
            <tr>
              <th colSpan="2" style={{ width: '70%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>Imputation comptabilité général</th>
              <th style={{ width: '30%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>Imputation Analytique</th>
            </tr>
            <tr>
              <th style={{ width: '35%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>Débit</th>
              <th style={{ width: '35%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>crédits</th>
              <th style={{ width: '30%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>N° Section</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].filter(i => {
              const inv = selectedInvoice
              const debit = inv?.imputationGenerale?.debit?.[i] ?? watch(`imputationGenerale.debit.${i}`)
              const credit = inv?.imputationGenerale?.credit?.[i] ?? watch(`imputationGenerale.credit.${i}`)
              const analytique = inv?.imputationAnalytique?.[i] ?? watch(`imputationAnalytique.${i}`)
              return debit || credit || analytique
            }).map((i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center' }}>{(selectedInvoice?.imputationGenerale?.debit?.[i] ?? watch(`imputationGenerale.debit.${i}`)) || ''}</td>
                <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center' }}>{(selectedInvoice?.imputationGenerale?.credit?.[i] ?? watch(`imputationGenerale.credit.${i}`)) || ''}</td>
                <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center' }}>{(selectedInvoice?.imputationAnalytique?.[i] ?? watch(`imputationAnalytique.${i}`)) || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="signatures">
          <div className="signature-box">
            <div style={{ marginBottom: '4px' }}>Nom et Signature du demandeur</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
              {applicantSignatureDisplay && <div className="signature-text">{applicantSignatureDisplay}</div>}
              {applicantSignatureImageDisplay && <img src={applicantSignatureImageDisplay} alt="Signature" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />}
            </div>
          </div>
          <div className="signature-box">
            <div style={{ marginBottom: '8px' }}>visa et cachet du service comptable</div>
            <div className="signature-text" style={{ minHeight: '28px' }}></div>
          </div>
        </div>
        <div className="signatures">
          <div className="signature-box">
            <div style={{ marginBottom: '4px' }}>Signature pour acquis</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {applicantSignatureImageDisplay ? <img src={applicantSignatureImageDisplay} alt="Signature" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain', marginTop: '4px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} /> : <div className="signature-text">{applicantSignatureDisplay}</div>}
            </div>
          </div>
          <div className="signature-box">
            <div style={{ marginBottom: '8px' }}>Signature du Directeur</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
              {stampImage ? <img src={stampImage} alt="Cachet" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>{directorStampText}</div>}
              <div className="signature-text" style={{ marginTop: '2px' }}>{directorSignatureText}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function FullInvoiceComptableView({ selectedInvoice, logoCRG, numberToWords, applicantSignatureDisplay, applicantSignatureImageDisplay, onBack, onPrint }) {
  if (!selectedInvoice) return null
  return (
    <>
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <Button type="button" variant="outline" size="sm" onClick={onBack} className="flex items-center gap-1.5 text-xs">
          <ArrowLeft size={14} />
          Retour
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onPrint} className="flex items-center gap-1 text-xs">
          <Printer size={14} />
          Impression
        </Button>
      </div>
      <div className="invoice-preview-bg invoice-document invoice-document-compact invoice-sheet-scroll flex-1 overflow-y-auto overflow-x-hidden bg-white rounded-lg p-3 min-h-0">
        <div className="header">
          <img src={logoCRG} alt="Logo CRG" className="logo" />
          <div className="company-info">
            <div className="company-name">CREDIT RURAL DE GUINEE S.A</div>
            <div className="company-details">
              Société Anonyme avec Conseil d&apos;Administration au Capital de 8 000 000 000 GNF<br/>
              Institution de Micro Finance régit par la Loi L/2005/020/AN<br/>
              AGREMENT N° 001/LSFD/BCRG/CAM du 16/04/2002<br/>
              IMF de la 2è catégorie immatriculée RCCM/GC-KAL-M2/041.711/2012 du 16 Février 2012
            </div>
          </div>
        </div>
        <hr />
        <div className="invoice-title">FACTURE INTERNE FOLIO N°.........</div>
        <div className="invoice-date">Date : {selectedInvoice?.date ? new Date(selectedInvoice.date).toLocaleDateString('fr-FR') : '—'}</div>
        <div className="nature-depense">
          <strong>Nature de la dépense/ objet de la mission...</strong> {selectedInvoice?.natureDepense || '—'}
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '70%' }}>Libellé du détail de la facture</th>
              <th style={{ width: '30%' }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {(selectedInvoice?.items || []).filter((i) => i.libelle || i.montant).map((item, idx) => (
              <tr key={idx}>
                <td>
                  {(item.libelle || '') + ' '}
                  {item.quantity || item.montant ? (
                    <span style={{ fontSize: '10pt', marginLeft: '8px' }}>
                      ({parseFloat(item.quantity || 1).toLocaleString('fr-FR')}x {parseFloat(item.montant || 0).toLocaleString('fr-FR')} GNF)
                    </span>
                  ) : null}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  {item.montant ? `# ${(parseFloat(item.montant || 0) * (parseFloat(item.quantity) || 1)).toLocaleString('fr-FR')} GNF #` : ''}
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <td style={{ textAlign: 'right' }}><strong>TOTAL DEPENSES</strong></td>
              <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {Number(selectedInvoice?.totals?.totalDepenses || 0).toLocaleString('fr-FR')} GNF #</strong></td>
            </tr>
            {selectedInvoice?.isMedicalReimbursement && (
              <>
                <tr className="total-row">
                  <td style={{ textAlign: 'right' }}><strong>PRISE EN CHARGE ENTREPRISE (80%)</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {Number(selectedInvoice?.totals?.basePriseEnCharge || 0).toLocaleString('fr-FR')} GNF #</strong></td>
                </tr>
                <tr className="total-row">
                  <td style={{ textAlign: 'right' }}><strong>RESTE A CHARGE EMPLOYE (20%)</strong></td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {Number(selectedInvoice?.totals?.resteEmploye || 0).toLocaleString('fr-FR')} GNF #</strong></td>
                </tr>
              </>
            )}
            <tr className="fee-row">
              <td style={{ textAlign: 'right' }}><strong>FRAIS WALLET (1%)</strong></td>
              <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {(selectedInvoice?.totals?.fraisWallet ?? (selectedInvoice?.totals?.basePriseEnCharge ? Math.round(selectedInvoice.totals.basePriseEnCharge * 0.01) : 0)).toLocaleString('fr-FR')} GNF#</strong></td>
            </tr>
            <tr className="grand-total-row">
              <td style={{ textAlign: 'right' }}><strong>TOTAL FACTURE A PAYER PAR WALLET</strong></td>
              <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {Number(selectedInvoice?.totals?.totalFacture || 0).toLocaleString('fr-FR')} GNF #</strong></td>
            </tr>
          </tbody>
        </table>
        <div className="wallet-section">
          <div className="wallet-label">Numéro Tél wallet Crédit Rural du bénéficiaire :</div>
          <div className="wallet-input">{selectedInvoice?.walletNumber || ''}</div>
        </div>
        <div className="amount-words">
          <strong>Montant En Toutes Lettres :</strong> {selectedInvoice?.totals?.totalFacture ? numberToWords(Math.floor(selectedInvoice.totals.totalFacture)) + ' Franc Guinéen' : '—'}
        </div>
        <table className="accounting-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '25px', border: '1px solid #000' }}>
          <thead>
            <tr>
              <th colSpan="2" style={{ width: '70%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>Imputation comptabilité général</th>
              <th style={{ width: '30%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>Imputation Analytique</th>
            </tr>
            <tr>
              <th style={{ width: '35%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>Débit</th>
              <th style={{ width: '35%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>crédits</th>
              <th style={{ width: '30%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>N° Section</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const rows = [0, 1, 2].filter(i => {
                const d = selectedInvoice?.imputationGenerale?.debit?.[i]
                const c = selectedInvoice?.imputationGenerale?.credit?.[i]
                const a = selectedInvoice?.imputationAnalytique?.[i]
                return d || c || a
              })
              const displayRows = rows.length > 0 ? rows : [0]
              return displayRows.map((i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center' }}>{selectedInvoice?.imputationGenerale?.debit?.[i] || '—'}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center' }}>{selectedInvoice?.imputationGenerale?.credit?.[i] || '—'}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center' }}>{selectedInvoice?.imputationAnalytique?.[i] || '—'}</td>
                </tr>
              ))
            })()}
          </tbody>
        </table>
        <div className="signatures">
          <div className="signature-box">
            <div style={{ marginBottom: '4px' }}>Nom et Signature du demandeur</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
              {applicantSignatureDisplay && <div className="signature-text">{applicantSignatureDisplay}</div>}
              {applicantSignatureImageDisplay && <img src={applicantSignatureImageDisplay} alt="Signature" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />}
            </div>
          </div>
          <div className="signature-box">
            <div style={{ marginBottom: '8px' }}>visa et cachet du service comptable</div>
            <div className="signature-text" style={{ minHeight: '28px' }}></div>
          </div>
        </div>
        <div className="signatures">
          <div className="signature-box">
            <div style={{ marginBottom: '4px' }}>Signature pour acquis</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {applicantSignatureImageDisplay ? <img src={applicantSignatureImageDisplay} alt="Signature" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain', marginTop: '4px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} /> : <div className="signature-text">{applicantSignatureDisplay}</div>}
            </div>
          </div>
          <div className="signature-box">
            <div style={{ marginBottom: '8px' }}>Signature du Directeur</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
              {selectedInvoice?.directorStampImage ? (
                <img src={selectedInvoice.directorStampImage} alt="Cachet" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }} />
              ) : selectedInvoice?.directorStamp ? (
                <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>{selectedInvoice.directorStamp}</div>
              ) : null}
              <div className="signature-text" style={{ marginTop: '2px' }}>{selectedInvoice?.directorSignature || '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Factures() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [showPreview, setShowPreview] = useState(false)
  const [showFullInvoiceInline, setShowFullInvoiceInline] = useState(false)
  const [showFullInvoiceComptable, setShowFullInvoiceComptable] = useState(false)
  const [showFullInvoiceGestion, setShowFullInvoiceGestion] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submittingValidation, setSubmittingValidation] = useState(false) // Modal "Valider la signature"
  const [submittingEnvoi, setSubmittingEnvoi] = useState(false) // Bouton "Envoyer"
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [invoices, setInvoices] = useState([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [signatureName, setSignatureName] = useState(user?.name || user?.nom || '')
  const [stampLabel, setStampLabel] = useState('')
  const [stampImage, setStampImage] = useState(null) // base64 pour l'image du cachet importé
  const [paymentReference, setPaymentReference] = useState('')
  const [showApplicantSignModal, setShowApplicantSignModal] = useState(false)
  const [applicantSignature, setApplicantSignature] = useState('')
  const [applicantSignatureImage, setApplicantSignatureImage] = useState(null)
  const [formDataForSubmit, setFormDataForSubmit] = useState(null)
  const [sidebarView, setSidebarView] = useState('dashboard')
  const [showForm, setShowForm] = useState(false)
  const hasAutoRedirected = useRef(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState('')
  const [dashboardSearchFilter, setDashboardSearchFilter] = useState('')
  const [dashboardPage, setDashboardPage] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewingArchiveInvoiceId, setViewingArchiveInvoiceId] = useState(null)
  const [archiveSearchFilter, setArchiveSearchFilter] = useState('')
  const [archiveSortOrder, setArchiveSortOrder] = useState('date_desc')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [signaturePasswordValue, setSignaturePasswordValue] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showSignaturePassword, setShowSignaturePassword] = useState(false)
  const printRef = useRef(null)
  const stampInputRef = useRef(null)
  
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      natureDepense: '',
      items: [
        { libelle: '', montant: '', quantity: 1 }
      ],
      walletNumber: '',
      imputationGenerale: {
        debit: ['', '', ''],
        credit: ['', '', '']
      },
      imputationAnalytique: ['', '', ''],
      applyFees: true,
      isMedicalReimbursement: false,
    }
  })

  const items = watch('items') || []
  const date = watch('date')
  const applyFees = watch('applyFees')
  const isMedicalReimbursement = watch('isMedicalReimbursement')
  const panelClass = 'rounded-2xl border border-border bg-card shadow-md shadow-black/5 backdrop-blur'
  const currentRole = String(user?.role || '').toLowerCase()
  const canCreateInvoice = currentRole === 'employe' || currentRole === 'chef'
  const isDirector = currentRole === 'directrice' || currentRole === 'admin'
  const isComptable = currentRole === 'comptable' || currentRole === 'lecture'
  const isGestion = currentRole === 'gestion'
  const isAccountant = isComptable

  // Calcul des totaux
  const totalDepenses = items.reduce((sum, item) => {
    const montant = parseFloat(item.montant) || 0
    const quantity = parseFloat(item.quantity) || 1
    return sum + montant * quantity
  }, 0)

  // Regle metier: pour les frais medicaux, l'entreprise prend 80%
  const basePriseEnCharge = isMedicalReimbursement
    ? Math.round(totalDepenses * 0.8)
    : totalDepenses
  const resteEmploye = Math.max(0, totalDepenses - basePriseEnCharge)
  const fraisWallet = applyFees ? Math.round(basePriseEnCharge * 0.01) : 0
  const totalFacture = basePriseEnCharge + fraisWallet
  const montantEnLettres = numberToWords(Math.floor(totalFacture)) + ' franc guinéen'

  const selectedInvoice = useMemo(
    () => invoices.find((inv) => String(inv.id) === String(selectedInvoiceId)) || null,
    [invoices, selectedInvoiceId]
  )
  // Ne jamais afficher le nom du demandeur dans la zone "Signature du Directeur". Uniquement :
  // - la signature du directeur une fois signée, OU
  // - l'aperçu du nom saisi par le directeur quand il signe (pas le demandeur)
  const isDirectorSigning = (user?.role === 'directrice' || user?.role === 'admin') && selectedInvoice?.status === 'soumis_directrice'
  const directorSignatureText = selectedInvoice?.directorSignature || (isDirectorSigning ? signatureName : '')
  const directorStampText = selectedInvoice?.directorStamp || stampLabel || ''
  const applicantSignatureDisplay = selectedInvoice?.applicantSignature || selectedInvoice?.createdByName || applicantSignature || (user?.name || user?.nom || '')
  const applicantSignatureImageDisplay = selectedInvoice?.applicantSignatureImage ?? applicantSignatureImage

  const loadInvoices = async () => {
    setLoadingInvoices(true)
    try {
      const data = await invoicesService.getAll()
      setInvoices(data || [])
    } catch (error) {
      console.error('Erreur chargement factures:', error)
    } finally {
      setLoadingInvoices(false)
    }
  }

  const directorQueue = useMemo(
    () => invoices.filter((inv) => inv.status === 'soumis_directrice'),
    [invoices]
  )
  const gestionQueue = useMemo(
    () => invoices.filter((inv) => inv.status === 'controle_gestion'),
    [invoices]
  )
  const accountingQueue = useMemo(
    () => invoices.filter((inv) => inv.status === 'transmis_comptabilite'),
    [invoices]
  )

  useEffect(() => {
    loadInvoices()
  }, [])

  useEffect(() => {
    setDashboardPage(1)
  }, [dashboardStatusFilter, dashboardSearchFilter])

  useEffect(() => {
    if (invoices.length === 0 || sidebarView !== 'dashboard' || hasAutoRedirected.current) return
    if (isComptable && accountingQueue.length > 0) {
      setSidebarView('a_virer')
      hasAutoRedirected.current = true
    }
  }, [invoices.length, accountingQueue.length, isComptable, sidebarView])

  useEffect(() => {
    if (selectedInvoice?.directorSignature) setSignatureName(selectedInvoice.directorSignature)
    if (selectedInvoice?.directorStamp) setStampLabel(selectedInvoice.directorStamp)
  }, [selectedInvoice?.directorSignature, selectedInvoice?.directorStamp])

  useEffect(() => {
    setShowFullInvoiceInline(false)
  }, [selectedInvoiceId])

  useEffect(() => {
    if (sidebarView !== 'archives') setViewingArchiveInvoiceId(null)
  }, [sidebarView])

  useEffect(() => {
    const handler = () => loadInvoices()
    window.addEventListener('reloadFactures', handler)
    return () => window.removeEventListener('reloadFactures', handler)
  }, [])

  const { loadNotifications } = useNotificationsStore()
  useEffect(() => {
    loadNotifications({ force: true }).catch(() => {})
  }, [loadNotifications])


  const hydrateFormFromInvoice = (invoice) => {
    if (!invoice) return
    reset({
      date: invoice.date || new Date().toISOString().split('T')[0],
      natureDepense: invoice.natureDepense || '',
      items: Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [{ libelle: '', montant: '', quantity: 1 }],
      walletNumber: invoice.walletNumber || '',
      imputationGenerale: invoice.imputationGenerale || { debit: ['', '', ''], credit: ['', '', ''] },
      imputationAnalytique: invoice.imputationAnalytique || ['', '', ''],
      applyFees: invoice.applyFees !== false,
      isMedicalReimbursement: invoice.isMedicalReimbursement === true,
    })
    setApplicantSignature(invoice?.applicantSignature || '')
    setApplicantSignatureImage(invoice?.applicantSignatureImage || null)
  }

  const buildInvoicePayload = (data, status = 'brouillon') => ({
    date: data.date,
    natureDepense: data.natureDepense,
    items: data.items || [],
    walletNumber: data.walletNumber || '',
    applyFees: data.applyFees !== false,
    isMedicalReimbursement: data.isMedicalReimbursement === true,
    totals: {
      totalDepenses,
      basePriseEnCharge,
      resteEmploye,
      fraisWallet,
      totalFacture,
    },
    imputationGenerale: data.imputationGenerale || { debit: ['', '', ''], credit: ['', '', ''] },
    imputationAnalytique: data.imputationAnalytique || ['', '', ''],
    status,
  })

  const myWorkflowInvoices = useMemo(
    () => invoices.filter((inv) => String(inv.createdBy) === String(user?.id)),
    [invoices, user?.id]
  )

  // Factures à afficher dans la Vue d'ensemble selon le rôle
  const dashboardInvoices = useMemo(() => {
    if (canCreateInvoice) return myWorkflowInvoices
    if (isDirector) return directorQueue
    if (isGestion) return invoices
    if (isComptable) return accountingQueue
    return []
  }, [canCreateInvoice, myWorkflowInvoices, isDirector, directorQueue, isGestion, invoices, isComptable, accountingQueue])

  // Factures filtrées pour la Vue d'ensemble
  const filteredDashboardInvoices = useMemo(() => {
    let list = dashboardInvoices
    if (dashboardStatusFilter) list = list.filter((inv) => inv.status === dashboardStatusFilter)
    if (dashboardSearchFilter.trim()) {
      const q = dashboardSearchFilter.trim().toLowerCase()
      list = list.filter((inv) =>
        (inv.natureDepense || '').toLowerCase().includes(q) ||
        (inv.createdByName || '').toLowerCase().includes(q) ||
        String(inv.id || '').toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
  }, [dashboardInvoices, dashboardStatusFilter, dashboardSearchFilter])

  const DASHBOARD_PAGE_SIZE = 8
  const totalDashboardPages = Math.max(1, Math.ceil(filteredDashboardInvoices.length / DASHBOARD_PAGE_SIZE))
  const effectiveDashboardPage = Math.min(dashboardPage, totalDashboardPages)
  const paginatedDashboardInvoices = useMemo(() => {
    const start = (effectiveDashboardPage - 1) * DASHBOARD_PAGE_SIZE
    return filteredDashboardInvoices.slice(start, start + DASHBOARD_PAGE_SIZE)
  }, [filteredDashboardInvoices, effectiveDashboardPage])

  useEffect(() => {
    if (dashboardPage > totalDashboardPages && totalDashboardPages >= 1) {
      setDashboardPage(totalDashboardPages)
    }
  }, [dashboardPage, totalDashboardPages])

  const paidToArchiveQueue = useMemo(
    () => invoices.filter((inv) => inv.status === 'virement_effectue' && !inv.archivedAt),
    [invoices]
  )
  const archivedInvoices = useMemo(
    () => invoices.filter((inv) => inv.archivedAt).sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt)),
    [invoices]
  )
  const filteredArchivedInvoices = useMemo(() => {
    let list = archivedInvoices
    if (archiveSearchFilter.trim()) {
      const q = archiveSearchFilter.trim().toLowerCase()
      list = list.filter((inv) =>
        (inv.natureDepense || '').toLowerCase().includes(q) ||
        (inv.createdByName || '').toLowerCase().includes(q) ||
        String(inv.id || '').toLowerCase().includes(q) ||
        String(inv?.totals?.totalFacture || '').includes(q)
      )
    }
    const sorted = [...list]
    if (archiveSortOrder === 'date_desc') sorted.sort((a, b) => new Date(b.archivedAt || 0) - new Date(a.archivedAt || 0))
    else if (archiveSortOrder === 'date_asc') sorted.sort((a, b) => new Date(a.archivedAt || 0) - new Date(b.archivedAt || 0))
    else if (archiveSortOrder === 'amount_desc') sorted.sort((a, b) => (b?.totals?.totalFacture || 0) - (a?.totals?.totalFacture || 0))
    else if (archiveSortOrder === 'amount_asc') sorted.sort((a, b) => (a?.totals?.totalFacture || 0) - (b?.totals?.totalFacture || 0))
    else if (archiveSortOrder === 'beneficiary') sorted.sort((a, b) => (a.createdByName || '').localeCompare(b.createdByName || ''))
    return sorted
  }, [archivedInvoices, archiveSearchFilter, archiveSortOrder])
  const filteredInvoices = useMemo(() => {
    let list = invoices
    if (statusFilter) list = list.filter((inv) => inv.status === statusFilter)
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [invoices, statusFilter])

  const addItem = () => {
    const currentItems = watch('items') || []
    setValue('items', [...currentItems, { libelle: '', montant: '', quantity: 1 }])
  }

  const removeItem = (index) => {
    const currentItems = watch('items') || []
    setValue('items', currentItems.filter((_, i) => i !== index))
  }

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML
    const printWindow = window.open('', '_blank')
    
    if (!printWindow) {
      alert('Veuillez autoriser les fenêtres popup pour imprimer')
      return
    }

    // Convertir le logo en base64 de manière synchrone
    const getLogoBase64 = () => {
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = logoCRG
        
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        }
        
        img.onerror = () => {
          resolve('')
        }
      })
    }

    getLogoBase64().then((logoBase64) => {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Facture Interne - CRG</title>
          <style>
            @page {
              size: A4;
              margin: 2.5cm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.4;
              color: #000;
              margin: 0;
              padding: 0;
              width: 100%;
            }
             .header {
               display: flex;
               align-items: flex-start;
               margin-bottom: 25px;
               margin-top: 20px;
               width: 100%;
               gap: 15px;
             }
             .logo {
               width: 140px;
               height: 140px;
               flex-shrink: 0;
             }
             .company-info {
               flex: 1;
               text-align: left;
               padding-left: 10px;
             }
             .company-name {
               font-size: 22pt;
               font-weight: bold;
               color: #006020;
               margin-bottom: 10px;
               text-transform: uppercase;
               letter-spacing: 0.5px;
               border-bottom: 2px solid #006020;
               padding-bottom: 5px;
               display: inline-block;
             }
             .company-details {
               font-size: 9pt;
               line-height: 1.5;
               margin-bottom: 0;
               color: #000;
             }
            hr {
              border: none;
              border-top: 1px solid #000;
              margin: 20px 0;
              width: 100%;
            }
             .invoice-title {
               text-align: center;
               font-size: 16pt;
               font-weight: bold;
               margin: 20px 0;
               border-bottom: 1px solid #000;
               padding-bottom: 8px;
             }
            .invoice-date {
              text-align: right;
              margin-bottom: 20px;
              font-weight: bold;
              font-size: 12pt;
            }
            .nature-depense {
              margin-bottom: 20px;
              padding-bottom: 8px;
              font-size: 12pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            table th, table td {
              border: 1px solid #000;
              padding: 6px 8px;
              text-align: left;
              font-size: 11pt;
              line-height: 1.2;
            }
            table th {
              background-color: #f0f0f0;
              font-weight: bold;
              text-align: center;
              vertical-align: middle;
            }
            table td:last-child {
              text-align: center;
              font-weight: normal;
            }
             table tbody tr.empty-row td {
               border-top: none;
               border-bottom: none;
               padding: 6px 8px;
               line-height: 1.2;
               font-size: 11pt;
             }
             table tbody tr.total-row {
               border-top: 1px solid #000;
             }
             table tbody tr.total-row td {
               border-top: 1px solid #000;
               font-weight: bold;
             }
             table tbody tr.fee-row {
               border-top: 1px solid #000;
               border-bottom: 1px solid #000;
             }
             table tbody tr.fee-row td {
               border-top: 1px solid #000;
               border-bottom: 1px solid #000;
               font-weight: bold;
             }
             table tbody tr.grand-total-row {
               border-top: 1px solid #000;
             }
             table tbody tr.grand-total-row td {
               border-top: 1px solid #000;
               font-weight: bold;
               background-color: #f0f0f0;
             }
             .wallet-section {
               margin: 20px 0;
               border: 1px solid #000;
               display: flex;
               width: 100%;
             }
             .wallet-label {
               width: 70%;
               padding: 12px 15px;
               font-weight: bold;
               font-size: 12pt;
               border-right: 1px solid #000;
               display: flex;
               align-items: center;
             }
             .wallet-input {
               width: 30%;
               padding: 12px 15px;
               min-height: 50px;
               border: none;
               background: transparent;
               text-align: center;
               font-weight: bold;
               font-size: 14pt;
             }
             .amount-words {
               margin: 20px 0;
               padding-bottom: 8px;
               font-size: 12pt;
               text-transform: capitalize;
             }
             .accounting-table {
               margin-top: 25px;
               border: 1px solid #000;
               width: 100%;
               border-collapse: collapse;
             }
            .accounting-table th {
              background-color: #e0e0e0;
              padding: 6px 8px;
              font-size: 11pt;
              text-align: center;
              line-height: 1.2;
              border: 1px solid #000;
            }
            .accounting-table td {
              padding: 6px 8px;
              text-align: center;
              line-height: 1.2;
              border: 1px solid #000;
            }
            .accounting-table th:first-child,
            .accounting-table th:nth-child(2) {
              width: 35%;
            }
            .accounting-table th:last-child {
              width: 30%;
            }
            .accounting-table td:first-child,
            .accounting-table td:nth-child(2) {
              width: 35%;
            }
            .accounting-table td:last-child {
              width: 30%;
            }
             .signatures {
               margin-top: 12px;
               display: flex;
               justify-content: space-between;
               width: 100%;
             }
             .signature-box {
               width: 45%;
               border-top: 1px solid #000;
               padding-top: 8px;
               margin-top: 10px;
               min-height: 120px;
               font-size: 12pt;
               text-align: center;
               position: relative;
             }
             .signature-line {
               display: none;
             }
             .signature-text {
               font-family: 'Brush Script MT', 'Lucida Handwriting', cursive;
               font-size: 24pt;
               color: #0066cc;
               font-style: italic;
               margin-top: 12px;
               position: relative;
               z-index: 1;
             }
             .signature-stamp-img {
               max-height: 70px;
               max-width: 100%;
               width: auto;
               object-fit: contain;
             }
             img {
               -webkit-print-color-adjust: exact;
               print-color-adjust: exact;
             }
            @media print {
              body { 
                margin: 0;
                padding: 0;
              }
              .no-print { display: none; }
              @page {
                margin: 2.5cm;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `
      
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()

      // Attendre que toutes les images (cachet, signatures) soient chargées avant d'imprimer
      const waitForImages = () => {
        const imgs = printWindow.document.querySelectorAll('img')
        const pending = Array.from(imgs).filter((img) => !img.complete)
        if (pending.length === 0) {
          setTimeout(() => printWindow.print(), 150)
        } else {
          Promise.all(pending.map((img) => new Promise((r) => { img.onload = r; img.onerror = r })))
            .then(() => setTimeout(() => printWindow.print(), 150))
        }
      }
      setTimeout(waitForImages, 200)
    })
  }

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      const created = await invoicesService.create(buildInvoicePayload(data, 'brouillon'))
      setSelectedInvoiceId(created.id)
      await loadInvoices()
      alert('Brouillon de facture sauvegardé')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const openApplicantSignModal = (data) => {
    setFormDataForSubmit(data)
    setApplicantSignature(user?.name || user?.nom || '')
    setApplicantSignatureImage(null)
    setShowApplicantSignModal(true)
  }

  const handleApplicantSignatureUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    processStampImage(file, setApplicantSignatureImage)
    e.target.value = ''
  }

  const handleConfirmApplicantSign = async () => {
    if (!applicantSignature?.trim() && !applicantSignatureImage) {
      alert('Veuillez signer votre facture : indiquez votre nom et/ou importez une image de signature.')
      return
    }
    if (!formDataForSubmit) return
    setSubmittingValidation(true)
    try {
      const created = await invoicesService.create(buildInvoicePayload(formDataForSubmit, 'brouillon'))
      await invoicesService.update(created.id, {
        applicant_signature: applicantSignature.trim(),
        applicant_signature_image: applicantSignatureImage || null,
      })
      setSelectedInvoiceId(created.id)
      setShowApplicantSignModal(false)
      setFormDataForSubmit(null)
      await loadInvoices()
      alert('Signature validée. Vérifiez l\'impression puis cliquez sur Envoyer pour envoyer au directeur.')
    } catch (error) {
      console.error('Erreur envoi directrice:', error)
      if (error?.message === 'Utilisateur non authentifié') {
        alert('Votre session a expiré. Veuillez vous reconnecter.')
        logout()
        navigate('/login')
      } else {
        alert(`Erreur lors de l'envoi: ${error.message || 'inconnue'}`)
      }
    } finally {
      setSubmittingValidation(false)
    }
  }

  const handleSubmitToDirector = (data) => {
    openApplicantSignModal(data)
  }

  const doSignAndTransmit = async (password = null) => {
    if (!selectedInvoiceId) return
    setActionLoadingId(String(selectedInvoiceId))
    try {
      await invoicesService.signAndTransmit(selectedInvoiceId, {
        signatureName,
        stampLabel,
        stampImage: stampImage || null,
        signaturePassword: password || undefined,
      })
      await loadInvoices()
      setSelectedInvoiceId(null)
      setShowPasswordModal(false)
      setSignaturePasswordValue('')
      setPasswordError('')
      alert('Facture signée et transmise au Service Gestion')
    } catch (error) {
      console.error('Erreur signature directrice:', error)
      if (showPasswordModal) {
        setPasswordError(error.message || 'Mot de passe incorrect ou erreur.')
      } else {
        alert(`Erreur lors de la signature: ${error.message || 'inconnue'}`)
      }
    } finally {
      setActionLoadingId('')
    }
  }

  const handleDirectorSignAndTransmit = async () => {
    if (!selectedInvoiceId) return
    setPasswordError('')
    setSignaturePasswordValue('')
    setShowPasswordModal(true)
  }

  const handlePasswordSubmit = async (e) => {
    e?.preventDefault()
    if (!signaturePasswordValue || signaturePasswordValue.length < 6) {
      setPasswordError('Entrez votre mot de passe (au moins 6 caractères).')
      return
    }
    await doSignAndTransmit(signaturePasswordValue)
  }

  const processStampImage = (file, callback) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const w = img.width
      const h = img.height
      canvas.width = w
      canvas.height = h
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, w, h)
      const data = imageData.data
      const threshold = 248
      const softStart = 232
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        const avg = (r + g + b) / 3
        if (avg >= threshold) {
          data[i + 3] = 0
        } else if (avg >= softStart) {
          const t = (avg - softStart) / (threshold - softStart)
          data[i + 3] = Math.round(a * (1 - t))
        }
      }
      ctx.putImageData(imageData, 0, 0)
      URL.revokeObjectURL(objectUrl)
      callback(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      const reader = new FileReader()
      reader.onload = () => callback(reader.result)
      reader.readAsDataURL(file)
    }
    img.src = objectUrl
  }

  const handleStampUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    processStampImage(file, setStampImage)
    e.target.value = ''
  }

  const handleTransferToFinance = async () => {
    if (!selectedInvoiceId) return
    setActionLoadingId(String(selectedInvoiceId))
    try {
      await invoicesService.transferToFinance(selectedInvoiceId)
      await loadInvoices()
      setSelectedInvoiceId(null)
      alert('Facture transférée au Service Financier.')
    } catch (error) {
      console.error('Erreur transfert:', error)
      alert(`Erreur: ${error.message || 'inconnue'}`)
    } finally {
      setActionLoadingId('')
    }
  }

  const handleRejectByGestion = async () => {
    if (!selectedInvoiceId) return
    const reason = window.prompt('Motif du rejet (optionnel) :')
    if (reason === null) return
    setActionLoadingId(String(selectedInvoiceId))
    try {
      await invoicesService.rejectByGestion(selectedInvoiceId, reason || '')
      await loadInvoices()
      setSelectedInvoiceId(null)
      alert('Facture rejetée. Le demandeur a été notifié.')
    } catch (error) {
      console.error('Erreur rejet:', error)
      alert(`Erreur: ${error.message || 'inconnue'}`)
    } finally {
      setActionLoadingId('')
    }
  }

  const handleRejectByDirector = async () => {
    if (!selectedInvoiceId) return
    const reason = window.prompt('Motif du rejet (optionnel) :')
    if (reason === null) return
    setActionLoadingId(String(selectedInvoiceId))
    try {
      await invoicesService.rejectByDirector(selectedInvoiceId, reason || '')
      await loadInvoices()
      setSelectedInvoiceId(null)
      alert('Facture rejetée. Le demandeur a été notifié.')
    } catch (error) {
      console.error('Erreur rejet:', error)
      alert(`Erreur: ${error.message || 'inconnue'}`)
    } finally {
      setActionLoadingId('')
    }
  }

  const handleMarkPaid = async (invoiceId) => {
    setActionLoadingId(String(invoiceId))
    try {
      await invoicesService.markPaid(invoiceId, paymentReference)
      await loadInvoices()
      setSelectedInvoiceId(null)
      setPaymentReference('')
      alert('Virement validé. La facture a été archivée dans « Factures payées ».')
    } catch (error) {
      console.error('Erreur validation virement:', error)
      alert(`Erreur comptabilité: ${error.message || 'inconnue'}`)
    } finally {
      setActionLoadingId('')
    }
  }

  const handleArchiveExportCsv = () => {
    const headers = ['Réf.', 'Objet', 'Date', 'Bénéficiaire', 'Montant (GNF)', 'Archivée le']
    const rows = filteredArchivedInvoices.map((inv) => [
      `#${String(inv.id).slice(-8)}`,
      inv.natureDepense || '',
      inv.date ? new Date(inv.date).toLocaleDateString('fr-FR') : '',
      inv.createdByName || '',
      Number(inv?.totals?.totalFacture || 0).toLocaleString('fr-FR'),
      inv.archivedAt ? new Date(inv.archivedAt).toLocaleDateString('fr-FR') : '',
    ])
    const csv = [headers.join(';'), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archives-factures-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleArchive = async (invoiceId) => {
    setActionLoadingId(String(invoiceId))
    try {
      await invoicesService.archive(invoiceId)
      await loadInvoices()
      alert('Facture archivée dans les archives')
    } catch (error) {
      console.error('Erreur archivage:', error)
      alert(`Erreur: ${error.message || 'inconnue'}`)
    } finally {
      setActionLoadingId('')
    }
  }

  return (
    <div className="h-full min-h-0 w-full min-w-0 flex-1 bg-background text-foreground flex overflow-hidden">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-20 right-4 z-40 p-2 rounded-lg bg-card border border-border shadow-lg"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          className="lg:hidden fixed inset-0 bg-black/40 z-20"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 flex-shrink-0 border-r border-border bg-card flex flex-col absolute lg:relative inset-y-0 left-0 z-30 transform transition-transform duration-200 shadow-xl lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="font-bold text-foreground flex items-center gap-2 text-lg">
            <span className="p-2 rounded-xl bg-crg-primary/10 text-crg-primary">
              <Receipt size={20} />
            </span>
            Factures
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 ml-10">Gestion des factures CRG</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {canCreateInvoice && (
            <button
              type="button"
              onClick={() => { setShowForm(!showForm); setSidebarView('nouvelle'); if (showForm) setSelectedInvoiceId(''); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition-all ${showForm ? 'bg-crg-primary text-white shadow-md' : 'hover:bg-muted'}`}
            >
              <Plus size={18} />
              Nouvelle facture
            </button>
          )}
          <button
            type="button"
            onClick={() => { setSidebarView('dashboard'); setShowForm(false); setSidebarOpen(false) }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border-l-2 ${sidebarView === 'dashboard' ? 'bg-muted font-medium border-crg-primary' : 'border-transparent hover:bg-muted/70'}`}
          >
            <LayoutList size={18} />
            Vue d&apos;ensemble
          </button>
          {isGestion && (
            <button
              type="button"
              onClick={() => { setSidebarView('controle'); setShowForm(false); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border-l-2 ${sidebarView === 'controle' ? 'bg-muted font-medium border-crg-primary' : 'border-transparent hover:bg-muted/70'}`}
            >
              <FileCheck size={18} />
              Contrôle ({gestionQueue.length})
            </button>
          )}
          {isComptable && (
            <>
              <div className="pt-2 mt-2 border-t border-border">
                <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Service Comptable</p>
              </div>
              <button
                type="button"
                onClick={() => { setSidebarView('a_virer'); setShowForm(false); setSelectedInvoiceId(accountingQueue[0]?.id || null); if (accountingQueue[0]) hydrateFormFromInvoice(accountingQueue[0]); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border-l-2 ${sidebarView === 'a_virer' ? 'bg-emerald-500/15 font-semibold border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'border-transparent hover:bg-muted/70'}`}
              >
                <div className={`p-1.5 rounded-lg ${sidebarView === 'a_virer' ? 'bg-emerald-500/20' : 'bg-amber-500/10'}`}>
                  <Banknote size={18} className={sidebarView === 'a_virer' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <span>À virer</span>
                  <span className="block text-xs font-normal text-muted-foreground">{accountingQueue.length} facture(s)</span>
                </div>
                {accountingQueue.length > 0 && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
                    {accountingQueue.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setSidebarView('virées'); setShowForm(false); setSelectedInvoiceId(null); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border-l-2 ${sidebarView === 'virées' ? 'bg-muted font-medium border-crg-primary' : 'border-transparent hover:bg-muted/70'}`}
              >
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span>Virées à archiver</span>
                  <span className="block text-xs font-normal text-muted-foreground">{paidToArchiveQueue.length} facture(s)</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setSidebarView('archives'); setShowForm(false); setSelectedInvoiceId(null); setViewingArchiveInvoiceId(null); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border-l-2 ${sidebarView === 'archives' ? 'bg-muted font-medium border-crg-primary' : 'border-transparent hover:bg-muted/70'}`}
              >
                <div className="p-1.5 rounded-lg bg-slate-500/10">
                  <Archive size={18} className="text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span>Archives</span>
                  <span className="block text-xs font-normal text-muted-foreground">{archivedInvoices.length} facture(s)</span>
                </div>
              </button>
            </>
          )}
        </nav>
        <div className="p-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={loadInvoices} disabled={loadingInvoices} className="w-full">
            {loadingInvoices ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Rafraîchir'}
          </Button>
        </div>
      </aside>

      {/* Main content - occupe toute la largeur restante */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden w-full">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full">
        {!(isDirector && sidebarView === 'attente' && selectedInvoice && directorQueue?.some((inv) => String(inv.id) === String(selectedInvoiceId))) && !(isGestion && sidebarView === 'controle' && selectedInvoice && gestionQueue?.some((inv) => String(inv.id) === String(selectedInvoiceId))) && (
        <div className="border-b border-border bg-card/30 p-4">
          <div className="flex flex-col gap-4">
            {/* Ligne 1 : Titre + Sous-titre */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {sidebarView === 'dashboard' && 'Vue d\'ensemble'}
                  {sidebarView === 'attente' && 'Factures à signer'}
                  {sidebarView === 'controle' && 'Contrôle des factures'}
                  {sidebarView === 'a_valider' && 'Factures à valider'}
                  {sidebarView === 'a_virer' && 'Factures à virer'}
                  {sidebarView === 'virées' && 'Virées à archiver'}
                  {sidebarView === 'archives' && 'Archives'}
                  {sidebarView === 'nouvelle' && 'Nouvelle facture'}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {sidebarView === 'dashboard' && 'Vos factures et leur statut'}
                  {sidebarView === 'attente' && `${directorQueue.length} facture(s) en attente de signature`}
                  {sidebarView === 'controle' && `${gestionQueue.length} facture(s) à contrôler`}
                  {sidebarView === 'a_valider' && `${accountingQueue.length} facture(s) à valider`}
                  {sidebarView === 'a_virer' && `${accountingQueue.length} facture(s) à virer`}
                  {sidebarView === 'virées' && `${paidToArchiveQueue.length} facture(s) virée(s) à archiver`}
                  {sidebarView === 'archives' && `${archivedInvoices.length} facture(s) archivée(s)`}
                  {sidebarView === 'nouvelle' && 'Remplissez le formulaire ci-contre'}
                </p>
              </div>
            </div>

            {/* Ligne 2 : Filtres Vue d'ensemble (statuts cliquables + recherche + filtre statut) */}
            {(sidebarView === 'dashboard' || !sidebarView) && (
              <div className="flex flex-wrap items-center gap-3">
                {/* Badges statuts cliquables */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {['brouillon', 'soumis_directrice', 'controle_gestion', 'transmis_comptabilite', 'virement_effectue'].map((s) => {
                    const list = canCreateInvoice ? myWorkflowInvoices : invoices
                    const count = list.filter((i) => i.status === s).length
                    const isActive = dashboardStatusFilter === s
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDashboardStatusFilter(isActive ? '' : s)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isActive ? 'bg-primary text-white ring-2 ring-primary/50' : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        <span className={isActive ? 'text-white' : 'text-muted-foreground'}>{STATUS_LABELS[s] || s}</span>
                        <span className="font-bold">{count}</span>
                      </button>
                    )
                  })}
                </div>
                {/* Recherche */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={dashboardSearchFilter}
                    onChange={(e) => setDashboardSearchFilter(e.target.value)}
                    placeholder="Rechercher (objet, créateur, réf.)"
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                {(dashboardStatusFilter || dashboardSearchFilter.trim()) && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {filteredDashboardInvoices.length} facture(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => { setDashboardStatusFilter(''); setDashboardSearchFilter('') }}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Réinitialiser
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        <div className="flex-1 flex min-h-0 overflow-hidden min-w-0 w-full" style={{ width: '100%' }}>
          {/* Zone de contenu principal - pleine largeur */}
          <div
            className={`flex-1 overflow-y-auto p-4 transition-all duration-300 min-w-0 ${showForm && canCreateInvoice ? '!hidden' : ''} ${(isDirector && sidebarView === 'attente' && selectedInvoice && directorQueue?.some((inv) => String(inv.id) === String(selectedInvoiceId))) || (isGestion && sidebarView === 'controle' && selectedInvoice && gestionQueue?.some((inv) => String(inv.id) === String(selectedInvoiceId))) || (sidebarView === 'dashboard' || !sidebarView) ? 'overflow-hidden flex flex-col min-h-0 !p-2' : ''}`}
            style={!showForm ? { flex: '1 1 0%', minWidth: 0, width: '100%' } : undefined}
          >
        <div
          className={`${panelClass} p-4 mb-4 ${(isDirector && sidebarView === 'attente' && selectedInvoice && directorQueue.some((inv) => String(inv.id) === String(selectedInvoiceId))) || (isGestion && sidebarView === 'controle' && selectedInvoice && gestionQueue.some((inv) => String(inv.id) === String(selectedInvoiceId))) || (sidebarView === 'dashboard' || !sidebarView) ? '!p-2 !mb-0 flex-1 min-h-0 flex flex-col overflow-hidden min-w-0' : 'max-w-5xl w-full min-w-0'}`}
          style={(sidebarView === 'dashboard' || !sidebarView) ? { width: '100%', maxWidth: 'none', minWidth: 0, flex: '1 1 0%' } : undefined}
        >
          {(sidebarView === 'dashboard' || !sidebarView) && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden min-w-0" style={{ width: '100%', minWidth: 0, flex: '1 1 0%' }}>
                <h3 className="text-xs font-semibold text-foreground mb-1 flex-shrink-0">
                  {canCreateInvoice ? 'Vos factures' : isDirector ? 'Factures en attente' : isGestion ? 'Contrôle des factures' : isComptable ? 'Factures à traiter' : 'Factures'}
                </h3>
                {filteredDashboardInvoices.length > 0 ? (
                  <div className="flex flex-col gap-2 min-h-0 flex-1">
                    <div className="flex flex-col flex-1 min-h-0 w-full min-w-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                      <div className="flex-1 min-h-0 overflow-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead className="z-10">
                          <tr className="bg-crg-primary/15 dark:bg-crg-primary/25 border-b-2 border-crg-primary/30">
                            <th className="text-left px-4 py-2 text-[11px] font-bold text-crg-primary dark:text-crg-primary uppercase tracking-wider">Réf.</th>
                            <th className="text-left px-4 py-2 text-[11px] font-bold text-crg-primary dark:text-crg-primary uppercase tracking-wider">Nature / Objet</th>
                            <th className="text-left px-4 py-2 text-[11px] font-bold text-crg-primary dark:text-crg-primary uppercase tracking-wider">Date</th>
                            <th className="text-right px-4 py-2 text-[11px] font-bold text-crg-primary dark:text-crg-primary uppercase tracking-wider">Montant</th>
                            <th className="text-center px-4 py-2 text-[11px] font-bold text-crg-primary dark:text-crg-primary uppercase tracking-wider">Statut</th>
                            {canCreateInvoice && (
                              <th className="text-left px-4 py-2 text-[11px] font-bold text-crg-primary dark:text-crg-primary uppercase tracking-wider">Action</th>
                            )}
                            {!canCreateInvoice && (
                              <th className="text-left px-4 py-2 text-[11px] font-bold text-crg-primary dark:text-crg-primary uppercase tracking-wider">Créé par</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedDashboardInvoices.map((inv, idx) => {
                          const isSelected = String(selectedInvoiceId) === String(inv.id)
                          return (
                            <tr
                              key={inv.id}
                              onClick={() => {
                                setSelectedInvoiceId(inv.id)
                                hydrateFormFromInvoice(inv)
                                if (canCreateInvoice) setShowForm(true)
                                else if (isDirector) setSidebarView('attente')
                                else if (isGestion) setSidebarView('controle')
                                else if (isComptable) { setSidebarView('a_virer'); if (accountingQueue.some((i) => String(i.id) === String(inv.id))) hydrateFormFromInvoice(inv) }
                              }}
                              className={`border-b border-border/40 cursor-pointer transition-all duration-150 ease-out
                                ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'}
                                hover:bg-primary/8 hover:shadow-md
                                ${isSelected ? 'bg-primary/15 ring-2 ring-inset ring-primary/40' : ''}`}
                            >
                              <td className="px-4 py-2">
                                <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">#{String(inv.id).slice(-8)}</span>
                              </td>
                              <td className="px-4 py-2">
                                <span className="font-medium text-foreground truncate block max-w-[220px]" title={inv.natureDepense || 'Sans objet'}>{inv.natureDepense || 'Sans objet'}</span>
                              </td>
                              <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{inv.date ? new Date(inv.date).toLocaleDateString('fr-FR') : '—'}</td>
                              <td className="px-4 py-2 text-right">
                                <span className="font-semibold text-foreground tabular-nums">{Number(inv?.totals?.totalFacture || 0).toLocaleString('fr-FR')} <span className="text-muted-foreground font-normal text-xs">GNF</span></span>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${
                                  inv.status === 'virement_effectue' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                                  inv.status === 'rejete' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                                  inv.status === 'transmis_comptabilite' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                                  inv.status === 'controle_gestion' ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400' :
                                  inv.status === 'soumis_directrice' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {STATUS_LABELS[inv.status] || inv.status}
                                </span>
                              </td>
                              {canCreateInvoice && (
                                <td className="px-4 py-2">
                                  {inv.status === 'brouillon' && (inv.applicantSignature || inv.applicantSignatureImage) ? (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      disabled={actionLoadingId === String(inv.id)}
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        setActionLoadingId(String(inv.id))
                                        try {
                                          await invoicesService.submitToDirectrice(inv.id, {
                                            applicantSignature: inv.applicantSignature || '',
                                            applicantSignatureImage: inv.applicantSignatureImage || null,
                                          })
                                          await loadInvoices()
                                          setActionLoadingId('')
                                        } catch (err) {
                                          alert(err?.message || 'Erreur lors de l\'envoi')
                                          setActionLoadingId('')
                                        }
                                      }}
                                      className="text-xs py-1"
                                    >
                                      {actionLoadingId === String(inv.id) ? <Loader2 size={14} className="animate-spin" /> : 'Envoyer au directeur'}
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                              )}
                              {!canCreateInvoice && (
                                <td className="px-4 py-2 text-muted-foreground text-xs">{inv.createdByName || '—'}</td>
                              )}
                            </tr>
                          )
                          })}
                        </tbody>
                      </table>
                      </div>
                      {/* Pagination */}
                      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
                        <p className="text-xs text-muted-foreground">
                          Page {effectiveDashboardPage} sur {totalDashboardPages} • {filteredDashboardInvoices.length} facture(s)
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDashboardPage((p) => Math.max(1, p - 1))}
                            disabled={effectiveDashboardPage <= 1}
                            className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <span className="px-3 py-1 text-sm font-medium text-foreground min-w-[3rem] text-center">
                            {effectiveDashboardPage} / {totalDashboardPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDashboardPage((p) => Math.min(totalDashboardPages, p + 1))}
                            disabled={effectiveDashboardPage >= totalDashboardPages}
                            className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 flex flex-col items-center justify-center text-center">
                    <FileText size={24} className="text-muted-foreground mb-1 opacity-60" />
                    <p className="text-xs font-medium text-foreground">
                      {dashboardInvoices.length === 0
                        ? (canCreateInvoice ? 'Aucune facture' : 'Aucune facture à afficher')
                        : 'Aucun résultat pour ces filtres'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {dashboardInvoices.length === 0
                        ? (canCreateInvoice ? 'Créez une facture pour commencer' : 'Les factures apparaîtront ici selon votre rôle')
                        : 'Modifiez ou réinitialisez les filtres'}
                    </p>
                  </div>
                )}
            </div>
          )}

          {isDirector && sidebarView === 'attente' && (
            <div className="flex-1 min-h-0 flex flex-col mt-2">
                  {selectedInvoice && directorQueue.some((inv) => String(inv.id) === String(selectedInvoiceId)) ? (
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Zone signature et cachet – pleine largeur */}
                      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 shadow-md flex flex-col min-h-0 overflow-hidden flex-1">
                        <div className="flex items-center justify-between mb-2 flex-shrink-0">
                          <Button type="button" variant="outline" size="sm" onClick={() => { setSidebarView('dashboard'); setSelectedInvoiceId(null); setShowFullInvoiceInline(false) }} className="flex items-center gap-1.5 text-xs">
                            <ArrowLeft size={14} />
                            Retour à la vue d&apos;ensemble
                          </Button>
                        </div>
                        {showFullInvoiceInline ? (
                          <FullInvoiceDirectorView
                            selectedInvoice={selectedInvoice}
                            watch={watch}
                            items={items}
                            date={date}
                            totalDepenses={totalDepenses}
                            basePriseEnCharge={basePriseEnCharge}
                            resteEmploye={resteEmploye}
                            fraisWallet={fraisWallet}
                            totalFacture={totalFacture}
                            isMedicalReimbursement={isMedicalReimbursement}
                            montantEnLettres={montantEnLettres}
                            applicantSignatureDisplay={applicantSignatureDisplay}
                            applicantSignatureImageDisplay={applicantSignatureImageDisplay}
                            stampImage={stampImage}
                            directorStampText={directorStampText}
                            directorSignatureText={directorSignatureText}
                            logoCRG={logoCRG}
                            numberToWords={numberToWords}
                            onBack={() => setShowFullInvoiceInline(false)}
                            onPrint={handlePrint}
                          />
                        ) : (
                        <>
                        <h4 className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5 flex-shrink-0">
                          <Stamp size={14} />
                          Signature et cachet
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 flex-shrink-0">
                          <div>
                            <label className="block text-[10px] font-medium text-muted-foreground mb-1">Nom pour signature</label>
                            <input
                              type="text"
                              value={signatureName}
                              onChange={(e) => setSignatureName(e.target.value)}
                              placeholder={(user && (user.role === 'directrice' || user.role === 'admin'))
                                ? `Ex: ${getDirectorLabel(user) === 'directrice' ? 'Madame la Directrice' : 'Monsieur le Directeur'}`
                                : 'Ex: Monsieur le Directeur / Madame la Directrice'}
                              className="w-full px-2 py-1.5 text-sm rounded-lg border-2 border-border bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-muted-foreground mb-1">Libellé du cachet (texte)</label>
                            <input
                              type="text"
                              value={stampLabel}
                              onChange={(e) => setStampLabel(e.target.value)}
                              placeholder="Ex: Cachet"
                              className="w-full px-2 py-1.5 text-sm rounded-lg border-2 border-border bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                          </div>
                        </div>
                        <div className="mb-2 flex-shrink-0">
                          <label className="block text-[10px] font-medium text-muted-foreground mb-1">Image du cachet (optionnel)</label>
                          <div className="flex flex-wrap items-center gap-3">
                            <input
                              ref={stampInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleStampUpload}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => stampInputRef.current?.click()}
                              className="flex items-center gap-2"
                            >
                              <Upload size={16} />
                              {stampImage ? 'Changer le cachet' : 'Importer une image de cachet'}
                            </Button>
                            {stampImage && (
                              <div className="flex items-center gap-2">
                                <img src={stampImage} alt="Cachet" className="h-12 w-auto object-contain border rounded-lg bg-white p-1" />
                                <Button type="button" variant="ghost" size="sm" onClick={() => setStampImage(null)} className="text-red-600">Supprimer</Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="invoice-preview-bg rounded-lg border border-border bg-white p-3 mb-2 flex-1 min-h-[120px] overflow-hidden flex flex-col">
                          <div className="flex items-center justify-between mb-2 flex-shrink-0">
                            <p className="text-[10px] font-medium text-muted-foreground">Signature du Directeur</p>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFullInvoiceInline(true)}
                                className="flex items-center gap-1 text-[10px] py-1 px-2"
                              >
                                <Eye size={12} />
                                Voir la facture complète
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handlePrint}
                                className="flex items-center gap-1 text-[10px] py-1 px-2"
                              >
                                <Printer size={12} />
                                Impression
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-3 min-h-[40px] flex-1">
                            <div className="text-center flex flex-col items-center gap-2">
                              <p className="text-[10pt] text-muted-foreground mb-1">Signature du Directeur</p>
                              {stampImage ? (
                                <>
                                  <img src={stampImage} alt="Cachet" className="max-h-20 w-auto object-contain opacity-90" />
                                  <p className="font-serif italic text-primary" style={{ fontFamily: "'Brush Script MT', cursive" }}>{directorSignatureText || '—'}</p>
                                  <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Cachet bien positionné
                                  </span>
                                </>
                              ) : (
                                <>
                                  <p className="text-[10pt] font-bold">{directorStampText || '—'}</p>
                                  <p className="font-serif italic text-primary" style={{ fontFamily: "'Brush Script MT', cursive" }}>{directorSignatureText || '—'}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handleDirectorSignAndTransmit}
                            disabled={actionLoadingId === String(selectedInvoiceId)}
                            className="flex-1 py-1.5 text-sm font-semibold"
                          >
                            {actionLoadingId === String(selectedInvoiceId) ? (
                              <>
                                <Loader2 size={20} className="animate-spin inline mr-2" />
                                Transmission...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={20} className="inline mr-2" />
                                Signer et transmettre au Service Gestion
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRejectByDirector}
                            disabled={actionLoadingId === String(selectedInvoiceId)}
                            className="py-1.5 text-sm font-semibold border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <X size={18} className="inline mr-1" />
                            Rejeter
                          </Button>
                        </div>
                        </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center flex-1 flex items-center justify-center">
                      <div>
                        <FileText size={48} className="mx-auto text-muted-foreground mb-3 opacity-50" />
                        <p className="text-muted-foreground font-medium">Sélectionnez une facture pour en afficher le contenu</p>
                        <p className="text-sm text-muted-foreground mt-1">Vérifiez chaque détail avant de signer et transmettre.</p>
                      </div>
                    </div>
                  )}
            </div>
          )}

          {isGestion && sidebarView === 'controle' && (
            <div className="flex-1 min-h-0 flex flex-col mt-2">
              {selectedInvoice && gestionQueue.some((inv) => String(inv.id) === String(selectedInvoiceId)) ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="rounded-xl border-2 border-violet-500/30 bg-violet-500/5 p-3 shadow-md flex flex-col min-h-0 overflow-hidden flex-1">
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <Button type="button" variant="outline" size="sm" onClick={() => { setSidebarView('dashboard'); setSelectedInvoiceId(null); setShowFullInvoiceGestion(false) }} className="flex items-center gap-1.5 text-xs">
                        <ArrowLeft size={14} />
                        Retour à la vue d&apos;ensemble
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowFullInvoiceGestion(true)} className="flex items-center gap-1 text-xs">
                          <Eye size={12} />
                          Voir la facture complète
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => { hydrateFormFromInvoice(selectedInvoice); setTimeout(handlePrint, 50) }} className="flex items-center gap-1 text-xs">
                          <Printer size={12} />
                          Impression
                        </Button>
                      </div>
                    </div>
                    {showFullInvoiceGestion ? (
                      <FullInvoiceComptableView
                        selectedInvoice={selectedInvoice}
                        logoCRG={logoCRG}
                        numberToWords={numberToWords}
                        applicantSignatureDisplay={selectedInvoice?.createdByName || '—'}
                        applicantSignatureImageDisplay={selectedInvoice?.applicantSignatureImage ?? null}
                        onBack={() => setShowFullInvoiceGestion(false)}
                        onPrint={handlePrint}
                      />
                    ) : (
                      <>
                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5 flex-shrink-0">
                          <FileCheck size={14} />
                          Contrôle – Vérifiez la facture avant transfert au Service Financier
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2 flex-shrink-0">
                          <div className="rounded-lg border border-primary/20 bg-card/80 px-3 py-2">
                            <p className="text-[10px] font-medium text-muted-foreground">Bénéficiaire</p>
                            <p className="text-xs font-semibold text-foreground truncate">{selectedInvoice?.createdByName || '—'}</p>
                          </div>
                          <div className="rounded-lg border border-primary/20 bg-card/80 px-3 py-2">
                            <p className="text-[10px] font-medium text-muted-foreground">Montant</p>
                            <p className="text-xs font-semibold text-foreground">{Number(selectedInvoice?.totals?.totalFacture || 0).toLocaleString('fr-FR')} GNF</p>
                          </div>
                          <div className="rounded-lg border border-primary/20 bg-card/80 px-3 py-2">
                            <p className="text-[10px] font-medium text-muted-foreground">Objet</p>
                            <p className="text-xs font-semibold text-foreground truncate">{selectedInvoice?.natureDepense || '—'}</p>
                          </div>
                          <div className="rounded-lg border border-primary/20 bg-card/80 px-3 py-2">
                            <p className="text-[10px] font-medium text-muted-foreground">Signature directeur</p>
                            <p className="text-xs font-semibold text-foreground truncate">{selectedInvoice?.directorSignature || '—'}</p>
                          </div>
                        </div>
                        <div className="invoice-preview-bg rounded-lg border border-border bg-white p-3 mb-2 flex-1 min-h-[80px] overflow-hidden flex flex-col">
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">Aperçu</p>
                          <p className="text-xs text-foreground">Facture signée par le directeur – Contrôlez les montants, imputations et pièces avant transfert.</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handleTransferToFinance}
                            disabled={actionLoadingId === String(selectedInvoiceId)}
                            className="flex-1 py-1.5 text-sm font-semibold"
                          >
                            {actionLoadingId === String(selectedInvoiceId) ? (
                              <>
                                <Loader2 size={20} className="animate-spin inline mr-2" />
                                Transfert...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={20} className="inline mr-2" />
                                Transférer au Service Financier
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRejectByGestion}
                            disabled={actionLoadingId === String(selectedInvoiceId)}
                            className="py-1.5 text-sm font-semibold border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <X size={18} className="inline mr-1" />
                            Rejeter
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center flex-1 flex items-center justify-center">
                  <div>
                    <FileText size={48} className="mx-auto text-muted-foreground mb-3 opacity-50" />
                    <p className="text-muted-foreground font-medium">Sélectionnez une facture à contrôler</p>
                    <p className="text-sm text-muted-foreground mt-1">Vérifiez chaque détail avant de transférer au Service Financier.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isComptable && (sidebarView === 'a_virer' || sidebarView === 'virées' || sidebarView === 'dashboard') && (
            <div className="flex-1 min-h-0 flex flex-col mt-4">
              {!(sidebarView === 'archives' && viewingArchiveInvoiceId) && (
                <>
                  {/* Header stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-600/10 border border-amber-500/20 p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20">
                          <Banknote size={22} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">À virer</p>
                          <p className="text-xl font-bold text-foreground">{accountingQueue.length}</p>
                          <p className="text-xs text-muted-foreground">{accountingQueue.reduce((s, i) => s + (Number(i?.totals?.totalFacture) || 0), 0).toLocaleString('fr-FR')} GNF</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 border border-emerald-500/20 p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/20">
                          <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Virées à archiver</p>
                          <p className="text-xl font-bold text-foreground">{paidToArchiveQueue.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-muted/50 border border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-500/20">
                          <Archive size={22} className="text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Archives</p>
                          <p className="text-xl font-bold text-foreground">{archivedInvoices.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-muted/50 border border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-crg-primary/20">
                          <CircleDollarSign size={22} className="text-crg-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Total viré (mois)</p>
                          <p className="text-lg font-bold text-foreground">
                            {[...paidToArchiveQueue, ...archivedInvoices]
                              .filter((i) => i.paidAt && new Date(i.paidAt).getMonth() === new Date().getMonth() && new Date(i.paidAt).getFullYear() === new Date().getFullYear())
                              .reduce((s, i) => s + (Number(i?.totals?.totalFacture) || 0), 0)
                              .toLocaleString('fr-FR')} GNF
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* À virer - Split view: list + validation */}
                  {sidebarView === 'a_virer' && (
                    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
                      <div className={`lg:w-96 shrink-0 flex flex-col ${selectedInvoice && accountingQueue.some((i) => String(i.id) === String(selectedInvoiceId)) ? 'lg:max-h-[calc(100vh-380px)]' : ''}`}>
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                            <Banknote size={18} className="text-amber-600" />
                            Factures en attente de virement
                          </h3>
                          <input
                            type="text"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="Réf. virement (ex: VIR-2024-001)"
                            className="w-full mb-3 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-amber-500/50"
                          />
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {accountingQueue.map((inv) => {
                              const isSel = String(selectedInvoiceId) === String(inv.id)
                              return (
                                <button
                                  key={inv.id}
                                  type="button"
                                  onClick={() => { setSelectedInvoiceId(inv.id); hydrateFormFromInvoice(inv) }}
                                  className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                                    isSel ? 'border-amber-500 bg-amber-500/15 shadow-md' : 'border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/5'
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <span className="font-mono text-xs font-semibold text-muted-foreground">#{String(inv.id).slice(-8)}</span>
                                    <span className="text-sm font-bold text-foreground">{Number(inv?.totals?.totalFacture || 0).toLocaleString('fr-FR')} GNF</span>
                                  </div>
                                  <p className="text-xs font-medium text-foreground truncate mt-0.5">{inv.natureDepense || 'Sans objet'}</p>
                                  <p className="text-[11px] text-muted-foreground">{inv.createdByName || '—'}</p>
                                </button>
                              )
                            })}
                            {accountingQueue.length === 0 && (
                              <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
                                <CheckCircle2 size={32} className="mx-auto text-emerald-500/50 mb-2" />
                                <p className="text-sm font-medium text-muted-foreground">Aucun virement en attente</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        {selectedInvoice && accountingQueue.some((i) => String(i.id) === String(selectedInvoiceId)) ? (
                          <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent p-6 shadow-lg">
                            <Modal
                              isOpen={showFullInvoiceComptable}
                              onClose={() => setShowFullInvoiceComptable(false)}
                              title="Facture complète"
                              size="xl"
                              className="max-h-[90vh]"
                            >
                              <div className="p-2 max-h-[80vh] overflow-auto">
                                <FullInvoiceComptableView
                                  selectedInvoice={selectedInvoice}
                                  logoCRG={logoCRG}
                                  numberToWords={numberToWords}
                                  applicantSignatureDisplay={applicantSignatureDisplay}
                                  applicantSignatureImageDisplay={applicantSignatureImageDisplay}
                                  onBack={() => setShowFullInvoiceComptable(false)}
                                  onPrint={handlePrint}
                                />
                              </div>
                            </Modal>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <FileCheck size={20} className="text-emerald-600" />
                                Validation du virement
                              </h3>
                              <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowFullInvoiceComptable(true)} className="gap-1.5">
                                  <Eye size={14} />
                                  Voir facture
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                                  <Printer size={14} />
                                  Imprimer
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="rounded-xl bg-card/80 border border-border p-3">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase">Bénéficiaire</p>
                                <p className="text-sm font-semibold text-foreground truncate">{selectedInvoice?.createdByName || '—'}</p>
                              </div>
                              <div className="rounded-xl bg-card/80 border border-border p-3">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase">Montant</p>
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{Number(selectedInvoice?.totals?.totalFacture || 0).toLocaleString('fr-FR')} GNF</p>
                              </div>
                              <div className="rounded-xl bg-card/80 border border-border p-3">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase">Wallet</p>
                                <p className="text-sm font-mono text-foreground">{selectedInvoice?.walletNumber || '—'}</p>
                              </div>
                              <div className="rounded-xl bg-card/80 border border-border p-3">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase">Signature</p>
                                {selectedInvoice?.directorStampImage ? (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Cachet OK
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-600">Non signé</span>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="primary"
                              onClick={() => handleMarkPaid(selectedInvoice.id)}
                              disabled={actionLoadingId === String(selectedInvoice.id)}
                              className="w-full py-4 text-base font-bold rounded-xl shadow-lg gap-2"
                            >
                              {actionLoadingId === String(selectedInvoice.id) ? (
                                <>
                                  <Loader2 size={22} className="animate-spin" />
                                  Validation en cours...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={22} />
                                  Valider le virement
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 p-12 flex items-center justify-center min-h-[280px]">
                            <div className="text-center">
                              <FileText size={48} className="mx-auto text-muted-foreground/40 mb-3" />
                              <p className="text-sm font-medium text-muted-foreground">Sélectionnez une facture pour valider le virement</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Virées à archiver */}
                  {sidebarView === 'virées' && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                        Factures virées – à archiver
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {paidToArchiveQueue.map((inv) => (
                          <div key={inv.id} className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono text-xs font-semibold text-muted-foreground">#{String(inv.id).slice(-8)}</span>
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{Number(inv?.totals?.totalFacture || 0).toLocaleString('fr-FR')} GNF</span>
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{inv.natureDepense || 'Sans objet'}</p>
                            <p className="text-xs text-muted-foreground mb-3">{inv.createdByName || '—'}</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleArchive(inv.id)}
                              disabled={actionLoadingId === String(inv.id)}
                              className="w-full gap-2"
                            >
                              {actionLoadingId === String(inv.id) ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                              Archiver
                            </Button>
                          </div>
                        ))}
                        {paidToArchiveQueue.length === 0 && (
                          <div className="col-span-full rounded-xl border-2 border-dashed border-border p-12 text-center">
                            <CheckCircle2 size={40} className="mx-auto text-emerald-500/30 mb-3" />
                            <p className="text-muted-foreground">Aucune facture virée à archiver</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {isComptable && sidebarView === 'archives' && (
            <div className="mt-6 space-y-6 flex-1 min-h-0 flex flex-col">
              {viewingArchiveInvoiceId ? (
                <div className="flex-1 min-h-0 flex flex-col rounded-xl border-2 border-slate-300/50 dark:border-slate-600/50 bg-muted/30 p-4 overflow-hidden">
                  {(() => {
                    const inv = archivedInvoices.find((i) => String(i.id) === String(viewingArchiveInvoiceId))
                    if (!inv) return null
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2 flex-shrink-0">
                          <Button type="button" variant="outline" size="sm" onClick={() => setViewingArchiveInvoiceId(null)} className="flex items-center gap-1.5 text-xs">
                            <ArrowLeft size={14} />
                            Retour à la liste
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => { hydrateFormFromInvoice(inv); setSelectedInvoiceId(inv.id); setTimeout(handlePrint, 50) }} className="flex items-center gap-1 text-xs">
                            <Printer size={14} />
                            Impression
                          </Button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-auto">
                          <FullInvoiceComptableView
                            selectedInvoice={inv}
                            logoCRG={logoCRG}
                            numberToWords={numberToWords}
                            applicantSignatureDisplay={inv?.createdByName || '—'}
                            applicantSignatureImageDisplay={inv?.applicantSignatureImage ?? null}
                            onBack={() => setViewingArchiveInvoiceId(null)}
                            onPrint={() => { hydrateFormFromInvoice(inv); setSelectedInvoiceId(inv.id); setTimeout(handlePrint, 50) }}
                          />
                        </div>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden">
                  {/* En-tête élégant */}
                  <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-crg-primary/20 via-crg-primary/10 to-transparent dark:from-crg-primary/25 dark:via-crg-primary/15 border-b border-crg-primary/20">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-crg-primary/15 dark:bg-crg-primary/25">
                            <Archive size={22} className="text-crg-primary" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-foreground">Archives des factures virées</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {filteredArchivedInvoices.length} facture{filteredArchivedInvoices.length !== 1 ? 's' : ''} {archiveSearchFilter ? '(filtrée(s))' : 'archivée(s)'}
                              {filteredArchivedInvoices.length > 0 && (
                                <span className="ml-2 font-semibold text-foreground">
                                  • Total : {filteredArchivedInvoices.reduce((s, i) => s + (i?.totals?.totalFacture || 0), 0).toLocaleString('fr-FR')} GNF
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={handleArchiveExportCsv} disabled={filteredArchivedInvoices.length === 0} className="flex items-center gap-1.5 text-xs">
                          <Download size={14} />
                          Exporter CSV
                        </Button>
                      </div>
                      {/* Recherche et tri */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[160px] max-w-xs">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            value={archiveSearchFilter}
                            onChange={(e) => setArchiveSearchFilter(e.target.value)}
                            placeholder="Rechercher (objet, bénéficiaire, réf., montant)"
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background/80 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary focus:border-transparent"
                          />
                        </div>
                        <select
                          value={archiveSortOrder}
                          onChange={(e) => setArchiveSortOrder(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-border bg-background/80 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-crg-primary"
                        >
                          <option value="date_desc">Plus récentes</option>
                          <option value="date_asc">Plus anciennes</option>
                          <option value="amount_desc">Montant décroissant</option>
                          <option value="amount_asc">Montant croissant</option>
                          <option value="beneficiary">Par bénéficiaire</option>
                        </select>
                        {(archiveSearchFilter || archiveSortOrder !== 'date_desc') && (
                          <button
                            type="button"
                            onClick={() => { setArchiveSearchFilter(''); setArchiveSortOrder('date_desc') }}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                          >
                            Réinitialiser
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Liste des factures */}
                  <div className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
                    {filteredArchivedInvoices.length > 0 ? (
                      filteredArchivedInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="group relative flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-crg-primary/30 hover:shadow-lg hover:shadow-crg-primary/5 transition-all duration-200 overflow-hidden"
                        >
                          {/* Accent gauche */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-crg-primary to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-bold text-crg-primary bg-crg-primary/10 px-2.5 py-1 rounded-lg">#{String(inv.id).slice(-8)}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                                Archivée le {inv.archivedAt ? new Date(inv.archivedAt).toLocaleDateString('fr-FR') : '—'}
                              </span>
                            </div>
                            <p className="font-medium text-foreground truncate mb-0.5" title={inv.natureDepense || 'Sans objet'}>{inv.natureDepense || 'Sans objet'}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span>{inv.date ? new Date(inv.date).toLocaleDateString('fr-FR') : '—'}</span>
                              <span>•</span>
                              <span>{inv.createdByName || '—'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-base font-bold text-foreground tabular-nums whitespace-nowrap">
                              {Number(inv?.totals?.totalFacture || 0).toLocaleString('fr-FR')}
                              <span className="text-xs font-normal text-muted-foreground ml-1">GNF</span>
                            </span>
                            <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setViewingArchiveInvoiceId(inv.id)}
                                className="p-2 rounded-lg border border-border bg-muted/50 hover:bg-crg-primary/15 hover:border-crg-primary/30 hover:text-crg-primary transition-colors"
                                title="Voir le contenu"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => { hydrateFormFromInvoice(inv); setSelectedInvoiceId(inv.id); setTimeout(handlePrint, 50) }}
                                className="p-2 rounded-lg border border-border bg-muted/50 hover:bg-crg-primary/15 hover:border-crg-primary/30 hover:text-crg-primary transition-colors"
                                title="Imprimer"
                              >
                                <Printer size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                          <Archive size={40} className="text-muted-foreground/60" />
                        </div>
                        <p className="font-medium text-foreground">
                          {archivedInvoices.length === 0 ? 'Aucune facture archivée' : 'Aucun résultat pour cette recherche'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {archivedInvoices.length === 0 ? 'Les factures virées apparaîtront ici après validation.' : 'Modifiez ou réinitialisez les filtres.'}
                        </p>
                        {archiveSearchFilter && (
                          <button
                            type="button"
                            onClick={() => { setArchiveSearchFilter(''); setArchiveSortOrder('date_desc') }}
                            className="mt-3 text-xs text-crg-primary hover:underline"
                          >
                            Réinitialiser les filtres
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
        </div>

        {!((isDirector && selectedInvoice && directorQueue.some((inv) => String(inv.id) === String(selectedInvoiceId))) || (isComptable && selectedInvoice && accountingQueue.some((inv) => String(inv.id) === String(selectedInvoiceId)))) && (
        <div className={`flex-1 min-h-0 flex flex-col transition-all duration-300 ${canCreateInvoice && showForm ? 'w-full min-w-0 p-4 bg-card/30 overflow-hidden' : '!hidden'}`}>
        {canCreateInvoice && showForm && (
          <>
          <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <h3 className="font-semibold text-foreground">Formulaire facture</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setSelectedInvoiceId('') }}>
              <X size={18} />
            </Button>
          </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pr-1">
            {/* Informations générales */}
            <div className={`${panelClass} p-3 flex-shrink-0`}>
              <h2 className="text-base font-bold text-foreground mb-2">Informations générales</h2>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                  <input
                    type="date"
                    {...register('date', { required: true })}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary focus:border-crg-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nature de la dépense / Objet de la mission</label>
                  <textarea
                    {...register('natureDepense', { required: true })}
                    rows={2}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary focus:border-crg-primary resize-none transition-all"
                    placeholder="Ex: Perdiem + Transport..."
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <input type="checkbox" {...register('isMedicalReimbursement')} className="rounded border-border text-crg-primary focus:ring-crg-primary" />
                  Remboursement frais medicaux (80%)
                </label>
              </div>
            </div>

            {/* Informations bénéficiaire */}
            <div className={`${panelClass} p-3 flex-shrink-0`}>
              <h2 className="text-base font-bold text-foreground mb-2">Informations bénéficiaire</h2>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Numéro Tél wallet Crédit Rural</label>
                  <input
                    type="tel"
                    {...register('walletNumber')}
                    placeholder="Ex: 621 00 00 00"
                    className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-crg-primary focus:border-crg-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Montant en toutes lettres</label>
                  <div className="p-2 bg-muted rounded-lg border border-border">
                    <p className="text-sm font-semibold text-foreground capitalize">{montantEnLettres}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Détails de la facture */}
            <div className={`${panelClass} p-3 flex-shrink-0`}>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-base font-bold text-foreground">Détails de la facture</h2>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="flex items-center gap-1.5 text-xs py-1">
                  <Plus size={14} />
                  Ajouter une ligne
                </Button>
              </div>
              <div className="space-y-1.5">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-5">
                      <input
                        {...register(`items.${index}.libelle`, { required: true })}
                        placeholder="Libellé"
                        className="w-full px-2 py-1.5 text-sm border border-border rounded bg-input text-foreground focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="1" step="1" {...register(`items.${index}.quantity`, { required: true, min: 1 })} placeholder="Qté" className="w-full px-2 py-1.5 text-sm border border-border rounded bg-input text-foreground focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="col-span-4">
                      <input type="number" {...register(`items.${index}.montant`, { required: true, min: 0 })} placeholder="Montant (GNF)" className="w-full px-2 py-1.5 text-sm border border-border rounded bg-input text-foreground focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="col-span-1">
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-700 p-1">
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2 bg-muted rounded-lg border border-border">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">TOTAL DÉPENSES</span>
                    <span className="font-bold text-foreground">{totalDepenses.toLocaleString('fr-FR')} GNF</span>
                  </div>
                  {isMedicalReimbursement && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">PRISE EN CHARGE (80%)</span>
                        <span className="font-bold text-success">{basePriseEnCharge.toLocaleString('fr-FR')} GNF</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">RESTE À CHARGE (20%)</span>
                        <span className="font-bold text-foreground">{resteEmploye.toLocaleString('fr-FR')} GNF</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-muted-foreground">FRAIS WALLET (1%)</span>
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <input type="checkbox" {...register('applyFees')} className="rounded border-border text-crg-primary focus:ring-crg-primary" defaultChecked />
                        Appliquer
                      </label>
                    </div>
                    <span className="font-bold text-foreground">{fraisWallet.toLocaleString('fr-FR')} GNF</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border">
                    <span className="text-foreground">TOTAL FACTURE WALLET</span>
                    <span className="text-crg-primary dark:text-crg-secondary">{totalFacture.toLocaleString('fr-FR')} GNF</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Imputation comptable */}
            <div className={`${panelClass} p-3 flex-shrink-0`}>
              <h2 className="text-base font-bold text-foreground mb-2">Imputation comptable</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2">Comptabilité générale</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Débit</label>
                      {[0, 1, 2].map((i) => (
                        <input key={i} {...register(`imputationGenerale.debit.${i}`)} placeholder={`Compte ${i + 1}`} className="w-full mb-1 px-2 py-1 text-xs border border-border rounded bg-input text-foreground focus:ring-1 focus:ring-primary" />
                      ))}
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Crédit</label>
                      {[0, 1, 2].map((i) => (
                        <input key={i} {...register(`imputationGenerale.credit.${i}`)} placeholder={`Compte ${i + 1}`} className="w-full mb-1 px-2 py-1 text-xs border border-border rounded bg-input text-foreground focus:ring-1 focus:ring-primary" />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2">Imputation Analytique</h3>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">N° Section</label>
                  {[0, 1, 2].map((i) => (
                    <input key={i} {...register(`imputationAnalytique.${i}`)} placeholder={`Section ${i + 1}`} className="w-full mb-1 px-2 py-1 text-xs border border-border rounded bg-input text-foreground focus:ring-1 focus:ring-primary" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 justify-end pt-2 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer size={18} />
              Impression
            </Button>
            {canCreateInvoice && (
              <>
                <Button
                  type="button"
                  variant="primary"
                  disabled={submittingValidation || submittingEnvoi}
                  onClick={handleSubmit(handleSubmitToDirector)}
                  className="flex items-center gap-2"
                >
                  {submittingValidation ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Validation...
                    </>
                  ) : (
                    <>
                      <FileText size={18} />
                      Signer
                    </>
                  )}
                </Button>
                {(() => {
                  const hasSignature = selectedInvoice?.applicantSignature || selectedInvoice?.applicantSignatureImage || applicantSignature?.trim() || applicantSignatureImage
                  const signedBrouillon = (selectedInvoice?.status === 'brouillon' && hasSignature) || (selectedInvoiceId && hasSignature && !formDataForSubmit)
                  const invId = selectedInvoice?.id || selectedInvoiceId
                  return (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={!signedBrouillon || !invId || submittingValidation || submittingEnvoi}
                      onClick={async () => {
                        if (!invId) return
                        setSubmittingEnvoi(true)
                        try {
                          await invoicesService.submitToDirectrice(invId, {
                            applicantSignature: selectedInvoice?.applicantSignature || applicantSignature || '',
                            applicantSignatureImage: selectedInvoice?.applicantSignatureImage ?? applicantSignatureImage ?? null,
                          })
                          await loadInvoices()
                          setSelectedInvoiceId(null)
                          setShowForm(false)
                          alert('Facture envoyée au directeur.')
                        } catch (err) {
                          alert(err?.message || 'Erreur lors de l\'envoi')
                        } finally {
                          setSubmittingEnvoi(false)
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      {submittingEnvoi ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        'Envoyer'
                      )}
                    </Button>
                  )
                })()}
              </>
            )}
          </div>
        </form>
        </>
        )}
        </div>
        )}

        {/* Aperçu de la facture - pour impression */}
        <div ref={printRef} className="hidden">
          <div className="header">
            <img src={logoCRG} alt="Logo CRG" className="logo" />
            <div className="company-info">
              <div className="company-name" style={{ fontSize: '22pt', fontWeight: 'bold', color: '#006020', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #006020', paddingBottom: '5px', display: 'inline-block' }}>CREDIT RURAL DE GUINEE S.A</div>
              <div className="company-details" style={{ fontSize: '9pt', lineHeight: '1.5', color: '#000' }}>
                Société Anonyme avec Conseil d'Administration au Capital de 8 000 000 000 GNF<br/>
                Institution de Micro Finance régit par la Loi L/2005/020/AN<br/>
                AGREMENT N° 001/LSFD/BCRG/CAM du 16/04/2002<br/>
                IMF de la 2è catégorie immatriculée RCCM/GC-KAL-M2/041.711/2012 du 16 Février 2012
              </div>
            </div>
          </div>
          
          <hr style={{ borderTop: '1px solid #000', margin: '15px 0' }} />
          
          <div className="invoice-title">
            FACTURE INTERNE FOLIO N°.........
          </div>
          
          <div className="invoice-date">
            Date : {date ? new Date(date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}
          </div>
          
          <div className="nature-depense">
            <strong>Nature de la dépense/ objet de la mission...</strong> {watch('natureDepense') || '................................................................................'}
          </div>
          
          <table>
            <thead>
              <tr>
                <th style={{ width: '70%' }}>Libellé du détail de la facture</th>
                <th style={{ width: '30%' }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(item => item.libelle || item.montant).map((item, index) => (
                <tr key={index}>
                  <td>
                    {(item.libelle || '') + ' '}
                    {item.quantity || item.montant ? (
                      <span className="text-xs text-gray-500 ml-2">
                        (
                        {parseFloat(item.quantity || 1).toLocaleString('fr-FR')}
                        x
                        {` ${parseFloat(item.montant || 0).toLocaleString('fr-FR')} GNF`}
                        )
                      </span>
                    ) : null}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                    {item.montant
                      ? `# ${(parseFloat(item.montant || 0) * (parseFloat(item.quantity) || 1)).toLocaleString('fr-FR')} GNF #`
                      : ''}
                  </td>
                </tr>
              ))}
              <tr className="total-row">
                <td style={{ textAlign: 'right' }}><strong>TOTAL DEPENSES</strong></td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {totalDepenses.toLocaleString('fr-FR')} GNF #</strong></td>
              </tr>
              {isMedicalReimbursement && (
                <>
                  <tr className="total-row">
                    <td style={{ textAlign: 'right' }}><strong>PRISE EN CHARGE ENTREPRISE (80%)</strong></td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {basePriseEnCharge.toLocaleString('fr-FR')} GNF #</strong></td>
                  </tr>
                  <tr className="total-row">
                    <td style={{ textAlign: 'right' }}><strong>RESTE A CHARGE EMPLOYE (20%)</strong></td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {resteEmploye.toLocaleString('fr-FR')} GNF #</strong></td>
                  </tr>
                </>
              )}
              <tr className="fee-row">
                <td style={{ textAlign: 'right' }}><strong>FRAIS WALLET (1%)</strong></td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {fraisWallet.toLocaleString('fr-FR')} GNF#</strong></td>
              </tr>
              <tr className="grand-total-row">
                <td style={{ textAlign: 'right' }}><strong>TOTAL FACTURE A PAYER PAR WALLET</strong></td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}><strong># {totalFacture.toLocaleString('fr-FR')} GNF #</strong></td>
              </tr>
            </tbody>
          </table>
          
          <div className="wallet-section">
            <div className="wallet-label">
              Numéro Tél wallet Crédit Rural du bénéficiaire :
            </div>
            <div className="wallet-input" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14pt' }}>
              {watch('walletNumber') || ''}
            </div>
          </div>
          
          <div className="amount-words">
            <strong>Montant En Toutes Lettres :</strong> {montantEnLettres}
          </div>
          
              <table className="accounting-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th colSpan="2" style={{ width: '70%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>Imputation comptabilité général</th>
                    <th style={{ width: '30%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>Imputation Analytique</th>
                  </tr>
                  <tr>
                    <th style={{ width: '35%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>Débit</th>
                    <th style={{ width: '35%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>crédits</th>
                    <th style={{ width: '30%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>N° Section</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2].filter(i => {
                    const debit = watch(`imputationGenerale.debit.${i}`)
                    const credit = watch(`imputationGenerale.credit.${i}`)
                    const analytique = watch(`imputationAnalytique.${i}`)
                    return debit || credit || analytique
                  }).map((i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center', lineHeight: '1.2' }}>{watch(`imputationGenerale.debit.${i}`) || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center', lineHeight: '1.2' }}>{watch(`imputationGenerale.credit.${i}`) || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center', lineHeight: '1.2' }}>{watch(`imputationAnalytique.${i}`) || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          
          <div className="signatures">
            <div className="signature-box" style={{ display: 'flex', flexDirection: 'column', paddingTop: '8px', minHeight: 'auto', overflow: 'hidden' }}>
              <div style={{ marginBottom: '4px', fontSize: '12pt' }}>Nom et Signature du demandeur</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', overflow: 'hidden' }}>
                {applicantSignatureDisplay && <div className="signature-text" style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", fontSize: '18pt', color: '#0066cc', fontStyle: 'italic', marginTop: 0 }}>{applicantSignatureDisplay}</div>}
                {applicantSignatureImageDisplay && (
                  <img src={applicantSignatureImageDisplay} alt="Signature" style={{ maxHeight: '70px', maxWidth: '100%', width: 'auto', objectFit: 'contain', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                )}
              </div>
            </div>
            <div className="signature-box">
              <div style={{ marginBottom: '8px', fontSize: '12pt' }}>visa et cachet du service comptable</div>
              <div className="signature-text" style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", fontSize: '24pt', color: '#0066cc', fontStyle: 'italic', marginTop: '8px' }}>
                
              </div>
            </div>
          </div>
          
          <div className="signatures">
            <div className="signature-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
              <div style={{ marginBottom: '4px', fontSize: '12pt' }}>Signature pour acquis</div>
              {applicantSignatureImageDisplay ? (
                <img src={applicantSignatureImageDisplay} alt="Signature" style={{ maxHeight: '70px', maxWidth: '100%', width: 'auto', objectFit: 'contain', display: 'block', marginTop: '4px', marginLeft: 'auto', marginRight: 'auto' }} />
              ) : (
                <div className="signature-text" style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", fontSize: '24pt', color: '#0066cc', fontStyle: 'italic', marginTop: '8px' }}>
                  {applicantSignatureDisplay}
                </div>
              )}
            </div>
            <div className="signature-box" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ marginBottom: '8px', fontSize: '12pt' }}>Signature du Directeur</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px', flex: 1, overflow: 'hidden' }}>
                {(selectedInvoice?.directorStampImage || stampImage) ? (
                  <img src={selectedInvoice?.directorStampImage || stampImage} alt="Cachet" className="signature-stamp-img" style={{ maxHeight: '70px', maxWidth: '100%', width: 'auto', objectFit: 'contain' }} />
                ) : (
                  <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>{directorStampText}</div>
                )}
                <div className="signature-text" style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", fontSize: '24pt', color: '#0066cc', fontStyle: 'italic', marginTop: '2px' }}>
                  {directorSignatureText}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal signature demandeur avant envoi */}
        {showApplicantSignModal && (
          <Modal
            isOpen={showApplicantSignModal}
            onClose={() => { setShowApplicantSignModal(false); setFormDataForSubmit(null) }}
            title="Signature du demandeur"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Vous devez signer votre facture avant de l&apos;envoyer au directeur/directrice. Indiquez votre nom et/ou importez une image de votre signature.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nom</label>
                <input
                  type="text"
                  value={applicantSignature}
                  onChange={(e) => setApplicantSignature(e.target.value)}
                  placeholder="Votre nom pour la signature"
                  className="w-full px-4 py-3 rounded-lg border-2 border-border bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", fontSize: '1.25rem' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Image de signature (recommandé)</label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleApplicantSignatureUpload}
                    className="hidden"
                    id="applicant-signature-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('applicant-signature-upload')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload size={16} />
                    {applicantSignatureImage ? 'Changer la signature' : 'Importer une image de signature'}
                  </Button>
                  {applicantSignatureImage && (
                    <div className="flex items-center gap-2">
                      <img src={applicantSignatureImage} alt="Signature" className="h-12 w-auto object-contain border rounded bg-white p-1" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => setApplicantSignatureImage(null)} className="text-red-600">Supprimer</Button>
                    </div>
                  )}
                </div>
              </div>
              {(applicantSignature?.trim() || applicantSignatureImage) && (
                <div className="rounded-lg border-2 border-primary/30 bg-white p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Aperçu sur la facture :</p>
                  <div className="flex flex-col items-center gap-1 min-h-[60px]">
                    {applicantSignatureImage ? (
                      <img src={applicantSignatureImage} alt="Signature" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : null}
                    {applicantSignature?.trim() && (
                      <div style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", fontSize: '18pt', color: '#0066cc', fontStyle: 'italic' }}>
                        {applicantSignature}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowApplicantSignModal(false); setFormDataForSubmit(null) }}>
                  Annuler
                </Button>
                <Button variant="primary" onClick={handleConfirmApplicantSign} disabled={submittingValidation || submittingEnvoi}>
                  {submittingValidation ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Validation...
                    </>
                  ) : (
                    <>
                      <FileText size={18} className="mr-2" />
                      Valider la signature
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal mot de passe pour confirmer la signature (directeur) */}
        {showPasswordModal && (
          <Modal
            isOpen={showPasswordModal}
            onClose={() => { setShowPasswordModal(false); setSignaturePasswordValue(''); setPasswordError('') }}
            title="Confirmer la signature"
            size="md"
            overlayClassName="z-[100]"
          >
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#006020]/5 dark:bg-emerald-500/10 border-2 border-[#006020]/20 dark:border-emerald-500/20">
                <div className="shrink-0">
                  <Shield size={24} className="text-[#006020] dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    Saisissez votre mot de passe pour confirmer la signature et la transmission au Service Gestion.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Cette étape permet de vérifier votre identité avant de signer la facture.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Mot de passe
                </label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#006020] dark:group-focus-within:text-emerald-400 pointer-events-none" />
                  <input
                    type={showSignaturePassword ? 'text' : 'password'}
                    value={signaturePasswordValue}
                    onChange={(e) => { setSignaturePasswordValue(e.target.value); setPasswordError('') }}
                    className="w-full pl-11 pr-12 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#006020]/20 focus:border-[#006020] dark:focus:border-emerald-500"
                    placeholder="Votre mot de passe"
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignaturePassword(!showSignaturePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-[#006020] dark:hover:text-emerald-400"
                    aria-label={showSignaturePassword ? 'Masquer' : 'Afficher'}
                  >
                    {showSignaturePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowPasswordModal(false); setSignaturePasswordValue(''); setPasswordError('') }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={actionLoadingId === String(selectedInvoiceId) || !signaturePasswordValue || signaturePasswordValue.length < 6}
                >
                  {actionLoadingId === String(selectedInvoiceId) ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <Shield size={18} className="mr-2" />
                      Signer et transmettre
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Aperçu plein écran – facture seule, sans scroll, pleine largeur */}
        {showPreview && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/80" onClick={() => setShowPreview(false)}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowPreview(false); }}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/90 hover:bg-white text-gray-800 shadow-lg"
              aria-label="Fermer"
            >
              <X size={24} />
            </button>
            <div className="flex-1 flex items-center justify-center overflow-hidden p-4" onClick={(e) => e.stopPropagation()}>
              <div className="invoice-preview-bg bg-white p-6 w-full max-w-full h-full overflow-hidden flex items-center justify-center" style={{ fontFamily: 'Times New Roman', fontSize: '12pt' }}>
                <div className="invoice-preview-fit w-full h-full overflow-hidden flex items-start justify-center">
                  <div className="invoice-preview-content origin-top" style={{ transform: 'scale(0.6)' }}>
              <div className="header" style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '20px', marginTop: '20px', gap: '15px' }}>
                <img src={logoCRG} alt="Logo CRG" style={{ width: '140px', height: '140px' }} />
                <div style={{ flex: 1, textAlign: 'left', paddingLeft: '10px' }}>
                  <div style={{ fontSize: '22pt', fontWeight: 'bold', color: '#006020', marginBottom: '10px', textTransform: 'uppercase', borderBottom: '2px solid #006020', paddingBottom: '5px', display: 'inline-block' }}>
                    <strong>CREDIT RURAL DE GUINEE S.A</strong>
                  </div>
                  <div style={{ fontSize: '9pt', lineHeight: 1.5, marginBottom: '10px', color: '#000' }}>
                    Société Anonyme avec Conseil d'Administration au Capital de 8 000 000 000 GNF<br/>
                    Institution de Micro Finance régit par la Loi L/2005/020/AN<br/>
                    AGREMENT N° 001/LSFD/BCRG/CAM du 16/04/2002<br/>
                    IMF de la 2è catégorie immatriculée RCCM/GC-KAL-M2/041.711/2012 du 16 Février 2012
                  </div>
                </div>
              </div>
              
              <hr style={{ borderTop: '1px solid #000', margin: '15px 0' }} />
              
              <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', margin: '15px 0', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
                FACTURE INTERNE FOLIO N°.........
              </div>
              
              <div style={{ textAlign: 'right', marginBottom: '15px', fontWeight: 'bold' }}>
                Date : {date ? new Date(date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}
              </div>
              
              <div style={{ marginBottom: '20px', paddingBottom: '8px', fontSize: '12pt' }}>
                <strong>Nature de la dépense/ objet de la mission...</strong> {watch('natureDepense') || ''}
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '70%', border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', textAlign: 'center' }}>Libellé du détail de la facture</th>
                    <th style={{ width: '30%', border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', textAlign: 'center' }}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(item => item.libelle || item.montant).map((item, index) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', lineHeight: '1.2' }}>{item.libelle || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontSize: '11pt', lineHeight: '1.2' }}>{item.montant ? `# ${parseFloat(item.montant || 0).toLocaleString('fr-FR')} GNF #` : ''}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold' }}>
                    <td style={{ 
                      border: '1px solid #000',
                      borderTop: '1px solid #000',
                      padding: '6px 8px',
                      fontSize: '11pt',
                      lineHeight: '1.2',
                      fontWeight: 'bold'
                    }}>
                      <strong>TOTAL DEPENSES</strong>
                    </td>
                    <td style={{ 
                      border: '1px solid #000',
                      borderTop: '1px solid #000',
                      padding: '6px 8px', 
                      textAlign: 'center',
                      fontSize: '11pt',
                      lineHeight: '1.2',
                      fontWeight: 'bold'
                    }}>
                      <strong># {totalDepenses.toLocaleString('fr-FR')} GNF #</strong>
                    </td>
                  </tr>
                  {isMedicalReimbursement && (
                    <>
                      <tr style={{ fontWeight: 'bold' }}>
                        <td style={{ border: '1px solid #000', borderTop: '1px solid #000', padding: '6px 8px', fontSize: '11pt', lineHeight: '1.2', fontWeight: 'bold' }}>
                          <strong>PRISE EN CHARGE ENTREPRISE (80%)</strong>
                        </td>
                        <td style={{ border: '1px solid #000', borderTop: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontSize: '11pt', lineHeight: '1.2', fontWeight: 'bold' }}>
                          <strong># {basePriseEnCharge.toLocaleString('fr-FR')} GNF #</strong>
                        </td>
                      </tr>
                      <tr style={{ fontWeight: 'bold' }}>
                        <td style={{ border: '1px solid #000', borderTop: '1px solid #000', padding: '6px 8px', fontSize: '11pt', lineHeight: '1.2', fontWeight: 'bold' }}>
                          <strong>RESTE A CHARGE EMPLOYE (20%)</strong>
                        </td>
                        <td style={{ border: '1px solid #000', borderTop: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontSize: '11pt', lineHeight: '1.2', fontWeight: 'bold' }}>
                          <strong># {resteEmploye.toLocaleString('fr-FR')} GNF #</strong>
                        </td>
                      </tr>
                    </>
                  )}
                  <tr style={{ fontWeight: 'bold' }}>
                    <td style={{ 
                      border: '1px solid #000',
                      borderTop: '1px solid #000',
                      borderBottom: '1px solid #000',
                      padding: '6px 8px',
                      fontSize: '11pt',
                      lineHeight: '1.2',
                      fontWeight: 'bold'
                    }}>
                      <strong>FRAIS WALLET (1%)</strong>
                    </td>
                    <td style={{ 
                      border: '1px solid #000',
                      borderTop: '1px solid #000',
                      borderBottom: '1px solid #000',
                      padding: '6px 8px', 
                      textAlign: 'center',
                      fontSize: '11pt',
                      lineHeight: '1.2',
                      fontWeight: 'bold'
                    }}>
                      <strong># {fraisWallet.toLocaleString('fr-FR')} GNF#</strong>
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                    <td style={{ 
                      border: '1px solid #000',
                      borderTop: '1px solid #000',
                      padding: '6px 8px',
                      fontSize: '11pt',
                      lineHeight: '1.2',
                      fontWeight: 'bold'
                    }}>
                      <strong>TOTAL FACTURE A PAYER PAR WALLET</strong>
                    </td>
                    <td style={{ 
                      border: '1px solid #000',
                      borderTop: '1px solid #000',
                      padding: '6px 8px', 
                      textAlign: 'center',
                      fontSize: '11pt',
                      lineHeight: '1.2',
                      fontWeight: 'bold'
                    }}>
                      <strong># {totalFacture.toLocaleString('fr-FR')} GNF #</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <div style={{ margin: '15px 0', fontWeight: 'bold', textDecoration: 'underline' }}>
                <div style={{ 
                  margin: '20px 0',
                  border: '1px solid #000',
                  display: 'flex',
                  width: '100%'
                }}>
                  <div style={{
                    width: '70%',
                    padding: '12px 15px',
                    fontWeight: 'bold',
                    fontSize: '12pt',
                    borderRight: '1px solid #000',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    Numéro Tél wallet Crédit Rural du bénéficiaire :
                  </div>
                  <div style={{
                    width: '30%',
                    padding: '12px 15px',
                    minHeight: '50px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '14pt'
                  }}>
                    {watch('walletNumber') || ''}
                  </div>
                </div>
              </div>
              
              <div style={{ margin: '20px 0', paddingBottom: '8px', fontSize: '12pt', textTransform: 'capitalize' }}>
                <strong>Montant En Toutes Lettres :</strong> {montantEnLettres}
              </div>
              
              <table style={{ marginTop: '25px', border: '2px solid #000', width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th colSpan="2" style={{ width: '70%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>
                      Imputation comptabilité général
                    </th>
                    <th style={{ width: '30%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>
                      Imputation Analytique
                    </th>
                  </tr>
                  <tr>
                    <th style={{ width: '35%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>
                      Débit
                    </th>
                    <th style={{ width: '35%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>
                      crédits
                    </th>
                    <th style={{ width: '30%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#e0e0e0', fontSize: '11pt', textAlign: 'center' }}>
                      N° Section
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2].filter(i => {
                    const debit = watch(`imputationGenerale.debit.${i}`)
                    const credit = watch(`imputationGenerale.credit.${i}`)
                    const analytique = watch(`imputationAnalytique.${i}`)
                    return debit || credit || analytique
                  }).map((i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center', lineHeight: '1.2' }}>{watch(`imputationGenerale.debit.${i}`) || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center', lineHeight: '1.2' }}>{watch(`imputationGenerale.credit.${i}`) || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11pt', textAlign: 'center', lineHeight: '1.2' }}>{watch(`imputationAnalytique.${i}`) || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '8px', marginTop: '10px', minHeight: 'auto', fontSize: '12pt', textAlign: 'center', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ marginBottom: '4px' }}>Nom et Signature du demandeur</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', overflow: 'hidden' }}>
                    {applicantSignatureDisplay && <div style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", fontSize: '18pt', color: '#0066cc', fontStyle: 'italic' }}>{applicantSignatureDisplay}</div>}
                    {applicantSignatureImageDisplay && (
                      <img src={applicantSignatureImageDisplay} alt="Signature" style={{ maxHeight: '70px', maxWidth: '100%', width: 'auto', objectFit: 'contain', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                    )}
                  </div>
                </div>
                <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '8px', marginTop: '10px', minHeight: '100px', fontSize: '12pt', textAlign: 'center' }}>
                  <div style={{ marginBottom: '8px' }}>visa et cachet du service comptable</div>
                  <div style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", fontSize: '24pt', color: '#0066cc', fontStyle: 'italic', marginTop: '8px', minHeight: '28px' }}>
                    
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '8px', marginTop: '10px', minHeight: '100px', fontSize: '12pt', textAlign: 'center', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ marginBottom: '4px' }}>Signature pour acquis</div>
                  {applicantSignatureImageDisplay ? (
                    <img src={applicantSignatureImageDisplay} alt="Signature" style={{ maxHeight: '70px', maxWidth: '100%', width: 'auto', objectFit: 'contain', display: 'block', marginTop: '4px' }} />
                  ) : (
                    <div style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", fontSize: '24pt', color: '#0066cc', fontStyle: 'italic', marginTop: '8px', minHeight: '28px' }}>
                      {applicantSignatureDisplay}
                    </div>
                  )}
                </div>
                <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '8px', marginTop: '10px', minHeight: '120px', fontSize: '12pt', textAlign: 'center', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ marginBottom: '8px' }}>Signature du Directeur</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px', flex: 1, overflow: 'hidden' }}>
                    {(selectedInvoice?.directorStampImage || stampImage) ? (
                      <img src={selectedInvoice?.directorStampImage || stampImage} alt="Cachet" style={{ maxHeight: '70px', maxWidth: '100%', width: 'auto', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>{directorStampText}</div>
                    )}
                    <div style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", fontSize: '24pt', color: '#0066cc', fontStyle: 'italic', marginTop: '2px' }}>
                      {directorSignatureText}
                    </div>
                  </div>
                </div>
              </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
        </div>
      </main>
    </div>
  )
}

