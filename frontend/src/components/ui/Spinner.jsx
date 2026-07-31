import { LoaderCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Spinner({ size = 22, className, label = 'Loading' }) { return <span role="status" className={cn('inline-flex items-center gap-2 text-sm text-[var(--subtle)]', className)}><LoaderCircle size={size} className="animate-spin text-pink" /><span className="sr-only">{label}</span></span> }
