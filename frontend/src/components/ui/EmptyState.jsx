import { Sparkles } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({ title = 'Nothing here yet', description = 'Your new items will show up here.', action = 'Create new', onAction }) {
  return <div className="grid min-h-64 place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] p-8 text-center"><div><span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-pink-soft text-[#7d1f50]"><Sparkles size={20} /></span><h3 className="heading-md">{title}</h3><p className="body-muted mx-auto mt-2 max-w-sm text-sm">{description}</p>{onAction && <Button variant="outline" className="mt-5" onClick={onAction}>{action}</Button>}</div></div>
}
