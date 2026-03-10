import { useState, useEffect } from 'react'
import {
  FileCheck,
  TrendingUp,
  BarChart3,
  PieChart,
  DollarSign,
  Calendar,
  FileText,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Target,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { invoicesService, directionsService } from '../services/api'
import useAuthStore from '../store/authStore'
import { Link } from 'react-router-dom'
import { DIRECTIONS } from '../constants/directions'

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1']

function filterInvoicesByDirection(invoices, directionValue, directionOptions) {
  if (!directionValue || directionValue === 'all') return invoices
  const dir = directionOptions?.find((o) => o.value === directionValue)
  if (!dir?.services?.length) return invoices
  return invoices.filter((inv) => {
    const d = inv.direction || inv.direction_id
    return d === directionValue || dir.services.includes(d)
  })
}

export default function GestionDashboard() {
  const { user } = useAuthStore()
  const [invoices, setInvoices] = useState([])
  const [directions, setDirections] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tableau')
  const [selectedDirection, setSelectedDirection] = useState('all')

  const directionOptions = (() => {
    const fromDb = directions?.length
      ? directions.map((d) => ({
          value: d.name,
          label: d.label || d.name,
          services: (d.services || []).map((s) => (s?.name ?? (typeof s === 'string' ? s : ''))).filter(Boolean),
        }))
      : []
    const fromConst = fromDb.length
      ? []
      : Object.entries(DIRECTIONS).map(([k, v]) => ({
          value: v.value || k,
          label: v.label || k,
          services: v.services || [],
        }))
    const base = fromDb.length ? fromDb : fromConst
    const knownValues = new Set(base.flatMap((o) => [o.value, ...(o.services || [])]))
    const fromInvoices = (invoices || [])
      .map((inv) => inv.direction || inv.direction_id)
      .filter(Boolean)
    const extra = [...new Set(fromInvoices)].filter((v) => !knownValues.has(v))
    return [
      ...base,
      ...extra.map((v) => ({ value: v, label: v, services: [v] })),
    ]
  })()

  useEffect(() => {
    if (user?.role === 'gestion' || user?.role === 'admin') {
      Promise.all([
        invoicesService.getAll(),
        directionsService.getAll().catch(() => []),
      ])
        .then(([invData, dirData]) => {
          setInvoices(invData || [])
          setDirections(dirData || [])
        })
        .catch(() => setInvoices([]))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user])

  const filteredInvoices = filterInvoicesByDirection(invoices, selectedDirection, directionOptions)

  const controleQueue = filteredInvoices.filter((i) => i.status === 'controle_gestion')
  const transmisQueue = filteredInvoices.filter((i) => i.status === 'transmis_comptabilite')
  const payees = filteredInvoices.filter((i) => i.status === 'virement_effectue')
  const rejetees = filteredInvoices.filter((i) => i.status === 'rejete')

  const totalControle = controleQueue.reduce((s, i) => s + (Number(i?.totals?.totalFacture) || 0), 0)
  const totalTransmis = transmisQueue.reduce((s, i) => s + (Number(i?.totals?.totalFacture) || 0), 0)
  const totalPaye = payees.reduce((s, i) => s + (Number(i?.totals?.totalFacture) || 0), 0)
  const totalRejete = rejetees.reduce((s, i) => s + (Number(i?.totals?.totalFacture) || 0), 0)

  const byStatus = [
    { name: 'À contrôler', value: controleQueue.length, montant: totalControle, color: COLORS[0] },
    { name: 'Transmis', value: transmisQueue.length, montant: totalTransmis, color: COLORS[1] },
    { name: 'Payées', value: payees.length, montant: totalPaye, color: COLORS[2] },
    { name: 'Rejetées', value: rejetees.length, montant: totalRejete, color: COLORS[4] },
  ]

  const byMonth = (() => {
    const map = {}
    filteredInvoices.forEach((inv) => {
      const d = inv.date ? new Date(inv.date) : new Date(inv.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { month: key, total: 0, count: 0 }
      map[key].total += Number(inv?.totals?.totalFacture) || 0
      map[key].count += 1
    })
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
  })()

  const byNature = (() => {
    const map = {}
    filteredInvoices.forEach((inv) => {
      const n = inv.natureDepense || 'Non renseigné'
      if (!map[n]) map[n] = { name: n, value: 0 }
      map[n].value += Number(inv?.totals?.totalFacture) || 0
    })
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 6)
  })()

  const exportCsv = () => {
    const headers = ['Réf.', 'Objet', 'Date', 'Direction', 'Bénéficiaire', 'Montant (GNF)', 'Statut']
    const rows = filteredInvoices.map((inv) => [
      `#${String(inv.id).slice(-8)}`,
      inv.natureDepense || '',
      inv.date ? new Date(inv.date).toLocaleDateString('fr-FR') : '',
      inv.direction || '',
      inv.createdByName || '',
      Number(inv?.totals?.totalFacture || 0).toLocaleString('fr-FR'),
      inv.status || '',
    ])
    const csv = [headers.join(';'), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporting-financier-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (user?.role !== 'gestion' && user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Accès réservé</h2>
          <p className="text-muted-foreground">Cette page est réservée au Service Gestion.</p>
        </Card>
      </div>
    )
  }

  const tabs = [
    { id: 'tableau', label: 'Tableau de bord', icon: BarChart3 },
    { id: 'budget', label: 'Suivi budgétaire', icon: Target },
    { id: 'depenses', label: 'Analyse des dépenses', icon: PieChart },
    { id: 'paiements', label: 'Suivi des paiements', icon: DollarSign },
    { id: 'reporting', label: 'Reporting financier', icon: FileText },
  ]

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileCheck size={28} className="text-violet-500" />
            Espace Service Gestion
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Contrôle des factures, suivi budgétaire, analyse des dépenses et reporting
          </p>
        </div>
        <Link to="/factures">
          <Button variant="primary" size="sm" className="flex items-center gap-2">
            <ArrowRight size={16} />
            Contrôler les factures
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === id
                ? 'bg-violet-500 text-white shadow-md'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Target size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Budget par direction :</span>
          <select
            value={selectedDirection}
            onChange={(e) => setSelectedDirection(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">Toutes les directions</option>
            {directionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <div className="animate-spin w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </Card>
      ) : (
        <>
          {activeTab === 'tableau' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-violet-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">À contrôler</p>
                      <p className="text-2xl font-bold text-foreground">{controleQueue.length}</p>
                      <p className="text-xs text-muted-foreground">{totalControle.toLocaleString('fr-FR')} GNF</p>
                    </div>
                    <FileCheck size={32} className="text-violet-500 opacity-60" />
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Transmis</p>
                      <p className="text-2xl font-bold text-foreground">{transmisQueue.length}</p>
                      <p className="text-xs text-muted-foreground">{totalTransmis.toLocaleString('fr-FR')} GNF</p>
                    </div>
                    <Clock size={32} className="text-blue-500 opacity-60" />
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-emerald-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Payées</p>
                      <p className="text-2xl font-bold text-foreground">{payees.length}</p>
                      <p className="text-xs text-muted-foreground">{totalPaye.toLocaleString('fr-FR')} GNF</p>
                    </div>
                    <CheckCircle2 size={32} className="text-emerald-500 opacity-60" />
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Rejetées</p>
                      <p className="text-2xl font-bold text-foreground">{rejetees.length}</p>
                      <p className="text-xs text-muted-foreground">{totalRejete.toLocaleString('fr-FR')} GNF</p>
                    </div>
                    <AlertCircle size={32} className="text-red-500 opacity-60" />
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Répartition par statut</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <RechartsPie>
                      <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                        {byStatus.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [v, 'Factures']} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Évolution mensuelle (6 derniers mois)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byMonth}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [Number(v).toLocaleString('fr-FR') + ' GNF', 'Montant']} />
                      <Bar dataKey="total" fill="#8b5cf6" name="Montant (GNF)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target size={20} className="text-violet-500" />
                  Suivi budgétaire
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Engagements en cours (à contrôler + transmis)</p>
                    <p className="text-2xl font-bold text-foreground">
                      {(totalControle + totalTransmis).toLocaleString('fr-FR')} GNF
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Dépenses réalisées (payées)</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {totalPaye.toLocaleString('fr-FR')} GNF
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Pour un suivi budgétaire complet, configurez les budgets par catégorie dans les paramètres.
                </p>
              </Card>
            </div>
          )}

          {activeTab === 'depenses' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-violet-500" />
                  Analyse des dépenses par nature
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byNature} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k GNF`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [Number(v).toLocaleString('fr-FR') + ' GNF', 'Montant']} />
                    <Bar dataKey="value" fill="#8b5cf6" name="Montant (GNF)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {activeTab === 'paiements' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign size={20} className="text-violet-500" />
                  Suivi des paiements
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3">Réf.</th>
                        <th className="text-left py-2 px-3">Objet</th>
                        <th className="text-left py-2 px-3">Direction</th>
                        <th className="text-left py-2 px-3">Bénéficiaire</th>
                        <th className="text-right py-2 px-3">Montant</th>
                        <th className="text-left py-2 px-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.slice(0, 20).map((inv) => (
                        <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-3">#{String(inv.id).slice(-8)}</td>
                          <td className="py-2 px-3 truncate max-w-[180px]">{inv.natureDepense || '—'}</td>
                          <td className="py-2 px-3 text-muted-foreground">{inv.direction || '—'}</td>
                          <td className="py-2 px-3">{inv.createdByName || '—'}</td>
                          <td className="py-2 px-3 text-right font-medium">
                            {Number(inv?.totals?.totalFacture || 0).toLocaleString('fr-FR')} GNF
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                inv.status === 'virement_effectue'
                                  ? 'bg-emerald-500/20 text-emerald-600'
                                  : inv.status === 'rejete'
                                  ? 'bg-red-500/20 text-red-600'
                                  : inv.status === 'controle_gestion'
                                  ? 'bg-violet-500/20 text-violet-600'
                                  : 'bg-blue-500/20 text-blue-600'
                              }`}
                            >
                              {inv.status === 'virement_effectue'
                                ? 'Payée'
                                : inv.status === 'rejete'
                                ? 'Rejetée'
                                : inv.status === 'controle_gestion'
                                ? 'À contrôler'
                                : inv.status === 'transmis_comptabilite'
                                ? 'Transmis'
                                : inv.status || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredInvoices.length > 20 && (
                  <p className="text-xs text-muted-foreground mt-2">Affichage des 20 dernières factures.</p>
                )}
              </Card>
            </div>
          )}

          {activeTab === 'reporting' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-violet-500" />
                  Reporting financier
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Exportez les données des factures pour vos rapports et analyses.
                </p>
                <Button variant="primary" onClick={exportCsv} className="flex items-center gap-2">
                  <Download size={18} />
                  Exporter en CSV
                </Button>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Prévisions budgétaires</h3>
                <p className="text-sm text-muted-foreground">
                  Basé sur la tendance des 6 derniers mois : moyenne mensuelle des dépenses ={' '}
                  {byMonth.length
                    ? (
                        byMonth.reduce((s, m) => s + m.total, 0) / byMonth.length
                      ).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
                    : 0}{' '}
                  GNF
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Pour des prévisions avancées, intégrez les budgets et objectifs dans les paramètres.
                </p>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
