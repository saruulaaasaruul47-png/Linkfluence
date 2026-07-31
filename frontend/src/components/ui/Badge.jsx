import { cn } from '../../lib/cn'

export function Badge({ children, variant = 'neutral', className }) {
  const variants = { neutral: 'bg-[var(--surface-2)] text-[var(--foreground)]', pink: 'bg-pink-soft text-[#7d1f50]', mint: 'bg-mint-soft text-[#155b31]', dark: 'bg-ink text-white', outline: 'border border-[var(--border)]' }
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em]', variants[variant], className)}>{children}</span>
}
