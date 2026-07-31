import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { businesses, campaigns, creators, showcases } from '../../data/marketplace'
import { useMarketplace } from '../../context/marketplace-context'

const firstNumber = (value) => Number(String(value).match(/[0-9]+(?:\.[0-9]+)?/)?.[0] || 0)
const filterNames = ['niche', 'platform', 'verified', 'rating', 'engagement', 'followers', 'price', 'industry', 'campaigns', 'open', 'goal', 'budget', 'deadline']
const searchLinks = [
  ['Creators', '/search/creators', 'creator'],
  ['Businesses', '/search/businesses', 'business'],
  ['Campaigns', '/search/campaigns', 'campaign'],
]

function SearchHero({ info, type, global = false }) {
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
          {searchLinks.map(([label,to,id])=><Link key={id} to={to} aria-current={type===id?'page':undefined} className={`inline-flex min-h-9 items-center rounded-full border px-4 text-[10px] font-bold uppercase tracking-[.08em] transition ${type===id?'border-pink bg-pink text-black':'border-white/10 text-white/45 hover:border-white/25 hover:text-white'}`}>{label}</Link>)}
        </nav>}
      </div>
    </div>
  </section>
}

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [delay, value])
  return debounced
}

function initialFilters(params) {
  return filterNames.reduce((result, name) => {
    const value = params.get(name)
    if (value) result[name] = ['verified', 'open'].includes(name) ? value === 'true' : value
    return result
  }, {})
}

function SearchPage({ type, dashboard = false }) {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || params.get('category') || '')
  const [filters, setFilters] = useState(() => initialFilters(params))
  const [sort, setSort] = useState(params.get('sort') || 'recommended')
  const [drawer, setDrawer] = useState(false)
  const [remoteSource, setRemoteSource] = useState(null)
  const debouncedQuery = useDebouncedValue(query)
  const { saved, following } = useMarketplace()
  const fallbackSource = type === 'creator' ? creators : type === 'business' ? businesses : campaigns

  useEffect(() => {
    let active = true
    const common = {
      q: debouncedQuery || undefined,
      page: 1,
      limit: 30,
    }
    let request
    if (type === 'creator') {
      request = marketplaceApi.listCreators({
        ...common,
        category: filters.niche || undefined,
        platform: filters.platform
          ? filters.platform === 'Twitch' ? 'OTHER' : filters.platform.toUpperCase().replace('-', '_')
          : undefined,
        verified: filters.verified || undefined,
        minRating: filters.rating ? firstNumber(filters.rating) : undefined,
        minEngagement: filters.engagement ? firstNumber(filters.engagement) : undefined,
        minFollowers: filters.followers === '100K–250K' ? 100000 : filters.followers === '250K+' ? 250000 : undefined,
        minPrice: filters.price === '₮1.5M–₮2M' ? 1500000 : filters.price === '₮2M+' ? 2000000 : undefined,
        maxPrice: filters.price === 'Under ₮1.5M' ? 1500000 : filters.price === '₮1.5M–₮2M' ? 2000000 : undefined,
        sort: sort === 'recommended' ? 'relevant' : sort,
      }).then((result) => result.items.map(toCreatorCard))
    } else if (type === 'business') {
      request = marketplaceApi.listBusinesses({
        ...common,
        industry: filters.industry || undefined,
        verified: filters.verified || undefined,
        minRating: filters.rating ? firstNumber(filters.rating) : undefined,
        sort: sort === 'recommended' ? 'relevant' : sort,
      }).then((result) => result.items.map(toBusinessCard))
    } else {
      request = campaignApi.discover({
        ...common,
        category: filters.niche || undefined,
        platform: filters.platform ? filters.platform.toUpperCase().replace('-', '_') : undefined,
        sort: 'newest',
      }).then((result) => result.items.map(toCampaignCard))
    }
    request.then((items) => { if (active) setRemoteSource(items) }).catch(() => {})
    return () => { active = false }
  }, [debouncedQuery, filters.engagement, filters.followers, filters.industry, filters.niche, filters.platform, filters.price, filters.rating, filters.verified, sort, type])
  const source = remoteSource || fallbackSource

  useEffect(() => {
    const next = new URLSearchParams()
    if (query.trim()) next.set('q', query.trim())
    if (sort !== 'recommended') next.set('sort', sort)
    Object.entries(filters).forEach(([name, value]) => {
      if (value) next.set(name, String(value))
    })
    setParams(next, { replace: true })
  }, [filters, query, setParams, sort])

  const results = useMemo(() => {
    let items = source.filter((item) => JSON.stringify(item).toLowerCase().includes(debouncedQuery.toLowerCase()))
    if (type === 'creator') {
      if (filters.niche) items = items.filter((item) => item.niche.includes(filters.niche))
      if (filters.platform) items = items.filter((item) => item.platforms.includes(filters.platform))
      if (filters.verified) items = items.filter((item) => item.verified)
      if (filters.rating) items = items.filter((item) => item.rating >= firstNumber(filters.rating))
      if (filters.engagement) items = items.filter((item) => firstNumber(item.engagement) >= firstNumber(filters.engagement))
      if (filters.followers) items = items.filter((item) => { const audience = firstNumber(item.followers); return filters.followers === 'Under 100K' ? audience < 100 : filters.followers === '100K–250K' ? audience >= 100 && audience < 250 : audience >= 250 })
      if (filters.price) items = items.filter((item) => { const price = firstNumber(item.price); return filters.price === 'Under ₮1.5M' ? price < 1.5 : filters.price === '₮1.5M–₮2M' ? price >= 1.5 && price <= 2 : price > 2 })
    }
    if (type === 'business') {
      if (filters.industry) items = items.filter((item) => item.industry === filters.industry)
      if (filters.rating) items = items.filter((item) => item.rating >= firstNumber(filters.rating))
      if (filters.campaigns) items = items.filter((item) => filters.campaigns === '1–2' ? item.campaigns <= 2 : item.campaigns >= 3)
      if (filters.verified) items = items.filter((item) => item.verifiedPayer)
    }
    if (type === 'campaign') {
      if (filters.niche) items = items.filter((item) => item.niche === filters.niche)
      if (filters.platform) items = items.filter((item) => item.platform.includes(filters.platform))
      if (filters.open) items = items.filter((item) => item.mode === 'Open')
      if (filters.goal) items = items.filter((item) => item.goal.toLowerCase().includes(filters.goal.toLowerCase().replace('product launch', 'launch')))
      if (filters.budget) items = items.filter((item) => { const budget = firstNumber(item.budget); return filters.budget === 'Under ₮5M' ? budget < 5 : filters.budget === '₮5M–₮10M' ? budget >= 5 && budget <= 10 : budget > 10 })
      if (filters.deadline) items = items.filter((item) => filters.deadline === 'Next 14 days' ? item.deadline.startsWith('Jul') : filters.deadline === 'Next 30 days' ? !item.deadline.startsWith('Sep') : item.deadline.startsWith('Sep'))
    }
    if (sort === 'rating') items = [...items].sort((a, b) => (b.rating || b.applications) - (a.rating || a.applications))
    if (sort === 'newest') items = [...items].sort((a, b) => source.indexOf(b) - source.indexOf(a))
    if (sort === 'recommended') {
      const preferences = new Set([...saved, ...following])
      items = [...items].sort((a, b) => Number(preferences.has(`${type}:${b.id}`)) - Number(preferences.has(`${type}:${a.id}`)))
    }
    return items
  }, [debouncedQuery, filters, following, saved, sort, source, type])

  const info = type === 'creator'
    ? ['Creator search', 'FIND YOUR', 'creative match.', 'Filter by audience quality, creative niche and collaboration fit.']
    : type === 'business'
      ? ['Business search', 'MEET THE', 'right partners.', 'Discover trusted organizations actively investing in thoughtful creator work.']
      : ['Campaign search', 'FIND WORK', 'worth making.', 'Explore live briefs with clear goals, budgets and expectations.']

  const resultGrid = results.length === 0
    ? <NoResults />
    : <div className={type === 'campaign' ? 'grid gap-5 xl:grid-cols-2 2xl:grid-cols-3' : 'grid gap-5 md:grid-cols-2 xl:grid-cols-3'}>{results.map((item) => type === 'creator' ? <CreatorCard key={item.id} creator={item} /> : type === 'business' ? <BusinessCard key={item.id} business={item} /> : <CampaignCard key={item.id} campaign={item} />)}</div>

  if (dashboard) {
    return <DashboardPage>
      <DashboardHeader eyebrow="Creator opportunities" title="Discover campaigns" copy="Search public briefs, refine the list with compact filters, then open the campaigns that fit your channel." />
      <div className="sticky top-[68px] z-30 mb-5 rounded-[1.4rem] border border-white/10 bg-[#101010]/95 p-2 shadow-[0_18px_60px_rgba(0,0,0,.28)] backdrop-blur-xl sm:top-[76px]">
        <SearchBar compact value={query} onChange={setQuery} placeholder="Search campaigns" count={results.length} sort={sort} setSort={setSort} onMobileFilters={() => setDrawer(true)} />
        <FilterSidebar compact horizontal type={type} filters={filters} setFilters={setFilters} className="hidden rounded-xl border-white/[.07] bg-black/15 lg:block" />
        <ActiveFilters filters={filters} setFilters={setFilters} />
      </div>
      {resultGrid}
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Campaign filters"><FilterSidebar type={type} filters={filters} setFilters={setFilters} className="border-0 bg-transparent p-0" /></Drawer>
    </DashboardPage>
  }

  return <main>
    <SearchHero info={info} type={type} />
    <div className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
      <div className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <FilterSidebar type={type} filters={filters} setFilters={setFilters} className="sticky top-24 hidden h-max lg:block" />
        <section className="min-w-0">
          <SearchBar value={query} onChange={setQuery} placeholder={`Search ${type}s`} count={results.length} sort={sort} setSort={setSort} onMobileFilters={() => setDrawer(true)} />
          <ActiveFilters filters={filters} setFilters={setFilters} />
          {resultGrid}
        </section>
      </div>
    </div>
    <Drawer open={drawer} onClose={() => setDrawer(false)} title="Search filters"><FilterSidebar type={type} filters={filters} setFilters={setFilters} className="border-0 bg-transparent p-0" /></Drawer>
  </main>
}

export function GlobalSearchPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const [activeGroup, setActiveGroup] = useState('All')
  const [remote, setRemote] = useState(null)
  const debouncedQuery = useDebouncedValue(query)
  useEffect(() => {
    let active = true
    marketplaceApi.search({ type: 'all', q: debouncedQuery, limit: 12 })
      .then((result) => {
        if (active) setRemote({
          creators: result.creators?.items?.map(toCreatorCard) || [],
          businesses: result.businesses?.items?.map(toBusinessCard) || [],
          campaigns: result.campaigns?.items?.map(toCampaignCard) || [],
          showcase: result.showcase?.items?.map(toShowcaseCard) || [],
        })
      })
      .catch(() => {})
    return () => { active = false }
  }, [debouncedQuery])
  const term = debouncedQuery.trim().toLowerCase()
  const matches = (item) => !term || JSON.stringify(item).toLowerCase().includes(term)
  const groups = [
    ['Creators', remote ? remote.creators : creators.filter(matches), (item) => <CreatorCard key={item.id} creator={item} compact />],
    ['Businesses', remote ? remote.businesses : businesses.filter(matches), (item) => <BusinessCard key={item.id} business={item} />],
    ['Campaigns', remote ? remote.campaigns : campaigns.filter(matches), (item) => <CampaignCard key={item.id} campaign={item} />],
    ['Showcase', remote ? remote.showcase : showcases.filter(matches), (item) => <ShowcaseCard key={item.id} item={item} />],
  ]
  const visibleGroups = activeGroup === 'All' ? groups : groups.filter(([title]) => title === activeGroup)
  const visibleCount = visibleGroups.reduce((total, [, items]) => total + items.length, 0)
  const change = (value) => {
    setQuery(value)
    setParams(value.trim() ? { q: value.trim() } : {}, { replace: true })
  }
  const globalInfo = ['Global marketplace search', 'SEARCH THE', 'whole network.', 'Creators, businesses, campaigns and completed work in one useful result page.']
  return <main>
    <SearchHero info={globalInfo} global />
    <div className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
      <section className="sticky top-[84px] z-30 mb-10 rounded-[1.35rem] border border-white/10 bg-[#101010]/95 p-2.5 shadow-[0_18px_60px_rgba(0,0,0,.3)] backdrop-blur-xl">
        <div className="relative">
          <Input aria-label="Search the marketplace" value={query} onChange={(event) => change(event.target.value)} placeholder="Search creators, businesses, campaigns and work..." className="[&_input]:min-h-12 [&_input]:border-transparent [&_input]:bg-white/[.035] [&_input]:pr-12 [&_input]:text-sm" />
          <Search aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
        </div>
        <div className="mt-2 flex flex-col justify-between gap-2 border-t border-white/[.07] pt-2 sm:flex-row sm:items-center">
          <nav aria-label="Result type" className="flex gap-1 overflow-x-auto">
            {['All',...groups.map(([title])=>title)].map((title)=><button key={title} type="button" onClick={()=>setActiveGroup(title)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition ${activeGroup===title?'bg-white text-black':'text-white/40 hover:bg-white/[.06] hover:text-white'}`}>{title}</button>)}
          </nav>
          <p aria-live="polite" className="shrink-0 px-2 text-[10px] font-bold uppercase tracking-[.1em] text-white/35">{visibleCount} matching results</p>
        </div>
      </section>
      {visibleCount ? <div className="space-y-14">{visibleGroups.filter(([, items]) => items.length).map(([title, items, render]) => <section key={title}><SectionHeader eyebrow={`${items.length} matches`} title={title} /><div className={title === 'Showcase' ? 'columns-1 gap-5 md:columns-2 xl:columns-3' : 'grid gap-5 md:grid-cols-2 xl:grid-cols-3'}>{items.map(render)}</div></section>)}</div> : <NoResults text={activeGroup === 'All' ? 'No creators, businesses, campaigns or showcase work match this search.' : `No ${activeGroup.toLowerCase()} match this search.`} />}</div>
  </main>
}

export function CreatorSearchPage() { return <SearchPage type="creator" /> }
export function BusinessSearchPage() { return <SearchPage type="business" /> }
export function CampaignSearchPage({ dashboard = false }) { return <SearchPage type="campaign" dashboard={dashboard} /> }
