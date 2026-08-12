import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  FilePlus2,
  FolderPlus,
  MessageSquare,
  Plus,
  Send,
  UserPlus,
  WalletCards,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { collaborationApi, paymentApi } from '../../api/collaboration.api'
import { analyticsApi, messagingApi } from '../../api/dashboard.api'
import { marketplaceApi } from '../../api/marketplace.api'
import { toCreatorCard } from '../../api/marketplace.mapper'
import {
  DashboardHeader,
  DashboardPage,
  DashboardPanel,
  DateFilter,
  LineChart,
  MetricCard,
  Progress,
  QuickAction,
  StatusBadge,
} from '../../components/dashboard/DashboardUI'
import { Avatar, Badge, Button, EmptyState, Skeleton } from '../../components/ui'
import { useAuth } from '../../context/auth-context'
import { useDashboardData } from '../../context/dashboard-data-context'

const money = (value, currency = 'MNT') => new Intl.NumberFormat('en', {
  style: 'currency',
  currency,
  maximumFractionDigits: 0,
}).format(Number(value || 0))

const date = (value) => value
  ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
  : 'Flexible'

const statusLabel = (value = '') => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
const fulfilled = (result, fallback) => result.status === 'fulfilled' ? result.value : fallback

function useOverview(role, range) {
  const [state, setState] = useState({
    analytics: null,
    collaborations: [],
    conversations: [],
    creators: [],
    wallet: null,
    loading: true,
    error: '',
  })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    const jobs = [
      analyticsApi.summary({ role, range }),
      collaborationApi.list(role, { limit: 20 }),
      messagingApi.list({ limit: 6 }),
      role === 'creator' ? paymentApi.earningsSummary() : Promise.resolve(null),
      role === 'business' ? marketplaceApi.listCreators({ limit: 4, sort: 'trending' }) : Promise.resolve({ items: [] }),
    ]
    const results = await Promise.allSettled(jobs)
    const analytics = fulfilled(results[0], null)
    const collaborationResult = fulfilled(results[1], { items: [] })
    const conversationResult = fulfilled(results[2], { items: [] })
    const wallet = fulfilled(results[3], null)
    const creatorResult = fulfilled(results[4], { items: [] })
    const criticalFailure = results[0].status === 'rejected' && results[1].status === 'rejected'
    setState({
      analytics,
      collaborations: collaborationResult.items || [],
      conversations: conversationResult.items || [],
      creators: (creatorResult.items || []).map(toCreatorCard),
      wallet,
      loading: false,
      error: criticalFailure ? 'Dashboard data could not be loaded. Check your connection and try again.' : '',
    })
  }, [range, role])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  return { ...state, reload: load }
}

function DashboardLoading() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((item)=><Skeleton key={item} className="h-36 rounded-2xl" />)}</div>
}

function CampaignRows({ items, role, onOpen }) {
  if (!items.length) return <EmptyState title="No active work" description="Accepted work requests and active collaborations will appear here." />
  return <div className="space-y-1">{items.map((item) => {
    const party = role === 'creator' ? item.business : item.creator
    return <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="w-full rounded-xl p-3 text-left transition hover:bg-white/[.04]">
      <div className="flex items-center justify-between gap-3"><span className="min-w-0"><strong className="block truncate text-xs">{item.campaign?.title || 'Direct collaboration'}</strong><small className="mt-1 block truncate text-white/35">{party?.name || 'Partner'} · {date(item.contract?.publishBy || item.terms?.deadline)}</small></span><StatusBadge status={statusLabel(item.status)} /></div>
      <div className="mt-3"><Progress value={Number(item.progress || 0)} color={role === 'business' ? 'mint' : 'pink'} /></div>
    </button>
  })}</div>
}

function MessageRows({ items, onOpen }) {
  if (!items.length) return <EmptyState title="No conversations" description="Accepted message requests and workspace chats will appear here." />
  return <div className="space-y-1">{items.map((item) => {
    const peer = item.peers?.[0]
    return <button type="button" key={item.id} onClick={() => onOpen(item.id)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.04]">
      <Avatar size="sm" src={peer?.avatarUrl} fallback={peer?.name || item.title} />
      <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{item.title || peer?.name}</strong><small className="mt-1 block truncate text-white/35">{item.lastMessage?.body || 'No messages yet'}</small></span>
      <span className="text-[9px] text-white/25">{date(item.updatedAt)}</span>
    </button>
  })}</div>
}

function RequestRows({ items, emptyTitle, onOpen }) {
  if (!items.length) return <EmptyState title={emptyTitle} description="New work requests will appear here as soon as they are sent." />
  return <div className="space-y-1">{items.slice(0, 4).map((item) => <button type="button" key={item.id} onClick={() => onOpen(item)} className="flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.04]">
    <span className="min-w-0"><strong className="block truncate text-xs">{item.title || item.campaign}</strong><small className="mt-1 block truncate text-white/35">{item.brand || item.business || item.creator} {item.amount || item.budget ? `· ${item.amount || item.budget}` : ''}</small></span><StatusBadge status={item.status} />
  </button>)}</div>
}

function PerformancePanel({ analytics, range, onRange, role }) {
  const metrics = analytics?.metrics || {}
  const series = analytics?.series?.map((item) => Number(item.funded || 0) + Number(item.released || 0) || Number(item.collaborations || 0)) || []
  const chart = series.length > 1 ? series : [0, ...series, 0]
  return <DashboardPanel title="Performance" eyebrow="Selected period" action={<DateFilter value={range} onChange={onRange} />} className="h-full">
    <LineChart data={chart} area color={role === 'business' ? '#bbf7d0' : '#ff76bd'} />
    <div className="mt-4 grid grid-cols-3 gap-3 text-xs"><span><b className="block text-lg">{metrics.collaborations || 0}</b><i className="not-italic text-white/35">Workspaces</i></span><span><b className="block text-lg">{money(metrics.funded)}</b><i className="not-italic text-white/35">Funded</i></span><span><b className="block text-lg">{money(metrics.released)}</b><i className="not-italic text-white/35">Released</i></span></div>
  </DashboardPanel>
}

function OverviewMetrics({ analytics, accent }) {
  const values = analytics?.metrics || {}
  const metrics = [
    { label: 'Collaborations', value: values.collaborations || 0, change: 'Selected period', trend: 'up' },
    { label: 'Active work', value: values.active || 0, change: 'In progress', trend: 'up' },
    { label: 'Completed', value: values.completed || 0, change: 'Selected period', trend: 'up' },
    { label: 'Average rating', value: values.rating ? Number(values.rating).toFixed(1) : '—', change: `${values.ratingCount || 0} published reviews`, trend: 'flat' },
  ]
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric)=><MetricCard key={metric.label} metric={metric} accent={accent} />)}</div>
}

export function CreatorDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { creatorProposals, campaignInvitations } = useDashboardData()
  const [range, setRange] = useState('1M')
  const overview = useOverview('creator', range)
  const active = useMemo(() => overview.collaborations.filter((item) => !['COMPLETED','CANCELLED'].includes(item.status)).slice(0, 5), [overview.collaborations])
  const deadlines = useMemo(() => overview.collaborations.filter((item) => item.contract?.publishBy || item.terms?.deadline).sort((a,b)=>new Date(a.contract?.publishBy||a.terms?.deadline)-new Date(b.contract?.publishBy||b.terms?.deadline)).slice(0,4), [overview.collaborations])

  return <DashboardPage>
    <DashboardHeader eyebrow={`Creator overview · ${new Intl.DateTimeFormat('en', { weekday:'long', month:'long', day:'numeric' }).format(new Date())}`} title={`Welcome back, ${user?.displayName?.split(' ')[0] || 'Creator'}.`} copy="Live work, requests, payments and audience-facing performance from your connected channel." action={<Button variant="pink" onClick={()=>navigate('/creator/portfolio')}><Plus size={15}/>Add portfolio work</Button>} />
    {overview.error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-300/20 bg-red-300/[.06] p-4 text-xs text-red-200"><span>{overview.error}</span><Button size="sm" variant="outline" onClick={overview.reload}>Retry</Button></div>}
    {overview.loading ? <DashboardLoading /> : <OverviewMetrics analytics={overview.analytics} accent="pink" />}
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
      <PerformancePanel analytics={overview.analytics} range={range} onRange={setRange} role="creator" />
      <DashboardPanel title="Active collaborations" className="h-full"><CampaignRows items={active} role="creator" onOpen={(id)=>navigate(`/creator/collaborations/${id}`)} /></DashboardPanel>
      <DashboardPanel title="Incoming work requests" action={<Button size="sm" variant="ghost" onClick={()=>navigate('/creator/work-requests')}>View all<ArrowUpRight size={12}/></Button>}><RequestRows items={campaignInvitations.filter((item)=>item.backendStatus==='PENDING')} emptyTitle="No incoming work requests" onOpen={()=>navigate('/creator/work-requests')} /></DashboardPanel>
      <DashboardPanel title="Sent campaign requests" action={<Button size="sm" variant="ghost" onClick={()=>navigate('/creator/proposals')}>View all<ArrowUpRight size={12}/></Button>}><RequestRows items={creatorProposals} emptyTitle="No sent work requests" onOpen={()=>navigate('/creator/proposals')} /></DashboardPanel>
      <DashboardPanel title="Upcoming deadlines">{deadlines.length ? <div className="space-y-2">{deadlines.map((item)=><button type="button" key={item.id} onClick={()=>navigate(`/creator/collaborations/${item.id}`)} className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-white/[.04]"><span><strong className="block text-xs">{item.campaign?.title || 'Direct collaboration'}</strong><small className="mt-1 block text-white/35">{item.business.name}</small></span><Badge variant="pink">{date(item.contract?.publishBy || item.terms?.deadline)}</Badge></button>)}</div> : <EmptyState title="No upcoming deadlines" />}</DashboardPanel>
      <DashboardPanel title="Wallet summary"><strong className="text-3xl tracking-[-.05em]">{money(overview.wallet?.pendingBalance, overview.wallet?.currency)}</strong><p className="mt-2 text-xs text-white/35">Pending creator balance</p><div className="mt-5 flex justify-between border-t border-white/10 pt-4 text-xs"><span className="text-white/40">Gross earned</span><b>{money(overview.wallet?.grossEarned, overview.wallet?.currency)}</b></div><Button className="mt-4 w-full" variant="outline" onClick={()=>navigate('/creator/wallet')}><WalletCards size={14}/>Open wallet</Button></DashboardPanel>
      <DashboardPanel title="Recent messages" action={<Button size="sm" variant="ghost" onClick={()=>navigate('/creator/messages')}><MessageSquare size={13}/>Inbox</Button>}><MessageRows items={overview.conversations} onOpen={(conversationId)=>navigate('/creator/messages',{state:{conversationId}})} /></DashboardPanel>
      <DashboardPanel title="Quick actions"><div className="grid grid-cols-2 gap-3"><QuickAction icon={FolderPlus} label="Add portfolio" onClick={()=>navigate('/creator/portfolio')} /><QuickAction icon={Send} label="Find campaign" onClick={()=>navigate('/creator/discover')} /><QuickAction icon={MessageSquare} label="Messages" onClick={()=>navigate('/creator/messages')} /><QuickAction icon={WalletCards} label="Wallet" onClick={()=>navigate('/creator/wallet')} /></div></DashboardPanel>
    </div>
  </DashboardPage>
}

export function BusinessDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { campaigns, businessProposals } = useDashboardData()
  const [range, setRange] = useState('1M')
  const overview = useOverview('business', range)
  const active = useMemo(() => overview.collaborations.filter((item) => !['COMPLETED','CANCELLED'].includes(item.status)).slice(0, 5), [overview.collaborations])
  const openCampaigns = campaigns.filter((item)=>['OPEN','Active'].includes(item.backendStatus || item.status))

  return <DashboardPage>
    <DashboardHeader eyebrow={`Business overview · ${new Intl.DateTimeFormat('en', { month:'long', day:'numeric' }).format(new Date())}`} title="Campaign command." copy={`Live performance, spend and creator collaboration for ${user?.displayName || 'your business channel'}.`} action={<Button variant="pink" onClick={()=>navigate('/business/campaigns/new')}><FilePlus2 size={15}/>Create campaign</Button>} />
    {overview.error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-300/20 bg-red-300/[.06] p-4 text-xs text-red-200"><span>{overview.error}</span><Button size="sm" variant="outline" onClick={overview.reload}>Retry</Button></div>}
    {overview.loading ? <DashboardLoading /> : <OverviewMetrics analytics={overview.analytics} accent="mint" />}
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
      <PerformancePanel analytics={overview.analytics} range={range} onRange={setRange} role="business" />
      <DashboardPanel title="Campaign summary" className="h-full"><div className="grid grid-cols-3 divide-x divide-white/10 text-center"><span><strong className="block text-3xl">{campaigns.length}</strong><small className="text-white/35">Total</small></span><span><strong className="block text-3xl">{openCampaigns.length}</strong><small className="text-white/35">Open</small></span><span><strong className="block text-3xl">{businessProposals.filter((item)=>['SUBMITTED','SHORTLISTED','COUNTERED'].includes(item.backendStatus)).length}</strong><small className="text-white/35">Responses</small></span></div><Button className="mt-6 w-full" variant="outline" onClick={()=>navigate('/business/campaigns')}><BriefcaseBusiness size={14}/>Manage campaigns</Button></DashboardPanel>
      <DashboardPanel title="Active collaborations"><CampaignRows items={active} role="business" onOpen={(id)=>navigate(`/business/collaborations/${id}`)} /></DashboardPanel>
      <DashboardPanel title="Creator work requests" action={<Button size="sm" variant="ghost" onClick={()=>navigate('/business/proposals')}>View all<ArrowUpRight size={12}/></Button>}><RequestRows items={businessProposals} emptyTitle="No creator work requests" onOpen={()=>navigate('/business/proposals')} /></DashboardPanel>
      <DashboardPanel title="Recommended creators" action={<Button size="sm" variant="ghost" onClick={()=>navigate('/business/creators')}><UserPlus size={13}/>Browse all</Button>}>{overview.creators.length ? <div className="grid gap-2 sm:grid-cols-2">{overview.creators.map((creator)=><button type="button" key={creator.id} onClick={()=>navigate(`/creators/${creator.slug || creator.id}`)} className="group flex items-center gap-3 rounded-xl p-3 text-left hover:bg-white/[.05]"><Avatar src={creator.avatar} size="md" fallback={creator.name}/><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{creator.name}</strong><small className="block truncate text-white/35">{creator.niche || 'Creator'} · {creator.engagement} ER</small></span><ArrowUpRight size={14}/></button>)}</div> : <EmptyState title="No creator recommendations" />}</DashboardPanel>
      <DashboardPanel title="Funding snapshot"><strong className="text-3xl tracking-[-.05em]">{money(overview.analytics?.metrics?.funded)}</strong><p className="mt-2 text-xs text-white/35">Funded in selected period</p><div className="mt-5 flex justify-between border-t border-white/10 pt-4 text-xs"><span className="text-white/40">Released</span><b className="text-mint">{money(overview.analytics?.metrics?.released)}</b></div><Button className="mt-4 w-full" variant="outline" onClick={()=>navigate('/business/payments')}><WalletCards size={14}/>Open payments</Button></DashboardPanel>
      <DashboardPanel title="Recent messages" action={<Button size="sm" variant="ghost" onClick={()=>navigate('/business/messages')}><MessageSquare size={13}/>Inbox</Button>}><MessageRows items={overview.conversations} onOpen={(conversationId)=>navigate('/business/messages',{state:{conversationId}})} /></DashboardPanel>
      <DashboardPanel title="Quick actions"><div className="grid grid-cols-2 gap-3"><QuickAction icon={FilePlus2} label="New campaign" onClick={()=>navigate('/business/campaigns/new')} /><QuickAction icon={UserPlus} label="Find creators" onClick={()=>navigate('/business/creators')} /><QuickAction icon={BriefcaseBusiness} label="Work requests" onClick={()=>navigate('/business/proposals')} /><QuickAction icon={MessageSquare} label="Messages" onClick={()=>navigate('/business/messages')} /></div></DashboardPanel>
    </div>
  </DashboardPage>
}
