import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useId, useRef } from 'react'

export function Dialog({ open, onClose, title, description, children, dark = false }) {
  const titleId = useId()
  const panelRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const previousOverflow = document.body.style.overflow
    const keydown = (event) => {
      if (event.key === 'Escape') onClose?.()
      if (event.key !== 'Tab') return
      const focusable = [...(panelRef.current?.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])]
      if (!focusable.length) {
        event.preventDefault()
        panelRef.current?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', keydown)
      document.body.style.overflow = previousOverflow
      previous?.focus?.()
    }
  }, [open, onClose])
  if (typeof document === 'undefined') return null
  return createPortal(<AnimatePresence>{open && <motion.div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
    <motion.div ref={panelRef} tabIndex={-1} data-theme={dark ? 'dark' : undefined} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[calc(100svh-2rem)] w-full max-w-lg overflow-y-auto rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-float outline-none" initial={{ opacity: 0, y: 24, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: .98 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><h2 id={titleId} className="heading-md">{title}</h2>{description && <p className="body-muted mt-2 text-sm">{description}</p>}</div><button aria-label="Close dialog" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-[var(--surface-2)]"><X size={18} /></button></div>
      <div className="mt-6">{children}</div>
    </motion.div>
  </motion.div>}</AnimatePresence>, document.body)
}
