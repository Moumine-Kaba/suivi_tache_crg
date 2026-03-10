import { Calendar, Flag, User, Archive } from 'lucide-react'
import { cn } from '../../utils/cn'

export default function ArchivedTaskCard({ task }) {
  const priorityStyles = {
    haute: 'bg-error-soft text-error',
    moyenne: 'bg-primary/10 text-primary',
    basse: 'bg-success-soft text-success',
  }
  const priorityKey = String(task.priority || '').toLowerCase()
  const priorityLabel = task.priority || 'N/A'

  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{task.title}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{task.description}</p>
        </div>
        <span className="px-2 py-1 text-[11px] rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
          <Archive size={12} /> Archivée
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground mt-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          <span>Créée : {task.createdAt}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          <span>Complétée : {task.completedAt || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Flag size={14} />
          <span>Priorité :</span>
          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', priorityStyles[priorityKey] || 'bg-muted text-muted-foreground')}>
            {priorityLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <User size={14} />
          <span>{task.assigneeName || 'Employé'}</span>
        </div>
      </div>

      {(task.estimatedDuration || task.actualDuration) && (
        <div className="mt-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Durée</span>{' '}
          {task.estimatedDuration ? `Estimée: ${task.estimatedDuration}` : ''}{' '}
          {task.actualDuration ? ` | Réelle: ${task.actualDuration}` : ''}
        </div>
      )}
    </div>
  )
}

