import { LockKeyhole } from 'lucide-react'
import { Badge } from './Badge'

export function FeatureUnavailable({
  title = 'Preview only',
  description = 'This action needs a secure backend connection before it can change real data.',
  compact = false,
}) {
  return <div role="note" className={`flex items-start gap-3 rounded-2xl border border-pink/15 bg-pink/[.04] ${compact ? 'p-3' : 'p-4'}`}>
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-pink/10 text-pink"><LockKeyhole size={14} /></span>
    <span className="min-w-0">
      <span className="flex flex-wrap items-center gap-2"><strong className="text-xs">{title}</strong><Badge variant="pink">Unavailable</Badge></span>
      <span className="mt-1 block text-[11px] leading-5 text-white/42">{description}</span>
    </span>
  </div>
}
