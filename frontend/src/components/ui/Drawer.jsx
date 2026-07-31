import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

export function Drawer({ open, onClose, title, children, dark = true }) {
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
  return createPortal(<AnimatePresence>{open && <motion.div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
    <motion.aside ref={panelRef} tabIndex={-1} data-theme={dark ? 'dark' : undefined} role="dialog" aria-modal="true" aria-labelledby={titleId} className="ui-drawer-panel absolute bottom-0 right-0 top-0 w-full max-w-md overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-float outline-none" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }} onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between"><h2 id={titleId} className="heading-md">{title}</h2><button aria-label="Close drawer" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-[var(--surface-2)]"><X size={18} /></button></div><div className="mt-6">{children}</div>
    </motion.aside>
  </motion.div>}</AnimatePresence>, document.body)
}
