import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Download, FileSignature, MessageSquare, Search, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { contractApi } from '../../api/collaboration.api'
import { DashboardHeader, DashboardPage, DashboardPanel, StatusBadge } from '../../components/dashboard/DashboardUI'
import { Badge, Button, EmptyState, Input, Select, Spinner, Textarea, useToast } from '../../components/ui'
import { useDashboardData } from '../../context/dashboard-data-context'

const errorMessage = (error, fallback) => error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || fallback
const contractStatus = (status) => ({
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Awaiting signature',
  CHANGES_REQUESTED: 'Changes requested',
  ACTIVE: 'Active',
  TERMINATED: 'Terminated',
})[status] || status
const money = (value, currency = 'MNT') => value == null
  ? 'Not specified'
  : new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value))
const dateLabel = (value) => value ? new Date(value).toLocaleDateString() : 'Not scheduled'

export function ProposalListPage({ role = 'business' }) {
  const navigate = useNavigate()
  const { businessProposals, campaignInvitations } = useDashboardData()
  const items = role === 'creator' ? campaignInvitations : businessProposals
  const detailPath = (id) => role === 'creator' ? `/creator/invitations/${id}` : `/business/proposals/${id}`
  return <DashboardPage>
    <DashboardHeader eyebrow={role === 'creator' ? 'Opportunities' : 'Creator submissions'} title={role === 'creator' ? 'Invitations' : 'Creator work requests'} copy={role === 'creator' ? 'Review collaboration invitations and respond when the fit is right.' : 'Compare creator requests and commercial terms.'} />
    <DashboardPanel title={role === 'creator' ? 'Pending invitations' : 'Work request list'}>
      {items.length ? <div className="grid gap-3">{items.map((item) => <button type="button" key={item.id} onClick={() => navigate(detailPath(item.id))} className="group grid gap-3 rounded-xl border border-white/10 p-4 text-left transition hover:border-white/25 hover:bg-white/[.035] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <span className="min-w-0"><strong className="block truncate text-sm">{role === 'creator' ? item.title : item.creator}</strong><small className="mt-1 block truncate text-white/40">{role === 'creator' ? item.brand : item.campaign}</small></span>
        <span className="text-xs font-bold">{item.amount || item.budget}</span><StatusBadge status={item.status} />
      </button>)}</div> : <EmptyState title={role === 'creator' ? 'No direct invitations' : 'No creator work requests'} description={role === 'creator' ? 'Discover public campaigns while you wait for an invitation.' : 'Open a campaign to start receiving work requests.'} action={role === 'creator' ? 'Discover campaigns' : 'Open campaigns'} onAction={() => navigate(role === 'creator' ? '/creator/discover' : '/business/campaigns')} />}
    </DashboardPanel>
  </DashboardPage>
}

export function ProposalDetailPage({ role = 'business' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { businessProposals, campaignInvitations, decideProposal, respondInvitation } = useDashboardData()
  const source = role === 'creator' ? campaignInvitations : businessProposals
  const item = source.find((entry) => entry.id === id)
  const [counter, setCounter] = useState('')
  const [busy, setBusy] = useState(false)
  const back = role === 'creator' ? '/creator/invitations' : '/business/proposals'

  if (!item) return <DashboardPage><EmptyState title={role === 'creator' ? 'Invitation not found' : 'Work request not found'} action="Back" onAction={() => navigate(back)} /></DashboardPage>

  const decide = async (action) => {
    setBusy(true)
    try {
      if (role === 'creator') await respondInvitation(item.id, action)
      else await decideProposal(item.id, action, { counterAmount: counter })
      toast('Decision saved.', { type: 'success' })
      if (action !== 'COUNTER') navigate(back)
      setCounter('')
    } catch (error) {
      toast(errorMessage(error, 'The decision could not be saved.'), { type: 'error' })
    } finally { setBusy(false) }
  }

  return <DashboardPage>
    <button type="button" onClick={() => navigate(back)} className="mb-6 flex items-center gap-2 text-xs text-white/40 hover:text-white"><ArrowLeft size={14} />Back</button>
    <DashboardHeader eyebrow={role === 'creator' ? item.brand : item.campaign} title={role === 'creator' ? item.title : `${item.creator}'s work request`} copy={`${item.amount || item.budget} · ${item.submitted || item.sent || ''}`} action={<Button variant="outline" onClick={() => navigate(`/${role}/messages`)}><MessageSquare size={15} />Message</Button>} />
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <DashboardPanel title="Scope and approach"><p className="text-sm leading-7 text-white/60">{item.approach || item.message || 'Review the submitted campaign scope, timing and commercial terms before making a decision.'}</p></DashboardPanel>
      <DashboardPanel title="Decision"><StatusBadge status={item.status} /><div className="mt-4 grid gap-2"><Button variant="mint" loading={busy} onClick={() => decide('ACCEPT')}><Check size={15} />Accept</Button>{role === 'business' && <><Button variant="outline" disabled={busy} onClick={() => decide('SHORTLIST')}>Shortlist</Button><Input label="Counter offer" value={counter} onChange={(event) => setCounter(event.target.value)} placeholder="MNT 0" /><Button variant="outline" disabled={busy || !counter.trim()} onClick={() => decide('COUNTER')}>Send counter</Button></>}<Button variant="danger" disabled={busy} onClick={() => decide(role === 'creator' ? 'DECLINE' : 'REJECT')}><X size={15} />Decline</Button></div></DashboardPanel>
    </div>
  </DashboardPage>
}

export function CreatorProposalsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { creatorProposals, withdrawProposal } = useDashboardData()
  const [busyId, setBusyId] = useState('')
  const withdraw = async (id) => {
    setBusyId(id)
    try { await withdrawProposal(id); toast('Work request withdrawn.', { type: 'success' }) }
    catch (error) { toast(errorMessage(error, 'Work request could not be withdrawn.'), { type: 'error' }) }
    finally { setBusyId('') }
  }
  return <DashboardPage><DashboardHeader eyebrow="Creator submissions" title="Sent work requests" copy="Campaign work requests you sent appear here." />{creatorProposals.length ? <div className="grid gap-3">{creatorProposals.map((item) => <DashboardPanel key={item.id} title={item.campaign} action={<StatusBadge status={item.status} />}><p className="text-sm text-white/50">{item.business} · {item.amount} · {item.timeline}</p><div className="mt-5 flex gap-2"><Button size="sm" variant="outline" disabled={item.status === 'Withdrawn'} onClick={() => navigate(`/creator/campaigns/${item.campaignId}`)}>Edit request</Button><Button size="sm" variant="ghost" loading={busyId === item.id} disabled={item.status === 'Withdrawn'} onClick={() => withdraw(item.id)}>Withdraw</Button></div></DashboardPanel>)}</div> : <EmptyState title="No work requests yet" description="Discover a public campaign and send your first work request." action="Discover campaigns" onAction={() => navigate('/creator/discover')} />}</DashboardPage>
}

export function ContractListPage({ role }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async ({ cursor = null, append = false } = {}) => {
    append ? setLoadingMore(true) : setLoading(true)
    setError('')
    try {
      const result = await contractApi.list({ q: query.trim() || undefined, status: status || undefined, cursor: cursor || undefined, limit: 20 })
      setItems((current) => append ? [...current, ...result.items] : result.items)
      setNextCursor(result.nextCursor)
    } catch (reason) { setError(errorMessage(reason, 'Contracts could not be loaded.')) }
    finally { setLoading(false); setLoadingMore(false) }
  }, [query, status])

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 250)
    return () => window.clearTimeout(timer)
  }, [load])

  return <DashboardPage>
    <DashboardHeader eyebrow={`${role} channel`} title="Contracts" copy="Review persisted agreement status, commercial terms and collaboration progress." />
    <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
      <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input aria-label="Search contracts" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/20 pl-9 pr-3 text-xs outline-none focus:border-pink" placeholder="Search contract, campaign or participant" /></div>
      <Select aria-label="Filter contract status" value={status} onChange={(event) => setStatus(event.target.value)} options={[{ label: 'All statuses', value: '' }, { label: 'Awaiting signature', value: 'PENDING_APPROVAL' }, { label: 'Changes requested', value: 'CHANGES_REQUESTED' }, { label: 'Active', value: 'ACTIVE' }, { label: 'Terminated', value: 'TERMINATED' }]} />
    </div>
    {loading ? <div className="grid min-h-52 place-items-center"><Spinner label="Loading contracts" /></div> : error ? <EmptyState title="Contracts could not load" description={error} action="Retry" onAction={() => load()} /> : items.length ? <><div className="grid gap-3">{items.map((item) => {
      const party = role === 'creator' ? item.business : item.creator
      return <button type="button" key={item.id} onClick={() => navigate(`/${role}/contracts/${item.id}`)} className="group grid min-w-0 gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[.045] sm:p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(11rem,.65fr)_auto_auto] lg:items-center"><span className="min-w-0"><small className="text-[9px] font-bold uppercase tracking-[.14em] text-white/25">{item.id}</small><strong className="mt-1.5 block text-base font-bold sm:text-lg">{item.title}</strong><small className="mt-1.5 block text-[11px] text-white/35">{party?.name || 'Participant'} · Updated {dateLabel(item.updatedAt)}</small></span><span><small className="block text-[9px] uppercase tracking-[.12em] text-white/25">Contract value</small><b className="mt-1.5 block text-sm">{money(item.amount, item.currency)}</b></span><StatusBadge status={contractStatus(item.status)} /><span className="grid size-9 place-items-center rounded-full border border-white/10 text-white/35 transition group-hover:bg-white group-hover:text-black"><ArrowUpRight size={14} /></span></button>
    })}</div>{nextCursor && <div className="mt-5 flex justify-center"><Button variant="outline" loading={loadingMore} onClick={() => load({ cursor: nextCursor, append: true })}>Load more</Button></div>}</> : <EmptyState title="No contracts found" description={query || status ? 'Change the search or status filter and try again.' : 'A contract appears after collaboration terms are locked.'} />}
  </DashboardPage>
}

function Term({ label, value }) {
  return <section className="rounded-xl border border-black/10 p-3"><b className="text-[11px]">{label}</b><p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-4 opacity-60">{value || 'Not specified'}</p></section>
}

export function ContractDetailPage({ role }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await contractApi.get(id); setContract(result.contract) }
    catch (reason) { setError(errorMessage(reason, 'Contract could not be loaded.')) }
    finally { setLoading(false) }
  }, [id])
  useEffect(() => {
    let active = true
    contractApi.get(id)
      .then((result) => { if (active) setContract(result.contract) })
      .catch((reason) => { if (active) setError(errorMessage(reason, 'Contract could not be loaded.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const act = async (action) => {
    setBusy(action)
    try {
      const result = await contractApi.action(id, { action, ...(action === 'REQUEST_CHANGES' ? { note: note.trim() } : {}) })
      setContract(result.contract)
      setNote('')
      toast(action === 'APPROVE' ? 'Contract approval saved.' : 'Change request sent.', { type: 'success' })
    } catch (reason) { toast(errorMessage(reason, 'Contract action could not be saved.'), { type: 'error' }) }
    finally { setBusy('') }
  }
  const download = async () => {
    setBusy('download')
    try {
      const response = await contractApi.document(id, contract.currentVersion)
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `contract-${id}-v${contract.currentVersion}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
      toast('Contract PDF downloaded.', { type: 'success' })
    } catch (reason) { toast(errorMessage(reason, 'Contract PDF could not be downloaded.'), { type: 'error' }) }
    finally { setBusy('') }
  }

  if (loading) return <DashboardPage><div className="grid min-h-[50vh] place-items-center"><Spinner label="Loading contract" /></div></DashboardPage>
  if (error || !contract) return <DashboardPage><EmptyState title="Contract could not load" description={error} action="Retry" onAction={load} /></DashboardPage>

  const terms = contract.terms || {}
  const party = role === 'creator' ? contract.business : contract.creator
  const ownApproved = Boolean(contract.approvals?.[role])
  const canApprove = contract.status === 'PENDING_APPROVAL' && !ownApproved
  const canRequest = contract.status === 'PENDING_APPROVAL'
  const steps = [
    ['Terms locked', contract.currentVersion > 0],
    ['Creator approval', contract.approvals?.creator],
    ['Business approval', contract.approvals?.business],
    ['Contract active', contract.status === 'ACTIVE'],
  ]

  return <DashboardPage>
    <button type="button" onClick={() => navigate(`/${role}/contracts`)} className="mb-5 flex items-center gap-2 text-xs text-white/40 hover:text-white"><ArrowLeft size={14} />Back to contracts</button>
    <DashboardHeader eyebrow={`Contract ${contract.id}`} title={contract.title} copy={`${party?.name || 'Participant'} · Version ${contract.currentVersion}`} action={<Button variant="outline" loading={busy === 'download'} onClick={download}><Download size={15} />Download PDF</Button>} />
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)]">
      <DashboardPanel title="Agreement summary"><article className="rounded-xl bg-[#f4f2eb] p-5 text-black sm:p-6"><div className="flex flex-col justify-between gap-3 border-b border-black/10 pb-4 sm:flex-row"><div><p className="text-[9px] uppercase tracking-[.16em] opacity-45">Creator services agreement</p><h2 className="mt-2 text-xl font-bold">{contract.title}</h2><p className="mt-1 text-[11px] opacity-50">{contract.business.name} × {contract.creator.name}</p></div><div><small className="block text-[9px] uppercase tracking-[.12em] opacity-45">Contract value</small><strong className="mt-1 block text-lg">{money(contract.amount, contract.currency)}</strong></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Term label="Deliverables" value={terms.deliverables} /><Term label="Timeline" value={terms.finalTimeline || terms.timeline} /><Term label="Usage rights" value={terms.usageRights} /><Term label="Deadline" value={dateLabel(contract.deadline)} /><Term label="Revisions" value={`${contract.revisionLimit} included`} /><Term label="Payment" value={contract.payment?.status?.replaceAll('_', ' ')} /></div></article></DashboardPanel>
      <aside className="space-y-3"><DashboardPanel title="Contract status" action={<StatusBadge status={contractStatus(contract.status)} />}><div className="grid gap-2">{steps.map(([label, done], index) => <div key={label} className="flex items-center gap-2.5 rounded-lg border border-white/[.07] p-2.5 text-[11px]"><span className={`grid size-6 place-items-center rounded-full ${done ? 'bg-mint text-black' : 'border border-white/15 text-white/45'}`}>{done ? <Check size={11} /> : index + 1}</span><span className={done ? 'text-white' : 'text-white/45'}>{label}</span></div>)}</div>{canApprove && <Button size="sm" className="mt-4 w-full" variant="pink" loading={busy === 'APPROVE'} onClick={() => act('APPROVE')}><FileSignature size={14} />Approve contract</Button>}</DashboardPanel>{canRequest && <DashboardPanel title="Request changes"><Textarea label="Required change" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe the exact contract change (minimum 3 characters)." /><Button size="sm" className="mt-3 w-full" variant="outline" loading={busy === 'REQUEST_CHANGES'} disabled={note.trim().length < 3} onClick={() => act('REQUEST_CHANGES')}>Send request</Button></DashboardPanel>}</aside>
    </div>
    <DashboardPanel className="mt-5" title="Collaboration workspace" action={<Badge variant="mint">Server persisted</Badge>}><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm font-bold">Continue the real project workflow</p><p className="mt-1 text-xs text-white/40">Tasks, files, deliverables, messages, payment and activity live in the shared workspace.</p></div><Button variant="mint" onClick={() => navigate(`/${role}/collaborations/${contract.collaborationId}`)}>Open workspace <ArrowUpRight size={14} /></Button></div></DashboardPanel>
  </DashboardPage>
}
