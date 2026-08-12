import { useEffect, useState } from 'react'
import { AlertTriangle, BellRing, CircleDollarSign, ExternalLink, Flag, Save, Search, Send, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdminHeader, AdminPage, AdminPanel, StatusBadge } from '../../components/admin/AdminUI'
import { Badge, Button, Input, Select, Switch, Tabs, Textarea, useToast } from '../../components/ui'
import { adminApi } from '../../api/dashboard.api'

export function AdminOperationsPage() {
  const navigate = useNavigate()
  const [state, setState] = useState({ cases: [], payouts: [], offers: [], collaborations: [], content: [], loading: true, error: '' })
  useEffect(() => {
    let active = true
    Promise.all([
      adminApi.list('cases', { status: 'OPEN', page: 1, limit: 100 }),
      adminApi.list('payouts', { status: 'PENDING', page: 1, limit: 100 }),
      adminApi.list('offers', { page: 1, limit: 8 }),
      adminApi.list('collaborations', { page: 1, limit: 8 }),
      adminApi.list('content', { page: 1, limit: 8 }),
    ]).then(([caseResult, payoutResult, offerResult, collaborationResult, contentResult]) => {
      if (active) setState({ cases: caseResult.items || [], payouts: payoutResult.items || [], offers: offerResult.items || [], collaborations: collaborationResult.items || [], content: contentResult.items || [], loading: false, error: '' })
    }).catch((error) => {
      if (active) setState({ cases: [], payouts: [], offers: [], collaborations: [], content: [], loading: false, error: error.response?.data?.error?.message || 'Operations queue could not be loaded.' })
    })
    return () => { active = false }
  }, [])
  const byKind = (kind) => state.cases.filter((item) => item.kind === kind).length
  const queues = [
    ['Disputes', byKind('DISPUTE'), '/admin/disputes', AlertTriangle, 'pink'],
    ['Reports', byKind('REPORT'), '/admin/reports', Flag, 'pink'],
    ['Content moderation', byKind('MODERATION'), '/admin/content-moderation', ShieldCheck, 'mint'],
    ['Verifications', byKind('VERIFICATION'), '/admin/verifications', UserRoundCheck, 'mint'],
    ['Pending payouts', state.payouts.length, '/admin/finance/wallet', CircleDollarSign, 'mint'],
  ]
  return <AdminPage>
    <AdminHeader eyebrow="System · Live triage" title="Admin operations" copy="Open queues across trust & safety and finance, pulled live from the platform." date={false} />
    {state.error && <p role="alert" className="mb-4 text-xs text-red-200">{state.error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {queues.map(([label, count, to, Icon, accent]) => (
        <button type="button" key={label} onClick={() => navigate(to)} className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-4 text-left transition hover:border-white/25 hover:bg-white/[.03]">
          <div className="flex items-center justify-between">
            <span className={`grid size-9 place-items-center rounded-full ${accent === 'mint' ? 'bg-mint/10 text-mint' : 'bg-pink/10 text-pink'}`}><Icon size={16} /></span>
            <ExternalLink size={14} className="text-white/25" />
          </div>
          <strong className="mt-4 block text-3xl tracking-[-.05em]">{state.loading ? '—' : count}</strong>
          <p className="mt-1 text-xs text-white/40">{label}</p>
        </button>
      ))}
    </div>
    <AdminPanel className="mt-5" title="Open trust cases">
      {state.loading ? <p className="text-xs text-white/35">Loading…</p> : state.cases.length ? <div className="space-y-2">{state.cases.slice(0, 10).map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.08] p-3 text-xs">
          <span className="min-w-0 flex-1"><strong className="block truncate">{item.reason}</strong><small className="text-white/35">{item.targetType} · {item.targetId}</small></span>
          <Badge variant="outline">{item.kind}</Badge>
          <StatusBadge status={item.status.replaceAll('_', ' ')} />
        </div>
      ))}</div> : <p className="text-xs text-white/35">No open cases — the queue is clear.</p>}
    </AdminPanel>
    <div className="mt-5 grid gap-5 xl:grid-cols-3">
      <AdminPanel title={`Offers · ${state.offers.length}`}>
        <div className="space-y-2">{state.offers.slice(0, 6).map((item) => <div key={item.id} className="rounded-xl border border-white/[.08] p-3 text-xs"><strong className="block truncate">{item.title}</strong><span className="mt-1 flex justify-between gap-2 text-white/35"><span className="truncate">{item.business?.companyName} → {item.creator?.channelName}</span><StatusBadge status={item.status.replaceAll('_', ' ')} /></span></div>)}{!state.loading && !state.offers.length && <p className="text-xs text-white/35">No offers yet.</p>}</div>
      </AdminPanel>
      <AdminPanel title={`Collaborations · ${state.collaborations.length}`}>
        <div className="space-y-2">{state.collaborations.slice(0, 6).map((item) => <div key={item.id} className="rounded-xl border border-white/[.08] p-3 text-xs"><strong className="block truncate">{item.campaign?.title || `Workspace ${item.id.slice(-6)}`}</strong><span className="mt-1 flex justify-between gap-2 text-white/35"><span className="truncate">{item.business?.companyName} × {item.creator?.channelName}</span><StatusBadge status={item.status.replaceAll('_', ' ')} /></span></div>)}{!state.loading && !state.collaborations.length && <p className="text-xs text-white/35">No collaborations yet.</p>}</div>
      </AdminPanel>
      <AdminPanel title={`Recent content · ${state.content.length}`}>
        <div className="space-y-2">{state.content.slice(0, 6).map((item) => <button type="button" onClick={() => navigate('/admin/content-moderation')} key={item.id} className="block w-full rounded-xl border border-white/[.08] p-3 text-left text-xs hover:border-white/20"><strong className="block truncate">{item.title || item.caption}</strong><span className="mt-1 flex justify-between gap-2 text-white/35"><span>{item.creator?.channelName || item.business?.companyName}</span><StatusBadge status={item.hiddenAt ? 'HIDDEN' : item.status} /></span></button>)}{!state.loading && !state.content.length && <p className="text-xs text-white/35">No content yet.</p>}</div>
      </AdminPanel>
    </div>
  </AdminPage>
}

const searchResources = [
  ['users', 'User', (row) => row.displayName || row.username || row.email, (row) => `/admin/users/${row.id}`],
  ['channels', 'Channel', (row) => row.channelName || row.companyName, (row) => `/admin/channels/${row.id}`],
  ['campaigns', 'Campaign', (row) => row.title, (row) => `/admin/campaigns/${row.id}`],
  ['contracts', 'Contract', (row) => row.id, (row) => `/admin/contracts/${row.id}`],
]

export function AdminSearchPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (query.trim().length < 2) return undefined
    let active = true
    Promise.resolve().then(() => { if (active) setLoading(true) })
    Promise.all(searchResources.map(([resource]) => adminApi.list(resource, { q: query, page: 1, limit: 8 }).then((data) => data.items || []).catch(() => [])))
      .then((groups) => {
        if (!active) return
        const combined = groups.flatMap((items, index) => {
          const [resource, kind, title, path] = searchResources[index]
          return items.map((item) => ({ id: `${resource}-${item.id}`, kind, title: title(item), path: path(item), meta: item.email || item.status || item.slug || '' }))
        })
        setResults(combined)
        setLoading(false)
      })
    return () => { active = false }
  }, [query])
  const visibleResults = query.trim().length < 2 ? [] : results
  return <AdminPage>
    <AdminHeader eyebrow="System · Global search" title="Search" copy="Search live users, channels, campaigns and contracts from one place." date={false} />
    <div className="relative mb-5"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} /><input autoFocus aria-label="Admin global search" value={query} onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {})} placeholder="Search name, email, campaign or contract…" className="h-14 w-full rounded-2xl border border-white/10 bg-[#151515] pl-11 pr-4 text-sm outline-none focus:border-pink" /></div>
    <AdminPanel title={loading ? 'Searching…' : `${visibleResults.length} result${visibleResults.length === 1 ? '' : 's'}`}>
      {visibleResults.map((item) => <button type="button" key={item.id} onClick={() => navigate(item.path)} className="flex w-full items-center gap-3 border-b border-white/[.07] py-4 text-left last:border-0 hover:bg-white/[.025]"><Badge variant="outline">{item.kind}</Badge><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><small className="text-white/35">{item.meta}</small></span><ExternalLink size={14} className="text-white/30" /></button>)}
      {!loading && query.trim().length >= 2 && !visibleResults.length && <p className="py-6 text-center text-xs text-white/35">No matching records.</p>}
      {query.trim().length < 2 && <p className="py-6 text-center text-xs text-white/35">Type at least 2 characters to search.</p>}
    </AdminPanel>
  </AdminPage>
}

export function AdminNotificationsPage() {
  const { toast } = useToast()
  const [form, setForm] = useState({ title: '', audience: 'ALL', message: '', reason: '' })
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState({ items: [], loading: true })
  const loadHistory = () => {
    adminApi.list('audit', { q: 'ANNOUNCEMENT_CREATED', page: 1, limit: 20 })
      .then((data) => setHistory({ items: data.items || [], loading: false }))
      .catch(() => setHistory({ items: [], loading: false }))
  }
  useEffect(loadHistory, [])
  const send = async () => {
    if (!form.title.trim() || !form.message.trim() || !form.reason.trim()) {
      toast('Title, message and admin reason are required.', { type: 'error' })
      return
    }
    setSending(true)
    try {
      const result = await adminApi.announce({ title: form.title.trim(), body: form.message.trim(), audience: form.audience, reason: form.reason.trim() })
      toast(`Announcement sent to ${result.recipients} recipient(s).`, { type: 'success' })
      setForm({ title: '', audience: 'ALL', message: '', reason: '' })
      loadHistory()
    } catch (error) {
      toast(error.response?.data?.error?.message || 'Announcement could not be sent.', { type: 'error' })
    } finally {
      setSending(false)
    }
  }
  return <AdminPage>
    <AdminHeader eyebrow="System · Communication center" title="Notifications" copy="Send a real in-app announcement to active users." date={false} />
    <div className="grid gap-5 xl:grid-cols-[1fr_.72fr]">
      <AdminPanel title="Compose announcement">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} />
          <Select label="Audience" value={form.audience} onChange={(event) => setForm((value) => ({ ...value, audience: event.target.value }))} options={[{ label: 'All users', value: 'ALL' }, { label: 'Creators', value: 'CREATOR' }, { label: 'Businesses', value: 'BUSINESS' }]} />
          <Textarea label="Message" rows={6} value={form.message} onChange={(event) => setForm((value) => ({ ...value, message: event.target.value }))} />
          <Textarea label="Admin reason (required, audit-logged)" rows={2} value={form.reason} onChange={(event) => setForm((value) => ({ ...value, reason: event.target.value }))} placeholder="Why is this announcement being sent?" />
          <div className="flex justify-end"><Button variant="pink" loading={sending} onClick={send}><Send size={14} />Send announcement</Button></div>
        </div>
      </AdminPanel>
      <AdminPanel title="Announcement history">
        {history.loading ? <p className="text-xs text-white/35">Loading…</p> : history.items.length ? <div className="space-y-3">{history.items.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-4"><div className="flex items-start gap-3"><BellRing size={16} className="mt-0.5 text-pink" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.after?.title || item.targetId}</strong><small className="text-white/35">{item.targetId} · {new Date(item.createdAt).toLocaleString()}</small></span><Badge variant="outline">{item.after?.recipients ?? '—'} sent</Badge></div></div>)}</div> : <p className="text-xs text-white/35">Sent announcements appear here.</p>}
      </AdminPanel>
    </div>
  </AdminPage>
}

export function AdminSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState(null)
  const [flags, setFlags] = useState([])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [flagDraft, setFlagDraft] = useState({ key: '', name: '', enabled: true })
  const reload = () => {
    setLoading(true)
    setLoadError('')
    Promise.all([adminApi.settings(), adminApi.featureFlags()])
      .then(([settingResult, flagResult]) => {
        setSettings(settingResult.settings || {})
        setFlags(flagResult.items || [])
      })
      .catch((error) => {
        const message=error.response?.data?.error?.message || 'Live configuration could not be loaded.'
        setSettings(null);setFlags([]);setLoadError(message);toast(message,{type:'error'})
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    let active = true
    Promise.all([adminApi.settings(), adminApi.featureFlags()])
      .then(([settingResult, flagResult]) => {
        if (!active) return
        setSettings(settingResult.settings || {})
        setFlags(flagResult.items || [])
      })
      .catch((error) => { if (active) { const message=error.response?.data?.error?.message || 'Live configuration could not be loaded.';setSettings(null);setFlags([]);setLoadError(message);toast(message,{type:'error'}) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [toast])
  const requireReason = () => {
    if (reason.trim().length < 5) { toast('Add an audit reason with at least 5 characters.', { type: 'error' }); return false }
    return window.confirm('Apply this live change? Its reason and before/after values will be audit-logged.')
  }
  const save = async () => {
    if (!settings || !requireReason()) return
    setSaving(true)
    try {
      const result = await adminApi.updateSettings({ settings: { ...settings, commission: Number(settings.commission), minimumPayout: Number(settings.minimumPayout) }, reason: reason.trim() })
      setSettings((current) => ({ ...current, ...(result.settings || {}) })); setReason('')
      toast('Live platform configuration saved and audit-logged.', { type: 'success' })
    } catch (error) { toast(error.response?.data?.error?.message || 'Configuration could not be saved.', { type: 'error' }) }
    finally { setSaving(false) }
  }
  const saveFlag = async (flag, enabled) => {
    if (!requireReason()) return
    try {
      await adminApi.updateFeatureFlag(flag.id, { enabled, reason: reason.trim() }); setReason(''); reload()
      toast('Feature flag updated and enforced by the API.', { type: 'success' })
    } catch (error) { toast(error.response?.data?.error?.message || 'Feature flag could not be updated.', { type: 'error' }) }
  }
  const createFlag = async () => {
    if (!flagDraft.key.trim() || !flagDraft.name.trim() || !requireReason()) return
    try {
      await adminApi.createFeatureFlag({ ...flagDraft, key: flagDraft.key.trim(), name: flagDraft.name.trim(), rolloutPercentage: 100, allowedRoles: [], reason: reason.trim() })
      setFlagDraft({ key: '', name: '', enabled: true }); setReason(''); reload(); toast('Feature flag created.', { type: 'success' })
    } catch (error) { toast(error.response?.data?.error?.message || 'Feature flag could not be created.', { type: 'error' }) }
  }
  const toggle = (key) => (event) => setSettings((value) => value ? ({ ...value, [key]: event.target.checked }) : value)
  const tabs = [
    { label: 'Platform', value: 'platform', content: <div className="space-y-5"><Switch label="Maintenance mode" checked={settings?.maintenance??false} onChange={toggle('maintenance')} /><Switch label="Creator applications" checked={settings?.creatorApplications??false} onChange={toggle('creatorApplications')} /><Switch label="Business applications" checked={settings?.businessApplications??false} onChange={toggle('businessApplications')} /></div> },
    { label: 'Marketplace', value: 'marketplace', content: <div className="space-y-5"><Switch label="Manual campaign review" checked={settings?.manualReview??false} onChange={toggle('manualReview')} /><Switch label="Show public pricing" checked={settings?.publicPricing??false} onChange={toggle('publicPricing')} /></div> },
    { label: 'Finance', value: 'finance', content: <div className="space-y-4"><Input label="Platform commission (%)" value={settings?.commission??''} onChange={(event) => setSettings((value) => value ? ({ ...value, commission: event.target.value }) : value)} /><Input label="Minimum payout" value={settings?.minimumPayout??''} onChange={(event) => setSettings((value) => value ? ({ ...value, minimumPayout: event.target.value }) : value)} /><Select label="Settlement schedule" value={settings?.settlement??''} onChange={(event) => setSettings((value) => value ? ({ ...value, settlement: event.target.value }) : value)} options={[{ label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' }]} /></div> },
    { label: 'Security', value: 'security', content: <div className="space-y-5"><Switch label="Require admin 2FA" checked={settings?.require2fa??false} onChange={toggle('require2fa')} /><Switch label="New device alerts" checked={settings?.newDeviceAlerts??false} onChange={toggle('newDeviceAlerts')} /><div className="rounded-xl border border-white/10 p-4 text-xs leading-5 text-white/40"><ShieldCheck size={16} className="mb-2 text-mint" />Non-secret policy values are stored in PostgreSQL and every update is audit-logged. API keys, tokens and credentials remain environment variables and never appear here.</div></div> },
    { label: 'Feature flags', value: 'flags', content: <div className="space-y-4">
      {flags.map((flag) => <div key={flag.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 p-4"><span className="min-w-0"><strong className="block truncate text-sm">{flag.name}</strong><small className="text-white/35">{flag.key} · {flag.rolloutPercentage}% rollout</small></span><Switch label={flag.enabled ? 'Enabled' : 'Disabled'} checked={flag.enabled} onChange={(event) => saveFlag(flag, event.target.checked)} /></div>)}
      {!loading && !flags.length && <p className="text-xs text-white/35">No flags yet. Missing flags safely default to enabled.</p>}
      <div className="grid gap-3 rounded-xl border border-dashed border-white/10 p-4 sm:grid-cols-2"><Input label="Flag key" placeholder="content_publishing" value={flagDraft.key} onChange={(event) => setFlagDraft((value) => ({ ...value, key: event.target.value }))} /><Input label="Display name" placeholder="Content publishing" value={flagDraft.name} onChange={(event) => setFlagDraft((value) => ({ ...value, name: event.target.value }))} /><div className="sm:col-span-2"><Button size="sm" variant="outline" onClick={createFlag}>Create feature flag</Button></div></div>
    </div> },
  ]
  const [tab, setTab] = useState('platform')
  return <AdminPage><AdminHeader eyebrow="System · Live configuration" title="Admin settings" copy="Audited non-secret platform policy and server-enforced feature controls." date={false} action={<Button variant="pink" loading={saving} disabled={loading||!settings} onClick={save}><Save size={14} />Save live settings</Button>} /><AdminPanel title="Required change reason"><Textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this live platform configuration changing?" /><p className="mt-2 text-[10px] text-white/30">Every settings or feature-flag mutation requires confirmation and creates an immutable admin audit entry.</p></AdminPanel><AdminPanel className="mt-5" title={loading ? 'Loading configuration…' : 'Configuration'}>{loadError?<div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-xs text-red-200"><span>{loadError}</span><Button size="sm" variant="outline" onClick={reload}>Retry</Button></div>:loading?<p className="py-8 text-center text-xs text-white/35">Loading live settings…</p>:<Tabs tabs={tabs} value={tab} onChange={setTab} />}</AdminPanel></AdminPage>
}
