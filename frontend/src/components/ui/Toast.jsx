import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { ToastContext } from './toast-context'

const icons = { success: CheckCircle2, error: XCircle, info: Info }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const toast = useCallback((message, options = {}) => { const id = Date.now() + Math.random(); setToasts((current) => [...current, { id, message, type: options.type || 'info' }]); window.setTimeout(() => dismiss(id), options.duration || 3200) }, [dismiss])
  const value = useMemo(() => ({ toast }), [toast])
  return <ToastContext.Provider value={value}>{children}<div className="fixed bottom-4 right-4 z-[120] flex w-[min(22rem,calc(100%-2rem))] flex-col gap-2"><AnimatePresence>{toasts.map((item) => { const Icon = icons[item.type] || Info; return <motion.div key={item.id} initial={{ opacity: 0, x: 30, scale: .96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: .97 }} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink px-4 py-3 text-sm text-white shadow-float"><Icon size={18} className={item.type === 'success' ? 'text-mint' : item.type === 'error' ? 'text-pink' : 'text-white'} /><span className="flex-1">{item.message}</span><button aria-label="Dismiss" onClick={() => dismiss(item.id)}><X size={15} /></button></motion.div> })}</AnimatePresence></div></ToastContext.Provider>
}
