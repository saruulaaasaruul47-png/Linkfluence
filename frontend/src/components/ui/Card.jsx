import { cn } from '../../lib/cn'

export function Card({ children, className, interactive = false }) {
  return <div className={cn('rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5', interactive && 'transition duration-300 hover:-translate-y-1 hover:shadow-float', className)}>{children}</div>
}
