import { useState } from 'react'
import { cn } from '../../lib/cn'

function fallbackLabel(value) {
  const words = String(value || 'IH').trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  return (words[0] || 'IH').slice(0, 2).toUpperCase()
}

export function Avatar({ src, alt = '', fallback = 'IH', size = 'md', status, story = false, className }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const sizes = { sm: 'size-8 text-[10px]', md: 'size-11 text-xs', lg: 'size-16 text-sm', xl: 'size-24 text-lg' }
  const showImage = Boolean(src && failedSrc !== src)
  return <span className={cn('relative inline-grid shrink-0 place-items-center overflow-visible rounded-full bg-mint font-bold text-ink', sizes[size], story && 'ring-2 ring-pink ring-offset-2 ring-offset-[#0b0b0b]', className)}>
    {showImage
      ? <img src={src} alt={alt} className="size-full rounded-full object-cover" onError={() => setFailedSrc(src)} />
      : <span aria-hidden={Boolean(alt)}>{fallbackLabel(fallback)}</span>}
    {status && <i className={cn('absolute bottom-0 right-0 size-3 rounded-full border-2 border-white', status === 'online' ? 'bg-[#42c97b]' : 'bg-[#aaa]')} />}
  </span>
}
