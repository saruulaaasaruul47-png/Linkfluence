import { motion } from 'motion/react'
import { ArrowRight, Building2, Compass, Sparkles, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { Badge } from '../components/ui'
import { LanguageSwitcher } from '../components/navigation/LanguageSwitcher'

const choices = [
  { title: 'Create a Creator Channel', copy: 'Showcase your work, audience and rates. Get discovered by the right brands.', icon: UserRound, accent: 'pink', to: '/onboarding/creator' },
  { title: 'Create a Business Channel', copy: 'Build your organization profile and prepare to brief standout creators.', icon: Building2, accent: 'mint', to: '/onboarding/business' },
  { title: 'Explore the platform first', copy: 'Take a look around. You can create either channel whenever you are ready.', icon: Compass, accent: 'neutral', to: '/discover' },
]

const cardStyles = {
  pink: {
    icon: 'bg-pink text-black',
    hover: 'hover:border-pink/45',
    glow: 'bg-pink/15',
    arrow: 'group-hover:border-pink group-hover:bg-pink group-hover:text-black',
  },
  mint: {
    icon: 'bg-mint text-black',
    hover: 'hover:border-mint/40',
    glow: 'bg-mint/15',
    arrow: 'group-hover:border-mint group-hover:bg-mint group-hover:text-black',
  },
  neutral: {
    icon: 'bg-white text-black',
    hover: 'hover:border-white/35',
    glow: 'bg-white/10',
    arrow: 'group-hover:border-white group-hover:bg-white group-hover:text-black',
  },
}

export default function WelcomePage() {
  const navigate = useNavigate()

  return <main className="relative min-h-screen overflow-hidden bg-ink px-5 py-7 text-white md:px-10 md:py-9">
    <div className="soft-glow -left-20 top-20 size-96 bg-pink/15" />
    <div className="soft-glow -right-20 bottom-0 size-96 bg-mint/10" />
    <header className="relative z-10 flex items-center justify-between">
      <BrandLogo className="text-white" />
      <div className="flex items-center gap-2"><Badge variant="outline" className="border-white/20 text-white">Account ready</Badge><LanguageSwitcher compact /></div>
    </header>

    <section className="relative z-10 mx-auto max-w-7xl pb-12 pt-20 md:pt-28">
      <p className="eyebrow text-white/40">Welcome to your new network</p>
      <h1 className="display-xl mt-5 max-w-5xl uppercase">WHAT WILL YOU<br/><span className="editorial text-pink">build first?</span></h1>
      <p className="mt-7 max-w-xl text-sm leading-6 text-white/55">Your account is ready. Create the channel that fits what you want to do today — you can add the other one later.</p>

      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {choices.map((choice, index) => {
          const Icon = choice.icon
          const style = cardStyles[choice.accent]

          return <motion.button
            key={choice.title}
            type="button"
            onClick={() => navigate(choice.to)}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: .12 + index * .09 }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: .985 }}
            className={`group relative isolate min-h-[16.5rem] overflow-hidden rounded-[1.6rem] border border-white/12 bg-[#171717]/82 p-6 text-left text-white shadow-[0_24px_65px_rgba(0,0,0,.18)] backdrop-blur-xl transition duration-300 ${style.hover}`}
          >
            <span className={`pointer-events-none absolute -right-16 -top-20 size-48 rounded-full blur-3xl opacity-0 transition duration-500 group-hover:opacity-100 ${style.glow}`} />
            <div className="relative flex h-full flex-col">
              <span className={`grid size-11 place-items-center rounded-2xl ${style.icon}`}><Icon size={19} /></span>

              <div className="mt-8">
                <h2 className="max-w-sm text-[1.55rem] font-bold leading-[1.02] tracking-[-.05em]">{choice.title}</h2>
                <p className="mt-3 max-w-sm text-[13px] leading-5 text-white/45">{choice.copy}</p>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-white/[.08] pt-4">
                <span className="text-[10px] font-bold uppercase tracking-[.14em] text-white/65">Choose option</span>
                <span className={`grid size-9 place-items-center rounded-full border border-white/15 transition duration-300 ${style.arrow}`}>
                  <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </motion.button>
        })}
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-white/30"><Sparkles size={14} className="text-mint" /> You can manage multiple channels from one account later.</div>
    </section>
  </main>
}
