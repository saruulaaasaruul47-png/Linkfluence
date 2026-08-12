import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Edit3, Plus, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Dialog, Input, Select, Textarea } from '../ui'

const TASK_COLUMNS = [
  { value: 'TODO', label: 'To do', tone: 'outline' },
  { value: 'IN_PROGRESS', label: 'In progress', tone: 'pink' },
  { value: 'REVIEW', label: 'Review', tone: 'outline' },
  { value: 'DONE', label: 'Done', tone: 'mint' },
]

const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const initialDraft = {
  title: '', description: '', assigneeId: '', dueAt: '', status: 'TODO', priority: 'MEDIUM',
}

function dateInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function priorityVariant(priority) {
  if (priority === 'URGENT') return 'pink'
  if (priority === 'HIGH') return 'outline'
  return 'outline'
}

export function WorkspaceTaskBoard({
  tasks = [],
  participants = [],
  disabled = false,
  busyTaskId = '',
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [draft, setDraft] = useState(initialDraft)
  const [formError, setFormError] = useState('')

  const grouped = useMemo(() => Object.fromEntries(TASK_COLUMNS.map((column) => [
    column.value,
    tasks
      .filter((task) => (task.status || (task.done ? 'DONE' : 'TODO')) === column.value)
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)),
  ])), [tasks])

  const participantOptions = [
    { value: '', label: 'Unassigned · both participants' },
    ...participants.filter((item) => item?.id).map((item) => ({ value: item.id, label: `${item.name} · ${item.role}` })),
  ]

  const openCreate = () => {
    setEditingTask(null)
    setDraft(initialDraft)
    setFormError('')
    setDialogOpen(true)
  }
  const openEdit = (task) => {
    setEditingTask(task)
    setDraft({
      title: task.title || '',
      description: task.description || '',
      assigneeId: task.assigneeId || task.assignee?.id || '',
      dueAt: dateInputValue(task.dueAt || task.due),
      status: task.status || (task.done ? 'DONE' : 'TODO'),
      priority: task.priority || 'MEDIUM',
    })
    setFormError('')
    setDialogOpen(true)
  }
  const closeDialog = () => {
    setDialogOpen(false)
    setEditingTask(null)
    setFormError('')
  }
  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      setFormError('Task title is required.')
      return
    }
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      assigneeId: draft.assigneeId || null,
      dueAt: draft.dueAt ? new Date(`${draft.dueAt}T12:00:00.000Z`).toISOString() : null,
      status: draft.status,
      priority: draft.priority,
    }
    try {
      if (editingTask) await onUpdate(editingTask, { ...payload, version: editingTask.version })
      else await onCreate(payload)
      closeDialog()
    } catch (error) {
      setFormError(error?.message || 'Task could not be saved.')
    }
  }
  const move = (task, direction) => {
    const currentIndex = TASK_COLUMNS.findIndex((column) => column.value === task.status)
    const next = TASK_COLUMNS[currentIndex + direction]
    if (next) Promise.resolve(onUpdate(task, { status: next.value, version: task.version })).catch(() => {})
  }
  const remove = (task) => {
    if (window.confirm(`Delete “${task.title}”? The audit entry will remain in the timeline.`)) {
      Promise.resolve(onDelete(task)).catch(() => {})
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-white/38">Move work through four clear production stages. Changes are shared with both channels.</p>
        {!disabled && <Button size="sm" variant="pink" onClick={openCreate}><Plus size={14} />New task</Button>}
      </div>
      <div aria-label="Workspace task board" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TASK_COLUMNS.map((column, columnIndex) => (
          <section key={column.value} data-task-status={column.value} className="min-w-0 rounded-2xl border border-white/[.09] bg-black/15 p-3">
            <header className="mb-3 flex items-center justify-between gap-2">
              <Badge variant={column.tone}>{column.label}</Badge>
              <span className="text-[10px] font-bold text-white/30">{grouped[column.value].length}</span>
            </header>
            <div className="space-y-2">
              {grouped[column.value].map((task) => (
                <article key={task.id} className="rounded-xl border border-white/[.08] bg-white/[.035] p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="min-w-0 break-words text-xs leading-5">{task.title}</strong>
                    <Badge variant={priorityVariant(task.priority)}>{String(task.priority || 'MEDIUM').toLowerCase()}</Badge>
                  </div>
                  {task.description && <p className="mt-2 line-clamp-3 text-[11px] leading-4 text-white/38">{task.description}</p>}
                  <div className="mt-3 space-y-1.5 text-[10px] text-white/35">
                    <span className="flex items-center gap-1.5"><UserRound size={11} />{task.assignee?.name || 'Both participants'}</span>
                    {(task.dueAt || task.due) && <span className="flex items-center gap-1.5"><CalendarDays size={11} />{new Date(task.dueAt || task.due).toLocaleDateString()}</span>}
                  </div>
                  {!disabled && <div className="mt-3 flex items-center gap-1 border-t border-white/[.07] pt-2">
                    <button type="button" disabled={columnIndex === 0 || busyTaskId === task.id} onClick={() => move(task, -1)} aria-label={`Move ${task.title} backward`} className="grid size-7 place-items-center rounded-full text-white/35 hover:bg-white/[.07] hover:text-white disabled:opacity-20"><ArrowLeft size={12} /></button>
                    <button type="button" disabled={columnIndex === TASK_COLUMNS.length - 1 || busyTaskId === task.id} onClick={() => move(task, 1)} aria-label={`Move ${task.title} forward`} className="grid size-7 place-items-center rounded-full text-white/35 hover:bg-white/[.07] hover:text-white disabled:opacity-20"><ArrowRight size={12} /></button>
                    <span className="flex-1" />
                    <button type="button" disabled={busyTaskId === task.id} onClick={() => openEdit(task)} aria-label={`Edit ${task.title}`} className="grid size-7 place-items-center rounded-full text-white/35 hover:bg-white/[.07] hover:text-white"><Edit3 size={12} /></button>
                    <button type="button" disabled={busyTaskId === task.id} onClick={() => remove(task)} aria-label={`Delete ${task.title}`} className="grid size-7 place-items-center rounded-full text-white/35 hover:bg-red-400/10 hover:text-red-200"><Trash2 size={12} /></button>
                  </div>}
                </article>
              ))}
              {!grouped[column.value].length && <div className="grid min-h-24 place-items-center rounded-xl border border-dashed border-white/10 px-3 text-center text-[10px] text-white/25">No {column.label.toLowerCase()} tasks</div>}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={dialogOpen} onClose={closeDialog} title={editingTask ? 'Edit task' : 'Create task'} description="Assign production work to either workspace participant." dark>
        <form className="space-y-4" onSubmit={submit}>
          <Input autoFocus label="Task title" maxLength={160} value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} />
          <Textarea label="Description" rows={4} maxLength={2000} value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Status" value={draft.status} options={TASK_COLUMNS} onChange={(event) => updateDraft('status', event.target.value)} />
            <Select label="Priority" value={draft.priority} options={priorities} onChange={(event) => updateDraft('priority', event.target.value)} />
            <Select label="Assignee" value={draft.assigneeId} options={participantOptions} onChange={(event) => updateDraft('assigneeId', event.target.value)} />
            <Input type="date" label="Due date" value={draft.dueAt} onChange={(event) => updateDraft('dueAt', event.target.value)} />
          </div>
          {formError && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-300/[.06] p-3 text-xs text-red-200">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button type="submit" variant="pink">{editingTask ? 'Save changes' : 'Create task'}</Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
