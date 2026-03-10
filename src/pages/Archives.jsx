import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Archive, Filter, Search, Calendar, Flag, ChevronDown, Check } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { tasksService, usersService } from '../services/api'
import ArchivedTaskCard from '../components/archives/ArchivedTaskCard'
import useAuthStore from '../store/authStore'

export default function Archives() {
  const { user } = useAuthStore()
  const isDirector = ['directrice', 'admin'].includes((user?.role || '').toLowerCase())

  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [isEmployeeMenuOpen, setIsEmployeeMenuOpen] = useState(false)
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false)
  const employeeMenuRef = useRef(null)
  const priorityMenuRef = useRef(null)

  const [filters, setFilters] = useState({
    employeeId: '', // pas de sélection par défaut pour afficher tout ce qui est visible
    priority: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  })

  const getAssigneeId = (task) =>
    String(
      task?.assignedToId ??
      task?.assigned_to ??
      task?.assigneeId ??
      task?.assignee_id ??
      task?.assignedTo?.id ??
      task?.assignee?.id ??
      ''
    )

  const getAssigneeName = (task) =>
    String(
      task?.assigneeName ??
      task?.assigned_to_name ??
      task?.assignedTo?.name ??
      task?.assignee?.name ??
      ''
    ).trim()

  const normalize = (value) => String(value || '').trim().toLowerCase()

  const getDisplayEmployeeName = (employee) => {
    const candidates = [employee?.name, employee?.nom, employee?.email]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
    return candidates[0] || 'Employé'
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const data = await tasksService.listArchived()
      setTasks(data || [])

      if (isDirector) {
        let emp = []
        try {
          emp = await usersService.getAll()
          // En vue Directrice, afficher tous les profils "employé" sélectionnables.
          emp = (emp || []).filter((u) => {
            const role = String(u?.role || '').toLowerCase()
            const isEmployeeLike = role === 'employe' || role === 'chef' || role === 'lecture'
            return isEmployeeLike && String(u?.id || '').trim()
          })
        } catch (e) {
          console.warn('Impossible de charger les employés (fallback sur les archives):', e.message)
        }

        // Compléter la liste depuis les archives (utile si ID absent mais nom présent).
        const derivedFromArchives = Array.from(
          new Map(
            (data || [])
              .map((t) => {
                const assigneeId = getAssigneeId(t)
                const assigneeName = getAssigneeName(t)
                if (!assigneeId && !assigneeName) return null
                return [
                  assigneeId || `name:${normalize(assigneeName)}`,
                  {
                    id: assigneeId || `name:${normalize(assigneeName)}`,
                    name: assigneeName || 'Employé',
                    role: 'employe',
                  },
                ]
              })
              .filter(Boolean)
          ).values()
        )

        const baseUsers = (emp || []).map((u) => ({
          ...u,
          id: String(u?.id || ''),
        }))

        const baseNameSet = new Set(
          baseUsers
            .map((u) => normalize(getDisplayEmployeeName(u)))
            .filter(Boolean)
        )

        const extrasFromArchives = derivedFromArchives.filter((u) => {
          const nameKey = normalize(getDisplayEmployeeName(u))
          // Éviter les doublons de noms quand l'utilisateur existe déjà dans users.
          return nameKey && !baseNameSet.has(nameKey)
        })

        const merged = Array.from(
          new Map(
            [...baseUsers, ...extrasFromArchives].map((u) => [
              String(u?.id || `name:${normalize(u?.name || u?.email || '')}`),
              {
                ...u,
                id: String(u?.id || `name:${normalize(u?.name || u?.email || '')}`),
              },
            ])
          ).values()
        )

        const cleaned = merged
          .map((u) => ({
            ...u,
            id: String(u?.id || ''),
            displayName: getDisplayEmployeeName(u),
          }))
          .filter((u) => u.id)
          .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' }))

        setEmployees(cleaned)
      }
    } catch (e) {
      setError(e.message || 'Erreur lors du chargement des archives')
      if ((e.message || '').toLowerCase().includes('failed to fetch') || (e.message || '').toLowerCase().includes('connection_closed')) {
        setNotice('Impossible de joindre Supabase (connexion). Vérifie réseau/VITE_SUPABASE_URL puis réessaie.')
      }
    } finally {
      setLoading(false)
    }
  }, [isDirector])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onOutsideClick = (event) => {
      if (employeeMenuRef.current && !employeeMenuRef.current.contains(event.target)) {
        setIsEmployeeMenuOpen(false)
      }
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(event.target)) {
        setIsPriorityMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase()

    const visibleForUser = (t) => {
      if (isDirector) return true
      const assigneeId = getAssigneeId(t)
      const isIndividual = assigneeId && assigneeId === String(user?.id || '')
      const isService = !assigneeId && t.direction && t.direction === user?.direction
      return isIndividual || isService
    }

    return tasks
      .filter((t) => {
        if (!visibleForUser(t)) return false
        if (filters.employeeId) {
          const selected = employees.find((e) => String(e.id) === String(filters.employeeId))
          const taskAssigneeId = getAssigneeId(t)
          const taskAssigneeName = normalize(getAssigneeName(t))

          const selectedName = normalize(selected?.name || selected?.email)
          const selectedIsNameKey = String(filters.employeeId).startsWith('name:')
          const selectedNameFromKey = selectedIsNameKey
            ? String(filters.employeeId).replace('name:', '')
            : ''

          const matchById = taskAssigneeId && taskAssigneeId === String(filters.employeeId)
          const matchByName =
            taskAssigneeName &&
            (taskAssigneeName === selectedName || taskAssigneeName === selectedNameFromKey)

          if (!matchById && !matchByName) return false
        }
        if (filters.priority && (t.priority || '').toLowerCase() !== filters.priority.toLowerCase()) return false
        const completedDate = t.completedAt || t.createdAt
        if (filters.dateFrom && new Date(completedDate) < new Date(filters.dateFrom)) return false
        if (filters.dateTo && new Date(completedDate) > new Date(filters.dateTo)) return false
        if (term && !((t.title || '').toLowerCase().includes(term) || (t.description || '').toLowerCase().includes(term))) return false
        return true
      })
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
  }, [tasks, filters, employees, isDirector, user?.id, user?.direction])

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const groupedByEmployee = useMemo(() => {
    const map = new Map()
    filtered.forEach((t) => {
      const key = getAssigneeId(t) || 'unassigned'
      const label = t.assigneeName || 'Sans assigné'
      if (!map.has(key)) {
        map.set(key, { label, tasks: [] })
      }
      map.get(key).tasks.push(t)
    })
    return Array.from(map.entries()).map(([id, value]) => ({ id, ...value }))
  }, [filtered])

  const employeeOptions = useMemo(
    () =>
      (employees || [])
        .filter((e) => String(e?.id || '').trim())
        .map((e) => ({
          id: String(e.id),
          label: e.displayName || e.name || e.email || 'Employé',
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })),
    [employees]
  )

  const selectedEmployeeLabel =
    employeeOptions.find((e) => e.id === String(filters.employeeId))?.label || 'Tous les employés'

  const priorityOptions = [
    { value: '', label: 'Toutes priorités' },
    { value: 'haute', label: 'Haute' },
    { value: 'moyenne', label: 'Moyenne' },
    { value: 'basse', label: 'Basse' },
  ]

  const selectedPriorityLabel =
    priorityOptions.find((p) => p.value === String(filters.priority))?.label || 'Toutes priorités'

  return (
    <div className="min-h-screen p-3 sm:p-4 space-y-4 bg-background text-foreground">
      <Card className="p-4 sm:p-5 bg-card shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-crg-primary/10 text-crg-primary shadow-inner">
              <Archive size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Archives</p>
              <p className="text-lg sm:text-xl font-semibold leading-tight">Tâches archivées par employé</p>
              <p className="text-xs text-muted-foreground mt-1">Vue dédiée, filtres et dossiers par employé</p>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={load} className="gap-2 bg-crg-primary hover:bg-crg-dark">
              <Filter size={14} /> Rafraîchir
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4 shadow-md bg-card">
        {notice && (
          <div className="px-3 py-2 text-sm text-crg-primary bg-crg-primary/10 rounded-lg">
            {notice}
          </div>
        )}
        {error && (
          <div className="px-3 py-2 text-sm text-error bg-error-soft rounded-lg">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-2">
          <div className="lg:col-span-3 flex items-center gap-2 bg-muted/70 rounded-lg px-3 py-2.5 shadow-sm transition-colors">
            <Search size={16} className="text-muted-foreground" />
            <input
              placeholder="Rechercher une tâche..."
              className="bg-transparent flex-1 text-sm focus:outline-none placeholder:text-muted-foreground/70"
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
            />
          </div>
          <div ref={priorityMenuRef} className="relative flex items-center gap-2 bg-muted/70 rounded-lg px-3 py-2.5 shadow-sm transition-colors">
            <Flag size={16} className="text-muted-foreground" />
            <button
              type="button"
              className="flex-1 flex items-center justify-between gap-2 rounded-lg bg-card/80 px-3 py-2 text-sm text-foreground shadow-sm"
              onClick={() => setIsPriorityMenuOpen((v) => !v)}
            >
              <span className="truncate">{selectedPriorityLabel}</span>
              <ChevronDown size={16} className="text-muted-foreground" />
            </button>
            {isPriorityMenuOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl bg-card text-foreground shadow-xl overflow-y-auto">
                {priorityOptions.map((item) => (
                  <button
                    key={item.value || 'all'}
                    type="button"
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/70 transition-colors"
                    onClick={() => {
                      handleChange('priority', item.value)
                      setIsPriorityMenuOpen(false)
                    }}
                  >
                    <span>{item.label}</span>
                    {String(filters.priority) === String(item.value) && <Check size={14} className="text-crg-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 bg-muted/70 rounded-lg px-3 py-2.5 shadow-sm transition-colors">
            <Calendar size={16} className="text-muted-foreground" />
            <input
              type="date"
              className="bg-transparent flex-1 text-sm focus:outline-none"
              value={filters.dateFrom}
              onChange={(e) => handleChange('dateFrom', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-muted/70 rounded-lg px-3 py-2.5 shadow-sm transition-colors">
            <Calendar size={16} className="text-muted-foreground" />
            <input
              type="date"
              className="bg-transparent flex-1 text-sm focus:outline-none"
              value={filters.dateTo}
              onChange={(e) => handleChange('dateTo', e.target.value)}
            />
          </div>
        </div>

        {isDirector && (
          <div ref={employeeMenuRef} className="relative flex items-center gap-2 bg-muted/70 rounded-lg px-3 py-2.5 shadow-sm transition-colors">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Employé</span>
            <button
              type="button"
              className="flex-1 flex items-center justify-between gap-2 rounded-lg bg-card/80 px-3 py-2 text-sm text-foreground shadow-sm"
              onClick={() => setIsEmployeeMenuOpen((v) => !v)}
            >
              <span className="truncate">{selectedEmployeeLabel}</span>
              <ChevronDown size={16} className="text-muted-foreground" />
            </button>
            {isEmployeeMenuOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl bg-card text-foreground shadow-xl max-h-64 overflow-y-auto">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/70 transition-colors"
                  onClick={() => {
                    handleChange('employeeId', '')
                    setIsEmployeeMenuOpen(false)
                  }}
                >
                  <span>Tous les employés</span>
                  {!filters.employeeId && <Check size={14} className="text-crg-primary" />}
                </button>
                {employeeOptions.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/70 transition-colors"
                    onClick={() => {
                      handleChange('employeeId', emp.id)
                      setIsEmployeeMenuOpen(false)
                    }}
                  >
                    <span className="truncate">{emp.label}</span>
                    {String(filters.employeeId) === emp.id && <Check size={14} className="text-crg-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted/60 shadow-sm" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="p-6 text-center bg-muted/40 shadow-none">
          <p className="text-sm text-muted-foreground">Aucune tâche archivée trouvée.</p>
        </Card>
      )}

      {!loading && groupedByEmployee.length > 0 && (
        <div className="space-y-4">
          {groupedByEmployee.map((group) => (
            <Card
              key={group.id}
              className="p-4 space-y-3 bg-card shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-crg-primary/10 text-crg-primary flex items-center justify-center font-semibold shadow-inner">
                    {(group.label || '?').charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{group.label}</p>
                    <p className="text-xs text-muted-foreground">{group.tasks.length} tâche(s) archivée(s)</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-[11px] bg-crg-primary/10 text-crg-primary">
                  Dossier archivé
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.tasks.map((t) => (
                  <ArchivedTaskCard key={t.id} task={t} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

