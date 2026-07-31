import { useMemo, useState } from 'react'
import { BellRing, Check, ExternalLink, Save, Search, Send, ShieldCheck } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdminHeader, AdminPage, AdminPanel, StatusBadge } from '../../components/admin/AdminUI'
import { Badge, Button, Dialog, Input, Select, Switch, Tabs, Textarea, useToast } from '../../components/ui'
import {
  adminCampaigns,
  adminChannels,
  adminContracts,
  adminDisputes,
  adminPayments,
  adminReports,
  adminUsers,
  moderationItems,
} from '../../data/admin'

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })
  const update = (next) => {
    setValue((current) => {
      const resolved = typeof next === 'function' ? next(current) : next
      try { window.localStorage.setItem(key, JSON.stringify(resolved)) } catch { /* In-memory state remains available. */ }
      return resolved
    })
  }
  return [value, update]
}

const operationGroups = {
  users: adminUsers.map((item) => ({ ...item, label: item.name, meta: item.email })),
  channels: adminChannels.map((item) => ({ ...item, label: item.name, meta: `${item.type} · ${item.verified}` })),
  campaigns: adminCampaigns.map((item) => ({ ...item, label: item.title, meta: item.business })),
  content: moderationItems.map((item) => ({ ...item, label: item.caption, meta: `${item.creator} · ${item.reports} reports` })),
  cases: [
    ...adminReports.map((item) => ({ ...item, label: item.target, meta: `Report · ${item.reason}`, kind: 'Report' })),
    ...adminDisputes.map((item) => ({ ...item, label: item.reason, meta: `Dispute · ${item.contract}`, kind: 'Dispute' })),
  ],
  finance: adminPayments.map((item) => ({ ...item, label: item.id, meta: `${item.user} · ${item.amount}` })),
}

const actionsByGroup = {
  users: ['Suspend', 'Restore', 'Delete'],
  channels: ['Verify', 'Reject', 'Restrict'],
  campaigns: ['Publish', 'Pause', 'Hide'],
  content: ['Approve', 'Hide', 'Remove'],
  cases: ['Resolve', 'Escalate', 'Dismiss'],
  finance: ['Approve payout', 'Issue refund', 'Freeze'],
}

export function AdminOperationsPage() {
  const { toast } = useToast()
  const [group, setGroup] = useState('users')
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(null)
  const [reason, setReason] = useState('')
  const [overrides, setOverrides] = usePersistentState('vyra:admin:operation-overrides', {})
  const [audit, setAudit] = usePersistentState('vyra:admin:operation-audit', [])
  const rows = operationGroups[group].filter((item) => `${item.label} ${item.meta} ${item.status}`.toLowerCase().includes(query.toLowerCase()))
  const confirm = () => {
    if (!reason.trim()) {
      toast('An admin reason is required.', { type: 'error' })
      return
    }
    const key = `${group}:${pending.item.id}`
    setOverrides((items) => ({ ...items, [key]: pending.action }))
    setAudit((items) => [{
      id: `admin-action-${Date.now()}`,
      actor: 'Bolor Admin',
      action: pending.action,
      resource: group,
      target: pending.item.label,
      targetId: pending.item.id,
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
    }, ...items].slice(0, 100))
    setPending(null)
    setReason('')
    toast(`${pending.action} recorded with an audit reason.`, { type: 'success' })
  }
  return <AdminPage>
    <AdminHeader eyebrow="System · Controlled mutations" title="Admin operations" copy="Review status controls and record every change with a required audit reason." date={false} />
    <div className="mb-4 flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#151515] p-1.5">
      {Object.keys(operationGroups).map((item) => <button type="button" key={item} onClick={() => setGroup(item)} className={`min-h-10 min-w-max flex-1 rounded-xl px-3 py-2 text-[11px] font-bold capitalize transition ${group === item ? 'bg-pink text-black shadow-sm' : 'text-white/40 hover:bg-white/[.05] hover:text-white'}`}>{item}</button>)}
    </div>
    <div className="admin-operations-grid grid gap-4">
      <AdminPanel title={`${group[0].toUpperCase()}${group.slice(1)} controls`} action={<div className="relative"><Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input aria-label={`Search ${group}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-8 w-40 rounded-full border border-white/10 bg-white/[.035] pl-8 pr-3 text-[11px] outline-none focus:border-pink sm:w-48" /></div>}>
        <div className="space-y-2">
          {rows.map((item) => {
            const current = overrides[`${group}:${item.id}`] || item.status || item.verified
            return <div key={item.id} className="grid gap-3 rounded-xl border border-white/[.08] bg-white/[.015] p-3 transition hover:border-white/15 hover:bg-white/[.025] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <span className="min-w-0"><strong className="block truncate text-xs">{item.label}</strong><small className="mt-1 block truncate text-[10px] text-white/35">{item.meta} · {item.id}</small></span>
              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                <StatusBadge status={current || 'Pending'} />
                {actionsByGroup[group].map((action) => {
                  const destructive=action.includes('Delete')||action.includes('Remove')
                  return <button type="button" key={action} onClick={() => setPending({ action, item })} className={`min-h-8 rounded-lg border px-2.5 text-[10px] font-semibold transition ${destructive?'border-[#df3f65]/35 bg-[#df3f65]/10 text-[#ef7189] hover:bg-[#df3f65] hover:text-white':'border-white/10 text-white/55 hover:border-white/20 hover:bg-white/[.06] hover:text-white'}`}>{action}</button>
                })}
              </div>
            </div>
          })}
        </div>
      </AdminPanel>
      <AdminPanel title="Mutation audit">
        {audit.length ? <div className="space-y-2">{audit.slice(0, 10).map((item) => <div key={item.id} className="rounded-xl border border-white/[.08] p-3"><div className="flex items-center justify-between gap-2"><strong className="truncate text-[11px]">{item.action} · {item.target}</strong><Badge variant="outline">{item.resource}</Badge></div><p className="mt-2 line-clamp-2 text-[11px] leading-4 text-white/40">{item.reason}</p><small className="mt-2 block text-[9px] text-white/25">{item.actor} · {new Date(item.createdAt).toLocaleString()}</small></div>)}</div> : <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[.015] p-5 text-center"><div><span className="mx-auto grid size-9 place-items-center rounded-full bg-mint/10 text-mint"><ShieldCheck size={15}/></span><strong className="mt-3 block text-xs">No mutations recorded</strong><p className="mx-auto mt-1.5 max-w-56 text-[10px] leading-4 text-white/35">Choose an action on the left. Its actor, target, reason and timestamp will appear here.</p></div></div>}
      </AdminPanel>
    </div>
    <Dialog dark open={Boolean(pending)} onClose={() => { setPending(null); setReason('') }} title={`${pending?.action || 'Admin action'} confirmation`} description="A reason is mandatory for every frontend admin mutation.">
      {pending && <div className="space-y-4"><div className="rounded-xl border border-white/10 p-4"><small className="text-white/35">Target</small><strong className="mt-1 block">{pending.item.label}</strong></div><Textarea autoFocus label="Reason" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this action is necessary…" /><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button><Button variant="pink" onClick={confirm}><Check size={14} />Confirm action</Button></div></div>}
    </Dialog>
  </AdminPage>
}

const searchable = [
  ...adminUsers.map((item) => ({ ...item, kind: 'User', title: item.name, path: `/admin/users/${item.id}` })),
  ...adminChannels.map((item) => ({ ...item, kind: 'Channel', title: item.name, path: `/admin/channels/${item.id}` })),
  ...adminCampaigns.map((item) => ({ ...item, kind: 'Campaign', title: item.title, path: `/admin/campaigns/${item.id}` })),
  ...adminContracts.map((item) => ({ ...item, kind: 'Contract', title: item.id, path: `/admin/contracts/${item.id}` })),
]

export function AdminSearchPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const results = useMemo(() => searchable.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase())), [query])
  return <AdminPage>
    <AdminHeader eyebrow="System · Global search" title="Search" copy="Search local users, channels, campaigns and contracts from one place." date={false} />
    <div className="relative mb-5"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} /><input autoFocus aria-label="Admin global search" value={query} onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {})} placeholder="Search name, email, campaign or contract…" className="h-14 w-full rounded-2xl border border-white/10 bg-[#151515] pl-11 pr-4 text-sm outline-none focus:border-pink" /></div>
    <AdminPanel title={`${results.length} result${results.length === 1 ? '' : 's'}`}>
      {results.map((item) => <button type="button" key={`${item.kind}-${item.id}`} onClick={() => navigate(item.path)} className="flex w-full items-center gap-3 border-b border-white/[.07] py-4 text-left last:border-0 hover:bg-white/[.025]"><Badge variant="outline">{item.kind}</Badge><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><small className="text-white/35">{item.id} · {item.status || item.email || item.business}</small></span><ExternalLink size={14} className="text-white/30" /></button>)}
    </AdminPanel>
  </AdminPage>
}

export function AdminNotificationsPage() {
  const { toast } = useToast()
  const [announcements, setAnnouncements] = usePersistentState('vyra:admin:announcements', [])
  const [form, setForm] = useState({ title: '', audience: 'All users', message: '', inApp: true, email: false, push: false })
  const save = (status) => {
    if (!form.title.trim() || !form.message.trim()) {
      toast('Title and message are required.', { type: 'error' })
      return
    }
    setAnnouncements((items) => [{ id: `announcement-${Date.now()}`, ...form, status, createdAt: new Date().toISOString() }, ...items])
    setForm({ title: '', audience: 'All users', message: '', inApp: true, email: false, push: false })
    toast(status === 'Previewed' ? 'Preview recorded locally. Nothing was delivered.' : 'Draft saved locally.', { type: 'success' })
  }
  return <AdminPage>
    <AdminHeader eyebrow="System · Communication center" title="Notifications" copy="Create persistent announcement drafts and frontend in-app delivery records." date={false} />
    <div className="grid gap-5 xl:grid-cols-[1fr_.72fr]">
      <AdminPanel title="Compose announcement">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} />
          <Select label="Audience" value={form.audience} onChange={(event) => setForm((value) => ({ ...value, audience: event.target.value }))} options={['All users', 'Creators', 'Businesses', 'Viewers']} />
          <Textarea label="Message" rows={6} value={form.message} onChange={(event) => setForm((value) => ({ ...value, message: event.target.value }))} />
          <Switch label="In-app delivery" checked={form.inApp} onChange={(event) => setForm((value) => ({ ...value, inApp: event.target.checked }))} />
          <Switch label="Email preview" checked={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.checked }))} />
          <Switch label="Push preview" checked={form.push} onChange={(event) => setForm((value) => ({ ...value, push: event.target.checked }))} />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => save('Draft')}><Save size={14} />Save local draft</Button><Button variant="pink" onClick={() => save('Previewed')}><Send size={14} />Preview in-app</Button></div>
        </div>
      </AdminPanel>
      <AdminPanel title="Announcement history">
        {announcements.length ? <div className="space-y-3">{announcements.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-4"><div className="flex items-start gap-3"><BellRing size={16} className="mt-0.5 text-pink" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><small className="text-white/35">{item.audience} · {new Date(item.createdAt).toLocaleString()}</small></span><StatusBadge status={item.status} /></div><p className="mt-3 line-clamp-3 text-xs leading-5 text-white/40">{item.message}</p></div>)}</div> : <p className="text-xs text-white/35">Drafts and sent frontend announcements appear here.</p>}
      </AdminPanel>
    </div>
  </AdminPage>
}

export function AdminSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = usePersistentState('vyra:admin:settings', {
    maintenance: false,
    creatorApplications: true,
    businessApplications: true,
    manualReview: false,
    publicPricing: true,
    commission: '10',
    minimumPayout: '100000',
    settlement: 'weekly',
    require2fa: true,
    newDeviceAlerts: true,
  })
  const toggle = (key) => (event) => setSettings((value) => ({ ...value, [key]: event.target.checked }))
  const tabs = [
    { label: 'Platform', value: 'platform', content: <div className="space-y-5"><Switch label="Maintenance mode" checked={settings.maintenance} onChange={toggle('maintenance')} /><Switch label="Creator applications" checked={settings.creatorApplications} onChange={toggle('creatorApplications')} /><Switch label="Business applications" checked={settings.businessApplications} onChange={toggle('businessApplications')} /></div> },
    { label: 'Marketplace', value: 'marketplace', content: <div className="space-y-5"><Switch label="Manual campaign review" checked={settings.manualReview} onChange={toggle('manualReview')} /><Switch label="Show public pricing" checked={settings.publicPricing} onChange={toggle('publicPricing')} /></div> },
    { label: 'Finance', value: 'finance', content: <div className="space-y-4"><Input label="Platform commission (%)" value={settings.commission} onChange={(event) => setSettings((value) => ({ ...value, commission: event.target.value }))} /><Input label="Minimum payout" value={settings.minimumPayout} onChange={(event) => setSettings((value) => ({ ...value, minimumPayout: event.target.value }))} /><Select label="Settlement schedule" value={settings.settlement} onChange={(event) => setSettings((value) => ({ ...value, settlement: event.target.value }))} options={[{ label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' }]} /></div> },
    { label: 'Security', value: 'security', content: <div className="space-y-5"><Switch label="Require admin 2FA" checked={settings.require2fa} onChange={toggle('require2fa')} /><Switch label="New device alerts" checked={settings.newDeviceAlerts} onChange={toggle('newDeviceAlerts')} /><div className="rounded-xl border border-white/10 p-4 text-xs leading-5 text-white/40"><ShieldCheck size={16} className="mb-2 text-mint" />These are persistent frontend policy preferences. Enforced 2FA still requires an authentication backend.</div></div> },
  ]
  const [tab, setTab] = useState('platform')
  return <AdminPage><AdminHeader eyebrow="System · Persistent configuration" title="Admin settings" copy="Platform, marketplace, finance and security preferences are saved in this browser." date={false} action={<Button variant="pink" onClick={() => toast('Settings are already saved locally.', { type: 'success' })}><Save size={14} />Saved</Button>} /><AdminPanel title="Configuration"><Tabs tabs={tabs} value={tab} onChange={setTab} /></AdminPanel></AdminPage>
}
