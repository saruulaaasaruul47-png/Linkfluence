import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../BrandLogo'
import { Badge, Button } from '../ui'

export function OnboardingLayout({ type, steps, current, maxStep = current, onBack, onStepChange, children }) {
  const progress = ((current + 1) / steps.length) * 100
  return <main className="onboarding-shell">
    <aside className="onboarding-sidebar">
      <div><BrandLogo to="/welcome" className="text-white" /><Badge variant={type === 'Creator' ? 'pink' : 'mint'} className="ml-3">{type}</Badge></div>
      <div className="my-12"><p className="eyebrow text-white/35">Channel setup</p><h1 className="mt-4 text-4xl font-bold leading-[.9] tracking-[-.06em]">Build your<br/><span className="editorial text-pink">presence.</span></h1></div>
      <ol className="space-y-1">{steps.map((step, index) => { const locked = index > maxStep; return <li key={step}><button type="button" disabled={locked} aria-current={index === current ? 'step' : undefined} aria-label={locked ? `${step} — complete earlier steps first` : step} onClick={() => onStepChange(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-45 ${locked ? '' : 'hover:bg-white/[.07] hover:text-white'} ${index === current ? 'bg-white/10 text-white' : index < current ? 'text-white/70' : 'text-white/40'}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full border text-[10px] ${index < current ? 'border-mint bg-mint text-black' : index === current ? 'border-pink text-pink' : 'border-white/20'}`}>{index < current ? <Check size={12} /> : index + 1}</span><span>{step}</span></button></li> })}</ol>
      <div className="mt-auto pt-8"><div className="h-1 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-pink" animate={{ width: `${progress}%` }} /></div><p className="mt-3 text-[10px] uppercase tracking-[.15em] text-white/35">{Math.round(progress)}% complete · auto-saved locally</p></div>
    </aside>
    <section className="onboarding-main">
      <header className="mb-10 flex items-center justify-between"><button onClick={onBack} disabled={current === 0} className="inline-flex items-center gap-2 text-xs font-bold disabled:opacity-30"><ChevronLeft size={16} /> Previous</button><Link to="/welcome" className="inline-flex items-center gap-2 text-xs text-[var(--subtle)]"><ArrowLeft size={14} /> Save & exit</Link></header>
      <div className="mx-auto max-w-4xl"><p className="eyebrow text-[var(--subtle)]">Step {current + 1} of {steps.length}</p><AnimatePresence mode="wait"><motion.div key={current} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .3 }}>{children}</motion.div></AnimatePresence></div>
    </section>
  </main>
}

export function StepHeading({ title, script, copy }) { return <div className="mb-9"><h2 className="display-lg mt-3 uppercase">{title} <span className="onboarding-script editorial text-pink">{script}</span></h2><p className="body-muted mt-5 max-w-xl text-sm">{copy}</p></div> }
export function StepActions({ current, onNext, onBack, finish = false, loading = false }) { return <div className="onboarding-actions mt-10 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-6"><Button className="onboarding-back-button" variant="ghost" onClick={onBack} disabled={current === 0}>Back</Button><Button className="onboarding-next-button" variant={finish ? 'pink' : 'primary'} size="lg" loading={loading} onClick={onNext}>{finish ? 'Finish channel' : 'Continue'} {!loading && !finish && '→'}</Button></div> }

export function ReviewList({ items }) { return <div className="grid gap-3 md:grid-cols-2">{items.map(([label, value]) => <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><p className="eyebrow text-[var(--subtle)]">{label}</p><p className="mt-2 text-sm font-semibold">{value || 'Not provided'}</p></div>)}</div> }
