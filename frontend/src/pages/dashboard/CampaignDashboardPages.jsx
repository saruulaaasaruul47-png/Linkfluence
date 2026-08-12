import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, FilePlus2, MessageSquare, Send, Sparkles, Trash2, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { DashboardHeader, DashboardPage, DashboardPanel, Progress } from '../../components/dashboard/DashboardUI'
import { Badge, Button, Checkbox, Dialog, EmptyState, Input, Select, SpotlightCard, Textarea, useToast } from '../../components/ui'
import { useCollaboration } from '../../context/collaboration-context'
import { useDashboardData } from '../../context/dashboard-data-context'
import { campaignApi } from '../../api/campaign.api'
import { mediaApi } from '../../api/media.api'

const campaignFilters = ['All', 'Active', 'Review', 'Draft', 'Completed']
const wizardSteps = ['Basics', 'Audience', 'Deliverables', 'Budget & review']
const campaignFallbackImage = 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=85'

function campaignImage() {
  return campaignFallbackImage
}

function campaignTone(status) {
  if (status === 'Completed' || status === 'Active') return 'mint'
  if (status === 'Draft') return 'outline'
  return 'pink'
}

export function CampaignListPage({ role }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const { campaigns } = useDashboardData()
  const visibleFilters = role === 'creator'
    ? ['All', 'Active', 'Review', 'Completed']
    : campaignFilters
  const items = useMemo(
    () => campaigns.filter((item) => filter === 'All' || (filter === 'Active' ? item.status === 'Active' : item.status === filter)),
    [campaigns, filter],
  )

  return (
    <DashboardPage>
      <DashboardHeader
        eyebrow={`${role} channel`}
        title="Campaigns"
        copy={role === 'creator' ? 'Track deliverables, approvals and campaign progress.' : 'Create, review and manage creator campaigns from one clear workspace.'}
        action={role === 'business' ? <Button variant="pink" onClick={() => navigate('/business/campaigns/new')}><FilePlus2 size={15} />Create campaign</Button> : null}
      />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Campaign status">
        {visibleFilters.map((item) => (
          <button
            role="tab"
            aria-selected={filter === item}
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-full border px-4 py-2 text-xs transition ${filter === item ? 'border-pink bg-pink text-black' : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white'}`}
          >
            {item}
          </button>
        ))}
      </div>
      {items.length ? (
        <div className="campaign-card-grid grid gap-3">
          {items.map((item, index) => (
            <SpotlightCard
              as="button"
              type="button"
              key={item.id}
              onClick={() => navigate(`/${role}/campaigns/${item.id}`)}
              className="group relative min-h-[20.5rem] min-w-0 overflow-hidden rounded-[1.3rem] border border-white/15 bg-[#171717] text-left shadow-[0_16px_48px_rgba(0,0,0,.28)] transition duration-500 hover:-translate-y-1 hover:border-white/35"
            >
              <img src={campaignImage(item)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-72 transition duration-700 group-hover:scale-[1.045] group-hover:opacity-88" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/28 via-black/12 to-black/88" />
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-pink/28 via-pink/8 to-transparent mix-blend-screen" />
              <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/30 bg-black/25 text-[9px] font-bold tracking-[.1em] text-white/75 backdrop-blur-xl">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Badge variant={campaignTone(item.status)} className="shadow-[0_10px_30px_rgba(0,0,0,.25)]">{item.status}</Badge>
              </div>
              <div className="absolute inset-x-3 bottom-3 rounded-[1.05rem] border border-white/20 bg-black/45 p-3 backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.12em] text-white/50">
                      <Sparkles size={10} />
                      {role === 'creator' ? item.business : item.creator}
                    </p>
                    <h2 className="mt-1 line-clamp-2 text-[clamp(1.25rem,1.55vw,1.65rem)] font-black leading-[.95] tracking-[-.045em] text-white">{item.title}</h2>
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-black transition group-hover:bg-pink">
                    <ArrowRight size={13} />
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <span className="min-w-0 rounded-xl border border-white/10 bg-white/[.08] p-2">
                    <i className="block truncate text-[8px] not-italic text-white/38">Budget</i>
                    <b className="mt-0.5 block truncate text-[11px] text-white">{item.budget}</b>
                  </span>
                  <span className="min-w-0 rounded-xl border border-white/10 bg-white/[.08] p-2">
                    <i className="block truncate text-[8px] not-italic text-white/38">Deadline</i>
                    <b className="mt-0.5 block truncate text-[11px] text-white">{item.deadline}</b>
                  </span>
                  <span className="min-w-0 rounded-xl border border-white/10 bg-white/[.08] p-2">
                    <i className="block truncate text-[8px] not-italic text-white/38">Work</i>
                    <b className="mt-0.5 block truncate text-[11px] text-white">{item.deliverables}</b>
                  </span>
                </div>
                <div className="mt-3">
                  <div className="mb-1.5 flex justify-between text-[10px] font-semibold text-white/48"><span>Campaign progress</span><span>{item.progress}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-pink shadow-[0_0_18px_rgba(255,118,189,.35)]" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-white/15 p-6 text-center">
          <div>
            <p className="text-sm text-white/45">No {filter.toLowerCase()} campaigns.</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate(role === 'creator' ? '/search/campaigns' : '/business/campaigns/new')}
            >
              {role === 'creator' ? 'Discover campaigns' : 'Create campaign'}
            </Button>
          </div>
        </div>
      )}
    </DashboardPage>
  )
}

export function ProposalDialog({ open, onClose, campaign }) {
  const { toast } = useToast()
  const { creatorProposals, submitProposal } = useDashboardData()
  const existing = creatorProposals.find((item) => item.campaignId === campaign.id)
  const [data, setData] = useState(() => ({ approach: existing?.approach || '', amount: existing?.amount || '', timeline: existing?.timeline || '', deliverables: existing?.deliverables || '' }))
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const set = (name) => (event) => setData((value) => ({ ...value, [name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (data.approach.trim().length < 30) next.approach = 'Add at least 30 characters about your creative approach.'
    if (!data.amount) next.amount = 'Add your proposed amount.'
    if (!data.timeline) next.timeline = 'Add an estimated timeline.'
    setErrors(next)
    if (Object.keys(next).length) return
    setLoading(true)
    try {
      await submitProposal(campaign, data)
      toast(existing ? 'Work request updated.' : 'Work request sent.', { type: 'success' })
      onClose()
    } catch (error) {
      toast(error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Work request could not be saved.', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog dark open={open} onClose={onClose} title={`${existing ? 'Update' : 'Send'} work request · ${campaign.title}`} description="Share a concise approach and commercial terms with this campaign.">
      <form onSubmit={submit} className="space-y-4">
        <Textarea label="Creative approach" value={data.approach} onChange={set('approach')} error={errors.approach} placeholder="How would you make this campaign useful and distinctive for your audience?" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Proposed amount" value={data.amount} onChange={set('amount')} error={errors.amount} placeholder="MNT 0" />
          <Input label="Timeline" value={data.timeline} onChange={set('timeline')} error={errors.timeline} placeholder="e.g. 3 weeks" />
        </div>
        <Textarea label="Deliverable notes" value={data.deliverables} onChange={set('deliverables')} placeholder="Clarify inclusions, revision rounds or production needs." />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="pink" loading={loading}><Send size={15} />{existing ? 'Update request' : 'Send request'}</Button>
        </div>
      </form>
    </Dialog>
  )
}

export function CampaignDetailPage({ role }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [proposalOpen, setProposalOpen] = useState(false)
  const { workspaces } = useCollaboration()
  const { campaigns, creatorProposals, updateCampaign, deleteCampaign } = useDashboardData()
  const { toast } = useToast()
  const item = campaigns.find((campaign) => campaign.id === id)
  if (!item) return <DashboardPage><EmptyState title="Campaign not found" description="This campaign may have been removed or is no longer available." action="Back to campaigns" onAction={() => navigate(`/${role}/campaigns`)} /></DashboardPage>
  const existingProposal = creatorProposals.find((proposal) => proposal.campaignId === item.id)
  const workspace = workspaces.find((entry) => entry.campaign.id === item.id || entry.campaign.title === item.title)
  const primary = role === 'creator'
    ? <Button variant="pink" onClick={() => setProposalOpen(true)}><Send size={15} />{existingProposal ? 'Edit request' : 'Send work request'}</Button>
    : <Button variant="pink" onClick={() => navigate('/business/proposals')}><MessageSquare size={15} />Review requests</Button>

  return (
    <DashboardPage>
      <button onClick={() => navigate(`/${role}/campaigns`)} className="mb-6 flex items-center gap-2 text-xs text-white/40 hover:text-white">
        <ArrowLeft size={14} />Back to campaigns
      </button>
      <DashboardHeader
        eyebrow={`${item.status} campaign`}
        title={item.title}
        copy={`${item.business} × ${item.creator}`}
        action={primary}
        secondary={workspace ? <Button variant="outline" onClick={() => navigate(`/${role}/collaborations/${workspace.id}`)}>Open workspace</Button> : null}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <DashboardPanel title="Campaign overview">
            <div className="grid gap-5 sm:grid-cols-3">
              <span><i className="text-xs not-italic text-white/30">Budget</i><b className="mt-2 block text-xl">{item.budget}</b></span>
              <span><i className="text-xs not-italic text-white/30">Deadline</i><b className="mt-2 block text-xl">{item.deadline}</b></span>
              <span><i className="text-xs not-italic text-white/30">Platform</i><b className="mt-2 block text-xl">{item.platform}</b></span>
            </div>
            <div className="mt-7">
              <div className="mb-2 flex justify-between text-xs"><span className="text-white/35">Overall progress</span><b>{item.progress}%</b></div>
              <Progress value={item.progress} />
            </div>
          </DashboardPanel>
          <DashboardPanel title="Deliverables & milestones">
            {[
              ['Creative treatment', 'Approved', 'Jul 28'],
              ['First content draft', 'In review', 'Aug 12'],
              ['Final delivery', 'Upcoming', item.deadline],
            ].map(([title, status, date], index) => (
              <div key={title} className="flex items-center gap-4 border-b border-white/10 py-4 last:border-0">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${index === 0 ? 'bg-mint text-black' : 'border border-white/15'}`}>{index === 0 ? <Check size={14} /> : index + 1}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{title}</strong><small className="text-white/35">{date}</small></span>
                <Badge variant={index === 0 ? 'mint' : 'outline'}>{status}</Badge>
              </div>
            ))}
          </DashboardPanel>
          <DashboardPanel title="Activity">
            <div className="space-y-4">
              {['Sarnai approved the visual direction.', 'Amara uploaded 6 new files.', 'Milestone deadline moved to Aug 12.'].map((text, index) => (
                <div key={text} className="flex gap-3">
                  <i className="mt-1 size-2 shrink-0 rounded-full bg-pink" />
                  <span><p className="text-xs">{text}</p><small className="text-white/30">{index + 1} day ago</small></span>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>
        <aside className="space-y-5">
          <DashboardPanel title="People">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2"><span className="truncate">{item.business}</span><Badge variant="outline">Business</Badge></div>
              <div className="flex items-center justify-between gap-2"><span className="truncate">{item.creator}</span><Badge variant="pink">Creator</Badge></div>
            </div>
          </DashboardPanel>
          <DashboardPanel title="Quick facts">
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2"><CalendarDays size={14} className="text-pink" />{item.deadline}</div>
              <div className="flex items-center gap-2"><Users size={14} className="text-mint" />2 collaborators</div>
              <p className="break-words leading-5 text-white/35">{item.deliverables}</p>
            </div>
          </DashboardPanel>
          {role === 'business' && <DashboardPanel title="Campaign controls"><div className="grid gap-3"><Input label="Campaign title" value={item.title} onChange={(event)=>updateCampaign(item.id,{title:event.target.value})}/><Input label="Budget" value={item.budget} onChange={(event)=>updateCampaign(item.id,{budget:event.target.value})}/><Input label="Deliverables" value={item.deliverables} onChange={(event)=>updateCampaign(item.id,{deliverables:event.target.value})}/><Select label="Status" value={item.status} onChange={(event) => { updateCampaign(item.id, { status: event.target.value }); toast('Campaign status updated.', { type: 'success' }) }} options={['Draft', 'Active', 'Paused', 'Closed', 'Completed']} /><Input type="date" label="Application deadline" value={item.deadline?.includes('-') ? item.deadline : ''} onChange={(event) => updateCampaign(item.id, { deadline: event.target.value })} /><Button variant="outline" onClick={() => { if (!window.confirm('Delete this local campaign draft?')) return; deleteCampaign(item.id); navigate('/business/campaigns'); toast('Campaign deleted.', { type: 'success' }) }}>Delete campaign</Button></div></DashboardPanel>}
        </aside>
      </div>
      {role === 'creator' && <ProposalDialog open={proposalOpen} onClose={() => setProposalOpen(false)} campaign={item} />}
    </DashboardPage>
  )
}

export function CreateCampaignPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({ title: '', goal: '', niche: '', summary: '', audience: '', location: '', platform: '', audienceSize: '', deliverables: '', usage: '', rounds: '', guardrails: '', budget: '', deadline: '', open: true, productSupportProvided: false, productSupportDescription: '', productSupportValue: '', productSupportCurrency: 'MNT' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [briefFiles, setBriefFiles] = useState([])
  const [briefKind, setBriefKind] = useState('BRIEF')
  const navigate = useNavigate()
  const { toast } = useToast()
  const { addCampaign } = useDashboardData()
  const set = (name) => (event) => setData((value) => ({ ...value, [name]: event?.target?.type === 'checkbox' ? event.target.checked : event.target.value }))
  const pickBriefFiles = (event) => {
    const files = Array.from(event.target.files || [])
    setBriefFiles((current) => [...current, ...files.map((file) => ({ id: `${Date.now()}-${Math.random()}`, file, kind: briefKind }))])
    event.target.value = ''
  }
  const removeBriefFile = (id) => setBriefFiles((current) => current.filter((entry) => entry.id !== id))

  const validate = () => {
    const next = {}
    if (step === 0) {
      if (!data.title) next.title = 'Campaign title is required.'
      if (!data.goal) next.goal = 'Choose a campaign goal.'
      if (!data.niche) next.niche = 'Choose a primary niche.'
    }
    if (step === 1 && !data.platform) next.platform = 'Choose a primary platform.'
    if (step === 2 && !data.deliverables) next.deliverables = 'Describe the expected deliverables.'
    if (step === 3) {
      if (!data.budget) next.budget = 'Add a budget range.'
      if (!data.deadline) next.deadline = 'Choose an application deadline.'
    }
    setErrors(next)
    return !Object.keys(next).length
  }

  const next = () => {
    if (!validate()) return
    setErrors({})
    setStep((value) => Math.min(3, value + 1))
  }
  const finish = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const campaign = await addCampaign(data)
      for (const entry of briefFiles) {
        try {
          const uploaded = await mediaApi.upload(entry.file, 'CAMPAIGN_BRIEF')
          await campaignApi.addAttachment(campaign.id, {
            mediaAssetId: uploaded.asset.id,
            name: entry.file.name,
            url: uploaded.asset.url,
            mimeType: uploaded.asset.mimeType,
            sizeBytes: uploaded.asset.sizeBytes,
            kind: entry.kind,
          })
        } catch {
          toast(`"${entry.file.name}" could not be attached.`, { type: 'error' })
        }
      }
      toast('Campaign draft created.', { type: 'success' })
      navigate('/business/campaigns')
    } catch (error) {
      toast(error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Campaign could not be created.', { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardPage>
      <button onClick={() => navigate('/business/campaigns')} className="mb-6 flex items-center gap-2 text-xs text-white/40 hover:text-white"><ArrowLeft size={14} />Exit wizard</button>
      <DashboardHeader eyebrow={`Step ${step + 1} of ${wizardSteps.length}`} title="Create campaign" copy="Build a clear creator brief. The campaign stays private until you publish it." />
      <div className="grid gap-7 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside>
          <ol className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2">
            {wizardSteps.map((item, index) => (
              <li key={item} className="min-w-max lg:min-w-0">
                <button disabled={index > step + 1} onClick={() => setStep(index)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-35 ${index === step ? 'bg-white/10 text-white' : 'text-white/35 hover:bg-white/[.04]'}`}>
                  <span className={`grid size-7 place-items-center rounded-full border ${index < step ? 'border-mint bg-mint text-black' : 'border-white/15'}`}>{index < step ? <Check size={13} /> : index + 1}</span>{item}
                </button>
              </li>
            ))}
          </ol>
        </aside>
        <DashboardPanel title={wizardSteps[step]} className="min-h-[30rem]">
          <div className="grid gap-4 sm:grid-cols-2">
            {step === 0 && <>
              <Input className="sm:col-span-2" label="Campaign title" value={data.title} onChange={set('title')} placeholder="A memorable working title" error={errors.title} />
              <Select label="Campaign goal" value={data.goal} onChange={set('goal')} options={['Awareness', 'Product launch', 'Content library', 'App adoption', 'Community growth']} error={errors.goal} />
              <Select label="Primary niche" value={data.niche} onChange={set('niche')} options={['Fashion', 'Beauty', 'Travel', 'Food', 'Technology', 'Wellness']} error={errors.niche} />
              <Textarea className="sm:col-span-2" label="Campaign summary" value={data.summary} onChange={set('summary')} placeholder="Context, creative opportunity and what success looks like." />
            </>}
            {step === 1 && <>
              <Input label="Target audience" value={data.audience} onChange={set('audience')} placeholder="e.g. Urban professionals 22-34" />
              <Input label="Location" value={data.location} onChange={set('location')} placeholder="Mongolia · Nationwide" />
              <Select label="Primary platform" value={data.platform} onChange={set('platform')} options={['Instagram', 'TikTok', 'YouTube', 'Multi-platform']} error={errors.platform} />
              <Input label="Audience size preference" value={data.audienceSize} onChange={set('audienceSize')} placeholder="100K-300K" />
            </>}
            {step === 2 && <>
              <Textarea className="sm:col-span-2" label="Deliverables" value={data.deliverables} onChange={set('deliverables')} placeholder="2 Reels, 4 Stories, 8 edited stills..." error={errors.deliverables} />
              <Input label="Usage rights" value={data.usage} onChange={set('usage')} placeholder="Organic social · 3 months" />
              <Input label="Approval rounds" value={data.rounds} onChange={set('rounds')} placeholder="2 rounds" />
              <Textarea className="sm:col-span-2" label="Creative guardrails" value={data.guardrails} onChange={set('guardrails')} placeholder="Must-haves, avoidances and required disclosures." />
              <div className="sm:col-span-2 rounded-2xl border border-white/10 p-4">
                <Checkbox label="Product or sample support provided" description="Turn on if the creator receives a free product, sample or service to feature." checked={data.productSupportProvided} onChange={set('productSupportProvided')} />
                {data.productSupportProvided && <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Textarea className="sm:col-span-2" label="What will be provided" value={data.productSupportDescription} onChange={set('productSupportDescription')} placeholder="e.g. 1 hero product + shipping" />
                  <Input label="Estimated value" value={data.productSupportValue} onChange={set('productSupportValue')} placeholder="150000" />
                  <Input label="Currency" value={data.productSupportCurrency} onChange={set('productSupportCurrency')} placeholder="MNT" />
                </div>}
              </div>
              <div className="sm:col-span-2 rounded-2xl border border-white/10 p-4">
                <p className="mb-3 text-xs text-white/50">Brief & brand guideline files</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Select className="w-44" label="" aria-label="File type" value={briefKind} onChange={(event) => setBriefKind(event.target.value)} options={[{ label: 'Brief', value: 'BRIEF' }, { label: 'Brand guideline', value: 'BRAND_GUIDELINE' }, { label: 'Reference', value: 'REFERENCE' }]} />
                  <input type="file" multiple accept="image/*,.pdf" onChange={pickBriefFiles} className="block text-xs text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-white" />
                </div>
                {briefFiles.length > 0 && <ul className="mt-3 space-y-2">
                  {briefFiles.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[.04] px-3 py-2 text-xs">
                      <span className="min-w-0 truncate">{entry.file.name}<span className="ml-2 text-white/30">{entry.kind.replaceAll('_', ' ').toLowerCase()}</span></span>
                      <button type="button" onClick={() => removeBriefFile(entry.id)} aria-label={`Remove ${entry.file.name}`}><Trash2 size={13} className="text-white/40 hover:text-white" /></button>
                    </li>
                  ))}
                </ul>}
              </div>
            </>}
            {step === 3 && <>
              <Input label="Budget range" value={data.budget} onChange={set('budget')} placeholder="MNT 10M-15M" error={errors.budget} />
              <Input type="date" label="Application deadline" value={data.deadline} onChange={set('deadline')} error={errors.deadline} />
              <div className="sm:col-span-2 rounded-2xl border border-white/10 p-4">
                <Checkbox label="Open campaign" description="Verified creators can send work requests. Turn off for invite-only mode." checked={data.open} onChange={set('open')} />
              </div>
              <div className="sm:col-span-2 rounded-2xl bg-mint-soft p-5 text-black">
                <p className="eyebrow opacity-45">Draft summary</p>
                <h3 className="mt-3 break-words text-2xl font-bold">{data.title || 'Untitled campaign'}</h3>
                <p className="mt-2 text-sm opacity-60">{data.goal || 'Goal'} · {data.niche || 'Niche'} · {data.budget || 'Budget pending'}</p>
              </div>
            </>}
          </div>
          <div className="mt-9 flex justify-between border-t border-white/10 pt-5">
            <Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep((value) => value - 1)}>Back</Button>
            <Button variant={step === 3 ? 'pink' : 'primary'} loading={saving} onClick={() => step === 3 ? finish() : next()}>{step === 3 ? 'Save campaign draft' : 'Continue'}{!saving && <ChevronRight size={15} />}</Button>
          </div>
        </DashboardPanel>
      </div>
    </DashboardPage>
  )
}
