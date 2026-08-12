import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Search, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { SectionHeader } from './MarketplaceLayout'

export function HeroSearch({ onSearch, suggestions = [], trending = [], image }) {
  const [query, setQuery] = useState('')
  const submit = (event) => {
    event.preventDefault()
    if (query.trim()) onSearch(query.trim())
  }

  return (
    <section className="discover-hero relative overflow-hidden border-b border-white/10">
      <div className="soft-glow left-[12%] top-16 size-72 bg-pink/8" />
      <div className="grid min-h-[36rem] items-stretch lg:grid-cols-2">
        <div className="discover-hero-copy flex flex-col justify-center px-5 py-14 lg:py-16">
          <p className="eyebrow text-white/35">Curated opportunities · Fresh perspectives</p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 max-w-3xl text-[clamp(3.4rem,6.4vw,6.8rem)] font-extrabold uppercase leading-[.78] tracking-[-.085em]"
          >
            FIND THE
            <br />
            <span className="editorial text-[.6em] text-pink">right energy.</span>
          </motion.h1>
          <p className="mt-6 max-w-lg text-sm leading-6 text-white/45">
            Discover creators, businesses and campaigns selected for fit—not feed mechanics.
          </p>

          <form
            onSubmit={submit}
            className="mt-8 flex w-full max-w-lg items-center gap-3 rounded-xl border border-white/15 bg-white/[.055] p-1.5 pl-4 shadow-[0_16px_45px_rgba(0,0,0,.2)] backdrop-blur-xl transition focus-within:border-pink/55 focus-within:bg-white/[.075]"
          >
            <Search size={17} className="shrink-0 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              list="hero-suggestions"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-white/25"
              placeholder="Search creators, campaigns or businesses"
            />
            <datalist id="hero-suggestions">
              {suggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <button
              aria-label="Search"
              className="grid size-10 shrink-0 place-items-center rounded-lg bg-pink text-black transition hover:-translate-y-0.5 hover:bg-[#ff92c8]"
            >
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[9px] uppercase tracking-[.13em] text-white/25">
              Trending
            </span>
            {trending.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term)
                  onSearch(term)
                }}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px] uppercase tracking-[.09em] text-white/40 transition hover:border-white/25 hover:bg-white/[.045] hover:text-white"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: .55, delay: .08 }}
          className="relative min-h-[24rem] overflow-hidden border-t border-white/10 bg-[#111] lg:min-h-full lg:border-l lg:border-t-0"
        >
          {image ? <img
            src={image}
            alt="Featured registered creator"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover saturate-[.72] brightness-[.48]"
          /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(255,118,189,.18),transparent_34%),radial-gradient(circle_at_70%_65%,rgba(184,245,209,.13),transparent_30%)]" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/15" />
        </motion.div>
      </div>
    </section>
  )
}

export function HorizontalCarousel({ children, label = 'Content carousel' }) {
  const ref = useRef(null)
  const move = (direction) =>
    ref.current?.scrollBy({
      left: direction * Math.min(ref.current.clientWidth * .82, 440),
      behavior: 'smooth',
    })
  return (
    <div className="relative">
      <div
        ref={ref}
        aria-label={label}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&>*]:min-w-[min(88vw,390px)] [&>*]:snap-start xl:[&>*]:min-w-[390px]"
      >
        {children}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => move(-1)}
          aria-label="Previous"
          className="grid size-11 place-items-center rounded-full border border-white/15 hover:bg-white/[.06]"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          onClick={() => move(1)}
          aria-label="Next"
          className="grid size-11 place-items-center rounded-full border border-white/15 hover:bg-white/[.06]"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

export function FeaturedSection({ eyebrow, title, link, onLink, children }) {
  return (
    <section>
      <SectionHeader eyebrow={eyebrow} title={title} link={link} onLink={onLink} />
      <div className="discover-card-grid">{children}</div>
    </section>
  )
}

export function TrendingSection({ children, onLink }) {
  return (
    <section>
      <SectionHeader
        eyebrow="Work that worked"
        title="Trending showcase"
        link="See showcase"
        onLink={onLink}
      />
      <div className="discover-showcase-grid">{children}</div>
    </section>
  )
}

export function RecommendationSection({ children }) {
  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/[.025] p-5 sm:p-7">
      <div className="mb-7 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-mint text-black">
          <Sparkles size={16} />
        </span>
        <div>
          <p className="eyebrow text-white/30">Based on your saves</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-.05em]">Recommended for you</h2>
        </div>
      </div>
      <div className="discover-card-grid">{children}</div>
    </section>
  )
}
