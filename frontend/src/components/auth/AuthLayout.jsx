import { motion } from 'motion/react'
import { ArrowUpRight, Sparkles, TrendingUp, Users } from 'lucide-react'
import { BrandLogo } from '../BrandLogo'
import BlurText from '../../pages/landingpage/components/BlurText'

export function AuthLayout({ eyebrow, title, scriptWord, copy, children, footer }) {
  return <main className="auth-shell">
    <section className="auth-visual">
      <div className="soft-glow -left-24 top-1/4 size-80 bg-pink/8" />
      <div className="soft-glow -right-20 bottom-0 size-72 bg-mint/5" />
      <BrandLogo className="relative z-10 text-white" />
      <div className="relative z-10 max-w-3xl py-12">
        <p className="eyebrow mb-5 text-white/45">{eyebrow}</p>
        <h1 className="display-xl uppercase"><BlurText>{title}</BlurText> <span className="auth-script editorial block text-pink">{scriptWord}</span></h1>
        <p className="mt-7 max-w-lg text-sm leading-6 text-white/55">{copy}</p>
      </div>
      <div className="relative z-10 h-40">
        <motion.div className="floating-preview left-0 top-4 w-52 p-4" animate={{ y: [0, -8, 0], rotate: [-2, 0, -2] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}>
          <div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-full bg-pink text-black"><Users size={16} /></span><ArrowUpRight size={15} className="text-white/45" /></div><p className="mt-5 text-2xl font-bold tracking-[-.05em]">2.4K+</p><p className="mt-1 text-[10px] uppercase tracking-[.16em] text-white/45">Curated creators</p>
        </motion.div>
        <motion.div className="floating-preview bottom-1 right-0 w-48 p-4" animate={{ y: [0, 7, 0], rotate: [2, 0, 2] }} transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}>
          <div className="flex items-center gap-2 text-mint"><TrendingUp size={15} /><span className="text-xs font-bold">+214%</span></div><div className="mt-4 flex h-10 items-end gap-1">{[30,55,42,75,62,96].map((height, index) => <i key={index} className="flex-1 rounded-t-sm bg-mint/70" style={{ height: `${height}%` }} />)}</div>
        </motion.div>
        <motion.span className="absolute left-1/2 top-5 grid size-12 place-items-center rounded-full bg-mint text-black" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 16, ease: 'linear' }}><Sparkles size={18} /></motion.span>
      </div>
    </section>
    <section className="auth-form-side"><div className="auth-form-wrap">{children}{footer}</div></section>
  </main>
}
