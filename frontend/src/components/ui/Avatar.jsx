import { cn } from '../../lib/cn'

export function Avatar({ src, alt = '', fallback = 'IH', size = 'md', status, className }) {
  const sizes = { sm: 'size-8 text-[10px]', md: 'size-11 text-xs', lg: 'size-16 text-sm', xl: 'size-24 text-lg' }
  return <span className={cn('relative inline-grid shrink-0 place-items-center overflow-visible rounded-full bg-mint font-bold text-ink', sizes[size], className)}>
    {src ? <img src={src} alt={alt} className="size-full rounded-full object-cover" /> : fallback}
    {status && <i className={cn('absolute bottom-0 right-0 size-3 rounded-full border-2 border-white', status === 'online' ? 'bg-[#42c97b]' : 'bg-[#aaa]')} />}
  </span>
}
