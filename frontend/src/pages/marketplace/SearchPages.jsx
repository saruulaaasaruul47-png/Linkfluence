import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { campaignApi } from '../../api/campaign.api'
import { marketplaceApi } from '../../api/marketplace.api'
import {
  toBusinessCard,
  toCampaignCard,
  toCreatorCard,
  toShowcaseCard,
} from '../../api/marketplace.mapper'
import { Drawer, Input } from '../../components/ui'
import { ActiveFilters, FilterSidebar, SearchBar } from '../../components/marketplace/SearchFilters'
import { NoResults, SectionHeader } from '../../components/marketplace/MarketplaceLayout'
import { BusinessCard, CampaignCard, CreatorCard, ShowcaseCard } from '../../components/marketplace/cards'
import { DashboardHeader, DashboardPage } from '../../components/dashboard/DashboardUI'
import { ProposalDialog } from '../dashboard/CampaignDashboardPages'
import { useAuth } from '../../context/auth-context'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { buildMarketplaceSearch, mergeUniqueById, parseMarketplaceSearch } from '../../lib/marketplaceSearchQuery'

const firstNumber = (value) => Number(String(value).match(/[0-9]+(?:\.[0-9]+)?/)?.[0] || 0)
const searchLinks = [
  ['Creators', '/search/creators', 'creator'],
  ['Businesses', '/search/businesses', 'business'],
  ['Campaigns', '/search/campaigns', 'campaign'],
]

function SearchHero({ info, type, global = false, canBrowseCampaigns = false }) {
  return <section className="border-b border-white/10 bg-white/[.015]">
    <div className="mx-auto max-w-[1500px] px-5 py-10 lg:px-8 lg:py-12">
      <p className="eyebrow text-white/35">{info[0]}</p>
      <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-4xl font-extrabold uppercase leading-[.88] tracking-[-.07em] sm:text-6xl">
            {info[1]} <span className="editorial normal-case text-pink">{info[2]}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45">{info[3]}</p>
        </div>
        {!global&&<nav aria-label="Search categories" className="flex flex-wrap gap-2">
          {searchLinks.filter(([, , id]) => id !== 'campaign' || canBrowseCampaigns).map(([label,to,id])=><Link key={id} to={to} aria-current={type===id?'page':undefined} className={`inline-flex min-h-9 items-center rounded-full border px-4 text-[10px] font-bold uppercase tracking-[.08em] transition ${type===id?'border-pink bg-pink text-black':'border-white/10 text-white/45 hover:border-white/25 hover:text-white'}`}>{label}</Link>)}
        </nav>}
      </div>
    </div>
  </section>
}

function SearchPage({ type, dashboard = false }) {
  const { hasRole } = useAuth()
  const [params, setParams] = useSearchParams()
  const [initialSearch] = useState(() => parseMarketplaceSearch(params))
  const [query, setQuery] = useState(initialSearch.query)
  const [filters, setFilters] = useState(initialSearch.filters)
  const [sort, setSort] = useState(initialSearch.sort)
  const [drawer, setDrawer] = useState(false)
  const [workRequestCampaign, setWorkRequestCampaign] = useState(null)
  const [remote, setRemote] = useState({ items: [], nextCursor: null, loading: true, loadingMore: false, error: '' })
  const debouncedQuery = useDebouncedValue(query)
  const loadMoreRef = useRef(null)
  const moreControllerRef = useRef(null)

  const requestResults = useCallback((cursor, signal) => {
    const common = {
      q: debouncedQuery || undefined,
      limit: 12,
      ...(cursor && { cursor }),
    }
    if (type === 'creator') {
      return marketplaceApi.listCreators({
        ...common,
        category: filters.niche || undefined,
        platform: filters.platform
          ? filters.platform === 'Twitch' ? 'OTHER' : filters.platform.toUpperCase().replace('-', '_')
          : undefined,
        verified: filters.verified || undefined,
        available: filters.available || undefined,
        minRating: filters.rating ? firstNumber(filters.rating) : undefined,
        minEngagement: filters.engagement ? firstNumber(filters.engagement) : undefined,
        minFollowers: filters.followers === '100K–250K' ? 100000 : filters.followers === '250K+' ? 250000 : undefined,
        maxFollowers: filters.followers === 'Under 100K' ? 99999 : filters.followers === '100K–250K' ? 249999 : undefined,
        minPrice: filters.price === '₮1.5M–₮2M' ? 1500000 : filters.price === '₮2M+' ? 2000000 : undefined,
        maxPrice: filters.price === 'Under ₮1.5M' ? 1500000 : filters.price === '₮1.5M–₮2M' ? 2000000 : undefined,
        currency: filters.currency || undefined,
        location: filters.location || undefined,
        language: filters.language || undefined,
        skills: filters.skills || undefined,
        sort: sort === 'recommended' ? 'relevant' : sort,
      }, { signal }).then((result) => ({ items: result.items.map(toCreatorCard), nextCursor: result.nextCursor }))
    }
    if (type === 'business') {
      return marketplaceApi.listBusinesses({
        ...common,
        industry: filters.industry || undefined,
        location: filters.location || undefined,
        verified: filters.verified || undefined,
        minRating: filters.rating ? firstNumber(filters.rating) : undefined,
        minCompletedCollaborations: filters.completed ? firstNumber(filters.completed) : undefined,
        sort: sort === 'recommended' ? 'relevant' : sort,
      }, { signal }).then((result) => ({ items: result.items.map(toBusinessCard), nextCursor: result.nextCursor }))
    }
    return campaignApi.discover({
        ...common, page: 1,
        category: filters.niche || undefined,
        platform: filters.platform ? filters.platform.toUpperCase().replace('-', '_') : undefined,
        sort: 'newest',
      }, { signal }).then((result) => ({ items: result.items.map(toCampaignCard), nextCursor: null }))
  }, [debouncedQuery, filters, sort, type])

  useEffect(() => {
    const controller = new AbortController()
    moreControllerRef.current?.abort()
    queueMicrotask(() => setRemote({ items: [], nextCursor: null, loading: true, loadingMore: false, error: '' }))
    requestResults(null, controller.signal)
      .then((result) => setRemote({ items: result.items, nextCursor: result.nextCursor || null, loading: false, loadingMore: false, error: '' }))
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') setRemote({ items: [], nextCursor: null, loading: false, loadingMore: false, error: 'Results could not be loaded.' })
      })
    return () => controller.abort()
  }, [requestResults])

  const loadMore = useCallback(() => {
    if (!remote.nextCursor || remote.loading || remote.loadingMore) return
    moreControllerRef.current?.abort()
    const controller = new AbortController()
    moreControllerRef.current = controller
    setRemote((current) => ({ ...current, loadingMore: true, error: '' }))
    requestResults(remote.nextCursor, controller.signal)
      .then((result) => setRemote((current) => ({
        ...current,
        items: mergeUniqueById(current.items, result.items),
        nextCursor: result.nextCursor || null,
        loadingMore: false,
      })))
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') setRemote((current) => ({ ...current, loadingMore: false, error: 'More results could not be loaded.' }))
      })
  }, [remote.loading, remote.loadingMore, remote.nextCursor, requestResults])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !remote.nextCursor) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore()
    }, { rootMargin: '500px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [loadMore, remote.nextCursor])

  useEffect(() => {
    setParams(buildMarketplaceSearch({ query, sort, filters }), { replace: true })
  }, [filters, query, setParams, sort])

  const results = remote.items

  const info = type === 'creator'
    ? ['Creator search', 'FIND YOUR', 'creative match.', 'Filter by audience quality, creative niche and collaboration fit.']
    : type === 'business'
      ? ['Business search', 'MEET THE', 'right partners.', 'Discover trusted organizations actively investing in thoughtful creator work.']
      : ['Campaign search', 'FIND WORK', 'worth making.', 'Explore live briefs with clear goals, budgets and expectations.']

  const resultGrid = remote.loading
    ? <p className="py-16 text-center text-sm text-white/40">Loading results…</p>
    : remote.error && results.length === 0
      ? <NoResults text={remote.error} />
    : results.length === 0
      ? <NoResults />
      : <><div className={type === 'business' ? 'grid gap-5 md:grid-cols-2 xl:grid-cols-3' : 'marketplace-compact-result-grid grid gap-3'}>{results.map((item) => type === 'creator' ? <CreatorCard key={item.id} creator={item} compact /> : type === 'business' ? <BusinessCard key={item.id} business={item} /> : <CampaignCard key={item.id} campaign={item} compact onAction={dashboard ? setWorkRequestCampaign : undefined} actionLabel={dashboard ? 'Send work request' : 'View campaign'} />)}</div>{remote.nextCursor && <div ref={loadMoreRef} className="grid min-h-20 place-items-center" aria-live="polite"><span className="text-xs text-white/35">{remote.loadingMore ? 'Loading more…' : 'Scroll for more'}</span></div>}</>

  if (dashboard) {
    return <DashboardPage>
      <DashboardHeader eyebrow="Creator opportunities" title="Discover campaigns" copy="Search public briefs, refine the list with compact filters, then open the campaigns that fit your channel." />
      <div className="grid items-start gap-3 lg:grid-cols-[12.5rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,1fr)]">
        <FilterSidebar compact type={type} filters={filters} setFilters={setFilters} className="sticky top-[88px] hidden h-max border-white/[.07] bg-[#101010]/95 shadow-[0_14px_45px_rgba(0,0,0,.2)] lg:block" />
        <section className="min-w-0">
          <div className="sticky top-[76px] z-30 mb-4 rounded-xl border border-white/10 bg-[#101010]/95 p-1.5 shadow-[0_14px_45px_rgba(0,0,0,.24)] backdrop-blur-xl">
            <SearchBar compact type={type} value={query} onChange={setQuery} placeholder="Search campaigns" count={results.length} sort={sort} setSort={setSort} onMobileFilters={() => setDrawer(true)} />
            <ActiveFilters filters={filters} setFilters={setFilters} />
          </div>
          {resultGrid}
        </section>
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Campaign filters"><FilterSidebar type={type} filters={filters} setFilters={setFilters} className="border-0 bg-transparent p-0" /></Drawer>
      {workRequestCampaign && <ProposalDialog open onClose={() => setWorkRequestCampaign(null)} campaign={workRequestCampaign} />}
    </DashboardPage>
  }

  return <main>
    <SearchHero info={info} type={type} canBrowseCampaigns={hasRole('creator')} />
    <div className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
      <div className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <FilterSidebar type={type} filters={filters} setFilters={setFilters} className="sticky top-24 hidden h-max lg:block" />
        <section className="min-w-0">
          <SearchBar type={type} value={query} onChange={setQuery} placeholder={`Search ${type}s`} count={results.length} sort={sort} setSort={setSort} onMobileFilters={() => setDrawer(true)} />
          <ActiveFilters filters={filters} setFilters={setFilters} />
          {resultGrid}
        </section>
      </div>
    </div>
    <Drawer open={drawer} onClose={() => setDrawer(false)} title="Search filters"><FilterSidebar type={type} filters={filters} setFilters={setFilters} className="border-0 bg-transparent p-0" /></Drawer>
  </main>
}

export function GlobalSearchPage() {
  const { hasRole } = useAuth()
  const canBrowseCampaigns = hasRole('creator')
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const [activeGroup, setActiveGroup] = useState('All')
  const [remote, setRemote] = useState(null)
  const debouncedQuery = useDebouncedValue(query)
  useEffect(() => {
    const controller = new AbortController()
    marketplaceApi.search({ type: 'all', q: debouncedQuery, limit: 12 }, { signal: controller.signal })
      .then((result) => {
        setRemote({
          creators: result.creators?.items?.map(toCreatorCard) || [],
          businesses: result.businesses?.items?.map(toBusinessCard) || [],
          campaigns: result.campaigns?.items?.map(toCampaignCard) || [],
          showcase: result.showcase?.items?.map(toShowcaseCard) || [],
        })
      })
      .catch((error) => { if (error.code !== 'ERR_CANCELED') setRemote({ creators: [], businesses: [], campaigns: [], showcase: [] }) })
    return () => controller.abort()
  }, [debouncedQuery])
  const loading = remote === null
  const groups = [
    ['Creators', remote?.creators || [], (item) => <CreatorCard key={item.id} creator={item} compact />],
    ['Businesses', remote?.businesses || [], (item) => <BusinessCard key={item.id} business={item} />],
    ...(canBrowseCampaigns ? [['Campaigns', remote?.campaigns || [], (item) => <CampaignCard key={item.id} campaign={item} />]] : []),
    ['Showcase', remote?.showcase || [], (item) => <ShowcaseCard key={item.id} item={item} />],
  ]
  const visibleGroups = activeGroup === 'All' ? groups : groups.filter(([title]) => title === activeGroup)
  const visibleCount = visibleGroups.reduce((total, [, items]) => total + items.length, 0)
  const change = (value) => {
    setQuery(value)
    setParams(value.trim() ? { q: value.trim() } : {}, { replace: true })
  }
  const globalInfo = ['Global marketplace search', 'SEARCH THE', 'whole network.', canBrowseCampaigns ? 'Creators, businesses, campaigns and completed work in one useful result page.' : 'Creators, businesses and published work in one useful result page.']
  return <main>
    <SearchHero info={globalInfo} global />
    <div className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
      <section className="sticky top-[84px] z-30 mb-10 rounded-[1.35rem] border border-white/10 bg-[#101010]/95 p-2.5 shadow-[0_18px_60px_rgba(0,0,0,.3)] backdrop-blur-xl">
        <div className="relative">
          <Input aria-label="Search the marketplace" value={query} onChange={(event) => change(event.target.value)} placeholder={canBrowseCampaigns ? 'Search creators, businesses, campaigns and work...' : 'Search creators, businesses and work...'} className="[&_input]:min-h-12 [&_input]:border-transparent [&_input]:bg-white/[.035] [&_input]:pr-12 [&_input]:text-sm" />
          <Search aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
        </div>
        <div className="mt-2 flex flex-col justify-between gap-2 border-t border-white/[.07] pt-2 sm:flex-row sm:items-center">
          <nav aria-label="Result type" className="flex gap-1 overflow-x-auto">
            {['All',...groups.map(([title])=>title)].map((title)=><button key={title} type="button" onClick={()=>setActiveGroup(title)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition ${activeGroup===title?'bg-white text-black':'text-white/40 hover:bg-white/[.06] hover:text-white'}`}>{title}</button>)}
          </nav>
          <p aria-live="polite" className="shrink-0 px-2 text-[10px] font-bold uppercase tracking-[.1em] text-white/35">{visibleCount} matching results</p>
        </div>
      </section>
      {loading ? <p className="py-16 text-center text-sm text-white/40">Searching…</p> : visibleCount ? <div className="space-y-14">{visibleGroups.filter(([, items]) => items.length).map(([title, items, render]) => <section key={title}><SectionHeader eyebrow={`${items.length} matches`} title={title} /><div className={title === 'Showcase' ? 'columns-1 gap-5 md:columns-2 xl:columns-3' : 'grid gap-5 md:grid-cols-2 xl:grid-cols-3'}>{items.map(render)}</div></section>)}</div> : <NoResults text={activeGroup === 'All' ? 'No creators, businesses or showcase work match this search.' : `No ${activeGroup.toLowerCase()} match this search.`} />}</div>
  </main>
}

export function CreatorSearchPage() { return <SearchPage type="creator" /> }
export function BusinessSearchPage() { return <SearchPage type="business" /> }
export function CampaignSearchPage({ dashboard = false }) {
  const { hasRole } = useAuth()
  return hasRole('creator') ? <SearchPage type="campaign" dashboard={dashboard} /> : <Navigate to="/showcase" replace />
}
