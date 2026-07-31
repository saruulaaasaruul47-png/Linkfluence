import { LoaderCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

const variants = {
  primary: 'bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 shadow-[0_10px_30px_rgba(13,13,13,.16)]',
  pink: 'bg-pink text-ink hover:bg-[#ff92c8] shadow-[0_10px_32px_rgba(255,118,189,.25)]',
  mint: 'bg-mint text-ink hover:bg-[#cdfadd]',
  secondary: 'bg-[var(--surface-2)] text-[var(--foreground)] hover:brightness-[.97]',
  outline: 'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)]',
  ghost: 'bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)]',
  danger: 'bg-[#df3f65] text-white hover:bg-[#c72e53]',
}

const sizes = {
  sm: 'min-h-9 px-3 text-[11px]',
  md: 'min-h-10 px-4 text-xs',
  lg: 'min-h-11 px-5 text-[13px]',
}

export function Button({ className, variant = 'primary', size = 'md', loading = false, children, disabled, type = 'button', ...props }) {
  return (
    <button type={type} disabled={disabled || loading} className={cn('inline-flex items-center justify-center gap-1.5 rounded-full font-semibold tracking-[-.005em] transition-all duration-200 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)} {...props}>
      {loading && <LoaderCircle size={14} className="animate-spin" />}
      {children}
    </button>
  )
}
