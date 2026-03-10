import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Circle, Building2, User, TrendingUp } from 'lucide-react'
import { useEffect } from 'react'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import useAuthStore from '../store/authStore'
import useTasksStore from '../store/tasksStore'

export default function Calendar() {
  const { user } = useAuthStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const { tasks, loadTasks } = useTasksStore()

  // Charger les tâches une seule fois (ou utiliser le pré-chargement global de App.jsx)
  useEffect(() => {
    if (!user) return

    loadTasks({}).catch((error) => {
      // Ignorer le cas où l'utilisateur n'est pas encore authentifié côté Supabase
      if (error?.message === 'Utilisateur non authentifié') return
      console.error('Erreur lors du chargement des tâches pour le calendrier:', error)
    })
  }, [user, loadTasks])

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Jours du mois précédent
    const prevMonth = new Date(year, month - 1, 0)
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonth.getDate() - i,
        isCurrentMonth: false,
        fullDate: new Date(year, month - 1, prevMonth.getDate() - i),
      })
    }

    // Jours du mois actuel
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        isCurrentMonth: true,
        fullDate: new Date(year, month, i),
      })
    }

    // Jours du mois suivant pour compléter la grille
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        isCurrentMonth: false,
        fullDate: new Date(year, month + 1, i),
      })
    }

    return days
  }

  const getTasksForDate = (date) => {
    return tasks.filter((task) => {
      const rawDate = task.due_date || task.dueDate
      if (!rawDate) return false
      const taskDate = new Date(rawDate)
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const handleDateClick = (date) => {
    const dayTasks = getTasksForDate(date)
    if (dayTasks.length > 0) {
      setSelectedTask(dayTasks[0])
      setShowModal(true)
    }
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const monthNames = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ]

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  const days = getDaysInMonth(currentDate)
  const today = new Date()

  const getStatusColor = (status) => {
    const colors = {
      planifie: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      en_cours: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      termine: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      en_retard: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const todayTasks = tasks.filter((task) => {
    const rawDate = task.due_date || task.dueDate
    if (!rawDate) return false
    const taskDate = new Date(rawDate)
    const today = new Date()
    return (
      taskDate.getDate() === today.getDate() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getFullYear() === today.getFullYear()
    )
  })

  const upcomingTasks = tasks.filter((task) => {
    const rawDate = task.due_date || task.dueDate
    if (!rawDate) return false
    const taskDate = new Date(rawDate)
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)
    return taskDate > today && taskDate <= nextWeek
  })

  return (
    <div className="space-y-4 p-4 w-full max-w-full overflow-x-hidden">
      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-full">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 p-3 w-full max-w-full">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-0.5">Aujourd'hui</p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{todayTasks.length}</p>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
              <CalendarIcon className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700 p-3 w-full max-w-full">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-0.5">Cette semaine</p>
              <p className="text-xl font-bold text-green-900 dark:text-green-100">{upcomingTasks.length}</p>
            </div>
            <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0">
              <TrendingUp className="text-green-600 dark:text-green-400" size={18} />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700 p-3 w-full max-w-full">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-0.5">Total tâches</p>
              <p className="text-xl font-bold text-orange-900 dark:text-orange-100">{tasks.length}</p>
            </div>
            <div className="p-2 bg-orange-500/20 rounded-lg flex-shrink-0">
              <Clock className="text-orange-600 dark:text-orange-400" size={18} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden w-full max-w-full">
        {/* Header du calendrier */}
        <div className="bg-gradient-to-r from-crg-primary/10 to-crg-secondary/10 dark:from-crg-primary/20 dark:to-crg-secondary/20 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 w-full max-w-full overflow-x-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <button
              onClick={previousMonth}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
            >
              <ChevronLeft size={18} className="text-gray-700 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center min-w-0">
              <CalendarIcon size={20} className="text-crg-primary dark:text-crg-secondary flex-shrink-0 sm:w-6 sm:h-6" />
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
            </div>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
            >
              <ChevronRight size={18} className="text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Grille du calendrier */}
        <div className="p-2 sm:p-3 lg:p-4 w-full max-w-full overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-0 w-full">
            {/* En-têtes des jours */}
            {dayNames.map((day, idx) => (
              <div
                key={day}
                className={`text-center font-bold text-xs uppercase tracking-wider py-2 sm:py-3 truncate ${
                  idx === 0 || idx === 6
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {day}
              </div>
            ))}

            {/* Jours du mois */}
            {days.map((day, index) => {
              const dayTasks = getTasksForDate(day.fullDate)
              const isToday =
                day.isCurrentMonth &&
                day.fullDate.getDate() === today.getDate() &&
                day.fullDate.getMonth() === today.getMonth() &&
                day.fullDate.getFullYear() === today.getFullYear()

              const statusCounts = {
                planifie: dayTasks.filter(t => t.status === 'planifie').length,
                en_cours: dayTasks.filter(t => t.status === 'en_cours').length,
                termine: dayTasks.filter(t => t.status === 'termine').length,
                en_retard: dayTasks.filter(t => t.status === 'en_retard').length,
              }

              return (
                <div
                  key={index}
                  onClick={() => day.isCurrentMonth && dayTasks.length > 0 && handleDateClick(day.fullDate)}
                  className={`
                    min-h-[80px] sm:min-h-[100px] lg:min-h-[120px] p-1.5 sm:p-2 border-2 rounded-lg transition-all duration-200 w-full max-w-full overflow-hidden
                    ${day.isCurrentMonth 
                      ? isToday
                        ? 'bg-gradient-to-br from-crg-primary/10 to-crg-secondary/10 dark:from-crg-primary/20 dark:to-crg-secondary/20 border-crg-primary dark:border-crg-secondary shadow-md'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-crg-primary/50 dark:hover:border-crg-secondary/50'
                      : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 opacity-60'
                    }
                    ${day.isCurrentMonth && dayTasks.length > 0 ? 'cursor-pointer hover:shadow-md' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`text-sm font-bold ${
                        day.isCurrentMonth
                          ? isToday
                            ? 'text-crg-primary dark:text-crg-secondary text-lg'
                            : 'text-gray-900 dark:text-white'
                          : 'text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      {day.date}
                    </div>
                    {isToday && (
                      <div className="w-2 h-2 rounded-full bg-crg-primary dark:bg-crg-secondary animate-pulse"></div>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    {dayTasks.slice(0, 2).map((task) => {
                      const statusColors = {
                        planifie: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
                        en_cours: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
                        termine: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
                        en_retard: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
                      }
                      
                      return (
                        <div
                          key={task.id}
                          className={`text-xs px-2 py-1 rounded border ${statusColors[task.status] || statusColors.planifie} truncate font-medium`}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      )
                    })}
                    {dayTasks.length > 2 && (
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-0.5">
                        +{dayTasks.length - 2} autres
                      </div>
                    )}
                    {dayTasks.length === 0 && day.isCurrentMonth && (
                      <div className="text-xs text-gray-400 dark:text-gray-600 italic">Aucune tâche</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Modal détail tâche */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelectedTask(null)
        }}
        title={selectedTask?.title}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <div className="w-1 h-4 bg-crg-primary dark:bg-crg-secondary rounded-full"></div>
                Description
              </h3>
              <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                {selectedTask.description || 'Aucune description'}
              </p>
            </div>

            {/* Statut et Priorité */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-wider">
                  Statut
                </h3>
                <Badge
                  variant={
                    selectedTask.status === 'termine'
                      ? 'success'
                      : selectedTask.status === 'en_retard'
                      ? 'danger'
                      : selectedTask.status === 'en_cours'
                      ? 'primary'
                      : 'info'
                  }
                  size="lg"
                >
                  {selectedTask.status === 'planifie' ? 'Planifié' :
                   selectedTask.status === 'en_cours' ? 'En cours' :
                   selectedTask.status === 'termine' ? 'Terminé' :
                   selectedTask.status === 'en_retard' ? 'En retard' : selectedTask.status}
                </Badge>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                <h3 className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-2 uppercase tracking-wider">
                  Priorité
                </h3>
                <Badge
                  variant={
                    selectedTask.priority === 'haute'
                      ? 'danger'
                      : selectedTask.priority === 'moyenne'
                      ? 'warning'
                      : 'info'
                  }
                  size="lg"
                >
                  {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Direction et Assigné */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Building2 size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                    Service
                  </h3>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedTask.direction}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <User size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                    Assigné à
                  </h3>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedTask.assignedTo || 'Non assigné'}
                  </p>
                </div>
              </div>
            </div>

            {/* Date limite */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
              <h3 className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon size={14} />
                Date limite
              </h3>
              <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                {new Date(selectedTask.due_date || selectedTask.dueDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Progression */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Progression
                </h3>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedTask.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    selectedTask.progress === 100
                      ? 'bg-gradient-to-r from-green-400 to-green-600'
                      : selectedTask.progress >= 50
                      ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                      : 'bg-gradient-to-r from-orange-400 to-orange-600'
                  }`}
                  style={{ width: `${selectedTask.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

