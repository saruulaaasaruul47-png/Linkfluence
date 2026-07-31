import { useState } from 'react'
import { Bookmark, Compass, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BrandLogo } from '../BrandLogo'
import { Avatar } from '../ui'
import { useAuth } from '../../context/auth-context'
import { useMarketplace } from '../../context/marketplace-context'

const links = [
  ['Showcase', '/showcase'],
  ['Creators', '/search/creators'],
  ['Businesses', '/search/businesses'],
  ['Campaigns', '/search/campaigns'],
  ['Categories', '/categories'],
  ['Collections', '/collections'],
]

export function MarketplaceLayout() {
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()
  const { session, signOut, hasRole, isInitializing } = useAuth()
  const { account } = useMarketplace()
  let lastDashboardRole = ''
  try { lastDashboardRole = window.localStorage.getItem('vyra:last-dashboard-role') || '' } catch { /* Fall back to role priority. */ }
  const dashboardRole = hasRole('admin')
    ? 'admin'
    : ['creator', 'business'].includes(lastDashboardRole) && hasRole(lastDashboardRole)
      ? lastDashboardRole
      : hasRole('business')
        ? 'business'
        : hasRole('creator')
          ? 'creator'
          : ''
  const dashboardTarget = dashboardRole === 'admin' ? '/admin/dashboard' : dashboardRole ? `/${dashboardRole}/dashboard` : ''
  const dashboardLabel = dashboardRole ? `${dashboardRole[0].toUpperCase()}${dashboardRole.slice(1)} dashboard` : 'Dashboard'

  return (
    <div
      data-theme="dark"
      className="marketplace-shell min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <header className="marketplace-header">
        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center px-5 lg:px-8">
          <BrandLogo className="shrink-0 text-white" />

          <div className="ml-auto flex items-center gap-1">
            {session ? <div className="hidden items-center gap-1 sm:flex">
              {dashboardTarget && (
                <Link
                  to={dashboardTarget}
                  className="mr-1 hidden min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 text-xs font-bold text-white/65 transition hover:border-white/25 hover:bg-white/[.07] hover:text-white md:flex"
                >
                  <LayoutDashboard size={15} />
                  {dashboardLabel}
                </Link>
              )}
              <NavLink
                to="/saved"
                aria-label="Saved"
                className={({ isActive }) =>
                  `grid size-10 place-items-center rounded-xl transition ${
                    isActive ? 'bg-white/10 text-pink' : 'text-white/60 hover:bg-white/[.07] hover:text-white'
                  }`
                }
              >
                <Bookmark size={17} />
              </NavLink>
              <NavLink
                to="/following"
                aria-label="Following"
                className={({ isActive }) =>
                  `grid size-10 place-items-center rounded-xl transition ${
                    isActive ? 'bg-white/10 text-mint' : 'text-white/60 hover:bg-white/[.07] hover:text-white'
                  }`
                }
              >
                <Users size={17} />
              </NavLink>
              <Link to="/account" aria-label="My account" className="rounded-full transition hover:ring-2 hover:ring-pink/60">
                <Avatar src={account.viewer.avatar?.startsWith('data:') ? account.viewer.avatar : undefined} size="sm" fallback={account.viewer.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'YU'} />
              </Link>
            </div> : !isInitializing && <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="min-h-9 rounded-full px-4 py-2 text-xs font-bold text-white/65 transition hover:bg-white/[.06] hover:text-white">Sign in</Link>
              <Link to="/register" className="min-h-9 rounded-full bg-pink px-4 py-2 text-xs font-bold text-black transition hover:bg-white">Get started</Link>
            </div>}

            <div
              className="relative"
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setMenu(true)
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') setMenu(false)
              }}
            >
              <button
                className={`ml-1 grid size-10 place-items-center rounded-xl border transition ${
                  menu
                    ? 'border-pink/45 bg-pink/10 text-pink'
                    : 'border-white/10 text-white/70 hover:border-white/25 hover:bg-white/[.06] hover:text-white'
                }`}
                onClick={() => setMenu((value) => !value)}
                aria-label="Toggle navigation"
                aria-expanded={menu}
                aria-haspopup="menu"
              >
                {menu ? <X size={18} /> : <Menu size={18} />}
              </button>

              <AnimatePresence>
                {menu && (
                  <motion.nav
                    role="menu"
                    initial={{ opacity: 0, y: -8, scale: .97 }}
                    animate={{ opacity: 1, y: 7, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: .98 }}
                    transition={{ duration: .17 }}
                    className="absolute right-0 z-50 w-64 overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#171717]/96 p-2 shadow-[0_28px_80px_rgba(0,0,0,.5)] backdrop-blur-2xl"
                  >
                    <div className="border-b border-white/10 px-3 py-3">
                      <p className="eyebrow text-white/25">Explore Influence Hub</p>
                    </div>
                    {dashboardTarget && (
                      <Link role="menuitem" to={dashboardTarget} onClick={() => setMenu(false)} className="my-1 flex items-center gap-3 rounded-xl border border-mint/15 bg-mint/[.06] px-3 py-3 text-sm font-semibold text-mint transition hover:bg-mint hover:text-black">
                        <LayoutDashboard size={16} />
                        <span className="flex-1">{dashboardLabel}</span>
                        <span>→</span>
                      </Link>
                    )}
                    {session && <NavLink role="menuitem" to="/account" onClick={() => setMenu(false)} className={({ isActive }) => `my-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? 'bg-pink text-black' : 'text-white/65 hover:bg-white/[.055] hover:text-white'}`}>
                      <Avatar src={account.viewer.avatar?.startsWith('data:') ? account.viewer.avatar : undefined} size="sm" fallback={account.viewer.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'YU'} /><span className="flex-1">My account</span><span>→</span>
                    </NavLink>}
                    <div className="border-t border-white/10" />
                    <div className="py-1">
                      {links.filter(([label]) => session || label !== 'Collections').map(([label, to], index) => (
                        <div key={to}>
                          <NavLink
                            role="menuitem"
                            to={to}
                            onClick={() => setMenu(false)}
                            className={({ isActive }) =>
                              `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                                isActive
                                  ? 'bg-white/[.08] text-white'
                                  : 'text-white/50 hover:bg-white/[.055] hover:text-white'
                              }`
                            }
                          >
                            <span className="w-5 text-[9px] tracking-[.12em] text-white/20">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="flex-1 font-semibold">{label}</span>
                            <span className="translate-x-1 text-pink opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100">
                              →
                            </span>
                          </NavLink>
                        </div>
                      ))}
                    </div>
                    {!session && !isInitializing && <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-2">
                      <Link role="menuitem" to="/login" onClick={() => setMenu(false)} className="rounded-xl border border-white/10 px-3 py-2.5 text-center text-xs font-bold text-white/70">Sign in</Link>
                      <Link role="menuitem" to="/register" onClick={() => setMenu(false)} className="rounded-xl bg-pink px-3 py-2.5 text-center text-xs font-bold text-black">Get started</Link>
                    </div>}
                    {session && <button role="menuitem" type="button" onClick={() => { signOut(); setMenu(false); navigate('/login', { replace: true }) }} className="flex w-full items-center gap-3 border-t border-white/10 px-3 py-3 text-left text-xs font-semibold text-white/45 transition hover:bg-white/[.055] hover:text-white"><LogOut size={15} />Sign out</button>}
                  </motion.nav>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <Outlet />

      <footer className="mt-24 border-t border-white/10">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 px-5 py-8 text-xs text-white/35 sm:flex-row lg:px-8">
          <span>VYRA Creator Marketplace · 2026</span>
          <div className="flex gap-5">
            <NavLink to="/categories">Categories</NavLink>
            {session && <NavLink to="/collections">Collections</NavLink>}
            <NavLink to="/design-system">Design system</NavLink>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function PageHero({ eyebrow, title, script, copy, children }) {
  return (
    <section className="marketplace-page-hero">
      <div className="mx-auto max-w-[1500px] px-5 pb-14 pt-16 lg:px-8 lg:pb-20 lg:pt-24">
        <p className="eyebrow text-white/35">{eyebrow}</p>
        <div className="mt-4 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-[clamp(3.5rem,8vw,8rem)] font-extrabold uppercase leading-[.78] tracking-[-.085em]">
              {title}
              <br />
              <span className="editorial text-[.68em] text-pink">{script}</span>
            </h1>
            {copy && <p className="mt-7 max-w-xl text-sm leading-6 text-white/45">{copy}</p>}
          </div>
          {children && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row lg:shrink-0 [&>*]:w-full sm:[&>*]:w-auto">
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function SectionHeader({ eyebrow, title, link, onLink }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-5">
      <div>
        <p className="eyebrow text-white/30">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold tracking-[-.05em] sm:text-4xl">{title}</h2>
      </div>
      {link && (
        <button
          onClick={onLink}
          className="shrink-0 pb-0.5 text-[10px] font-bold uppercase tracking-[.1em] text-white/45 transition hover:text-white"
        >
          {link} →
        </button>
      )}
    </div>
  )
}

export function NoResults({ text = 'No results match those filters.' }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-white/15 text-center">
      <div>
        <Compass className="mx-auto text-pink" />
        <p className="mt-4 text-sm text-white/50">{text}</p>
      </div>
    </div>
  )
}
