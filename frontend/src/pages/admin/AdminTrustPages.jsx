import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ShieldCheck, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/dashboard.api'
import { AdminDataPage, AdminHeader, AdminPage, AdminPanel, AdminStat, StatusBadge } from '../../components/admin/AdminUI'
import { Badge, Button, Drawer, EmptyState, Skeleton, Textarea, useToast } from '../../components/ui'

const displayStatus = (value = '') => value.replaceAll('_', ' ')
const priorityText = (priority) => priority >= 8 ? 'Urgent' : priority >= 5 ? 'High' : 'Normal'
const mapCase = (item) => ({
  ...item,
  target: `${item.targetType} · ${item.targetId}`,
  reporterName: item.reporter?.displayName || 'System',
  priorityText: priorityText(item.priority),
  statusText: displayStatus(item.status),
  opened: new Date(item.createdAt).toLocaleDateString(),
})
const mapDispute = (item) => ({ ...mapCase(item), contract: item.targetId })

function useCases(kind) {
  const [state, setState] = useState({ rows: [], loading: true, error: '' })
  useEffect(() => {
    let active = true
    adminApi.list('cases', { kind, page: 1, limit: 100 })
      .then((data) => { if (active) setState({ rows: (data.items || []).map(mapCase), loading: false, error: '' }) })
      .catch((error) => { if (active) setState({ rows: [], loading: false, error: error.response?.data?.error?.message || `${kind} cases could not be loaded.` }) })
    return () => { active = false }
  }, [kind])
  return state
}

function CaseReviewDrawer({ open, onClose, item, onResolved }) {
  const { toast } = useToast()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  if (!item) return null
  const act = async (action) => {
    if (note.trim().length < 5) return toast('Add a resolution reason with at least 5 characters.', { type: 'error' })
    setBusy(action)
    try {
      await adminApi.resolveCase(item.id, { action, resolution: note.trim(), reason: note.trim() })
      toast(`Case ${action.toLowerCase()}d.`, { type: 'success' })
      setNote('')
      onResolved()
      onClose()
    } catch (error) {
      toast(error.response?.data?.error?.message || 'The case could not be updated.', { type: 'error' })
    } finally {
      setBusy('')
    }
  }
  return <Drawer open={open} onClose={onClose} title="Case review">
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 p-4 text-xs">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm">{item.target}</strong><StatusBadge status={item.statusText} /></div>
        <p className="mt-2 leading-5 text-white/45">{item.reason}</p>
        <p className="mt-3 text-white/30">Reported by {item.reporterName} · {item.opened}</p>
      </div>
      <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Resolution reason (required, min 5 characters)…" />
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" loading={busy === 'DISMISS'} disabled={Boolean(busy)} onClick={() => act('DISMISS')}>Dismiss</Button>
        <Button size="sm" variant="outline" loading={busy === 'ESCALATE'} disabled={Boolean(busy)} onClick={() => act('ESCALATE')}>Escalate</Button>
        <Button size="sm" variant="pink" loading={busy === 'RESOLVE'} disabled={Boolean(busy)} onClick={() => act('RESOLVE')}>Resolve</Button>
      </div>
    </div>
  </Drawer>
}

export function AdminDisputesPage() {
  const navigate = useNavigate()
  const { rows, loading, error } = useCases('DISPUTE')
  return <AdminDataPage eyebrow="Trust & safety · Resolution queue" title="Disputes" copy="Review funded disputes and record an immutable financial award." rows={rows.map(mapDispute)} getId={(row) => row.id} onRow={(row) => navigate(`/admin/disputes/${row.id}`)} filters={['All', 'Open', 'Under Review', 'Escalated', 'Resolved']} toolbar={loading ? <Skeleton className="mb-4 h-12"/> : error ? <p role="alert" className="mb-4 text-xs text-red-200">{error}</p> : null} columns={[
    { key: 'id', label: 'Dispute' }, { key: 'contract', label: 'Collaboration' }, { key: 'reporterName', label: 'Reporter' }, { key: 'reason', label: 'Reason' }, { key: 'priorityText', label: 'Priority', render: (row) => <Badge variant={row.priorityText === 'Urgent' ? 'pink' : 'outline'}>{row.priorityText}</Badge> }, { key: 'statusText', label: 'Status', render: (row) => <StatusBadge status={row.statusText}/> }, { key: 'opened', label: 'Opened' },
  ]}/>
}

export function AdminDisputeDetailPage() {
  const { disputeId } = useParams(); const navigate = useNavigate(); const { toast } = useToast()
  const [item, setItem] = useState(null); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [loaded, setLoaded] = useState(false)
  useEffect(() => { adminApi.list('cases', { kind: 'DISPUTE', page: 1, limit: 100 }).then((data) => setItem((data.items || []).find((entry) => entry.id === disputeId) || null)).finally(() => setLoaded(true)) }, [disputeId])
  const resolve = async (award, creatorPercent) => {
    if (note.trim().length < 10) return toast('Add a resolution reason with at least 10 characters.', { type: 'error' })
    setBusy(true)
    try { await adminApi.resolveDispute(disputeId, { award, ...(creatorPercent && { creatorPercent }), reason: note.trim() }); toast('Dispute award posted to the ledger.', { type: 'success' }); navigate('/admin/disputes') }
    catch (error) { toast(error.response?.data?.error?.message || 'Dispute could not be resolved.', { type: 'error' }) }
    finally { setBusy(false) }
  }
  if (!loaded) return <AdminPage><Skeleton className="h-64"/></AdminPage>
  if (!item) return <AdminPage><EmptyState title="Dispute not found" description="The case may have been removed or is outside this result page."/><Button variant="outline" onClick={() => navigate('/admin/disputes')}>Back</Button></AdminPage>
  return <AdminPage><button onClick={() => navigate('/admin/disputes')} className="mb-5 flex items-center gap-2 text-xs text-white/40"><ArrowLeft size={14}/>Back to disputes</button><AdminHeader eyebrow={`Dispute · ${item.id}`} title={item.reason} copy={`Collaboration ${item.targetId} · Opened ${new Date(item.createdAt).toLocaleDateString()}`} date={false}/><div className="grid gap-4 sm:grid-cols-3"><AdminStat label="Priority" value={String(item.priority)} change="Resolution queue" tone="danger"/><AdminStat label="Status" value={displayStatus(item.status)} change="Payment frozen"/><AdminStat label="Evidence" value={String(Array.isArray(item.evidence) ? item.evidence.length : 0)} change="Submitted records"/></div><AdminPanel className="mt-5" title="Financial award"><Textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Required audit reason…"/><div className="mt-4 flex flex-wrap justify-end gap-2"><Button disabled={busy} variant="outline" onClick={() => resolve('BUSINESS_WINS')}>Business wins</Button><Button disabled={busy} variant="outline" onClick={() => resolve('SPLIT', 50)}>Split 50 / 50</Button><Button disabled={busy} variant="pink" onClick={() => resolve('CREATOR_WINS')}>Creator wins</Button></div></AdminPanel></AdminPage>
}

export function AdminReportsPage() {
  const { rows, loading, error } = useCases('REPORT')
  const [selected, setSelected] = useState(null)
  const refresh = () => window.location.reload()
  return <><AdminDataPage eyebrow="Trust & safety · User reports" title="Reports" copy="Triage reported channels, campaigns and content." rows={rows} getId={(row) => row.id} onRow={setSelected} filters={['All', 'Open', 'Under Review', 'Escalated', 'Resolved']} toolbar={loading ? <Skeleton className="mb-4 h-12"/> : error ? <p role="alert" className="mb-4 text-xs text-red-200">{error}</p> : null} columns={[{ key: 'id', label: 'Report' }, { key: 'target', label: 'Target' }, { key: 'reason', label: 'Reason' }, { key: 'reporterName', label: 'Reporter' }, { key: 'priorityText', label: 'Priority', render: (row) => <Badge variant={row.priorityText === 'Urgent' ? 'pink' : 'outline'}>{row.priorityText}</Badge> }, { key: 'statusText', label: 'Status', render: (row) => <StatusBadge status={row.statusText}/> }]}/>
    <CaseReviewDrawer open={Boolean(selected)} onClose={() => setSelected(null)} item={selected} onResolved={refresh} />
  </>
}

export function AdminModerationCasesPage() {
  const { rows, loading, error } = useCases('MODERATION')
  const [selected, setSelected] = useState(null)
  const refresh = () => window.location.reload()
  return <>
    <AdminPage>
      <AdminHeader eyebrow="Trust & safety · Content review" title="Content moderation" copy="Review flagged campaign content and creator posts." />
      {loading ? <Skeleton className="h-40" /> : error ? <p role="alert" className="text-xs text-red-200">{error}</p> : rows.length ? (
        <div className="grid gap-3">{rows.map((item) => (
          <button type="button" key={item.id} onClick={() => setSelected(item)} className="grid w-full gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left transition hover:border-white/25 hover:bg-white/[.045] sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <span className="min-w-0"><strong className="block truncate text-sm">{item.target}</strong><small className="mt-1 block truncate text-xs text-white/40">{item.reason}</small></span>
            <Badge variant={item.priorityText === 'Urgent' ? 'pink' : 'outline'}>{item.priorityText}</Badge>
            <StatusBadge status={item.statusText} />
          </button>
        ))}</div>
      ) : <EmptyState title="No flagged content" description="Reported campaign or creator content will appear here for review." />}
    </AdminPage>
    <CaseReviewDrawer open={Boolean(selected)} onClose={() => setSelected(null)} item={selected} onResolved={refresh} />
  </>
}

export function AdminModerationPage() {
  const { toast } = useToast()
  const [state, setState] = useState({ rows: [], loading: true, error: '' })
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const reload = () => {
    setState((current) => ({ ...current, loading: true }))
    adminApi.list('content', { page: 1, limit: 100 })
      .then((data) => setState({ rows: data.items || [], loading: false, error: '' }))
      .catch((error) => setState({ rows: [], loading: false, error: error.response?.data?.error?.message || 'Content moderation records could not be loaded.' }))
  }
  useEffect(() => {
    let active = true
    adminApi.list('content', { page: 1, limit: 100 })
      .then((data) => { if (active) setState({ rows: data.items || [], loading: false, error: '' }) })
      .catch((error) => { if (active) setState({ rows: [], loading: false, error: error.response?.data?.error?.message || 'Content moderation records could not be loaded.' }) })
    return () => { active = false }
  }, [])
  const moderate = async () => {
    if (!selected || reason.trim().length < 5) return toast('Add a moderation reason with at least 5 characters.', { type: 'error' })
    const restoring = Boolean(selected.hiddenAt)
    if (!window.confirm(`${restoring ? 'Restore' : 'Hide'} this post? This action and reason will be audit-logged.`)) return
    setBusy(true)
    try {
      if (restoring) await adminApi.restoreContent(selected.id, { reason: reason.trim() })
      else await adminApi.hideContent(selected.id, { reason: reason.trim() })
      toast(restoring ? 'Content restored to public surfaces.' : 'Content removed from public feed and profile.', { type: 'success' })
      setSelected(null); setReason(''); reload()
    } catch (error) { toast(error.response?.data?.error?.message || 'Moderation action failed.', { type: 'error' }) }
    finally { setBusy(false) }
  }
  return <>
    <AdminPage>
      <AdminHeader eyebrow="Trust & safety · Live content" title="Content moderation" copy="Hide and restore real creator or business posts with a required audit reason." />
      {state.loading ? <Skeleton className="h-40" /> : state.error ? <p role="alert" className="text-xs text-red-200">{state.error}</p> : state.rows.length ? <div className="overflow-hidden rounded-2xl border border-white/10"><div className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/10 px-4 py-3 text-[10px] uppercase tracking-widest text-white/30 sm:grid-cols-[1fr_180px_120px]"> <span>Content</span><span className="hidden sm:block">Author</span><span>Status</span></div>{state.rows.map((item) => <button type="button" key={item.id} onClick={() => setSelected(item)} className="grid w-full grid-cols-[1fr_auto] gap-3 border-b border-white/[.07] px-4 py-4 text-left last:border-0 hover:bg-white/[.025] sm:grid-cols-[1fr_180px_120px]"><span className="min-w-0"><strong className="block truncate text-sm">{item.title || item.caption}</strong><small className="block truncate text-white/35">{item.postType.replaceAll('_', ' ')}</small></span><span className="hidden truncate text-xs text-white/45 sm:block">{item.creator?.channelName || item.business?.companyName}</span><StatusBadge status={item.hiddenAt ? 'HIDDEN' : displayStatus(item.status)} /></button>)}</div> : <EmptyState title="No content" description="Published channel content will appear here." />}
    </AdminPage>
    <Drawer open={Boolean(selected)} onClose={() => { setSelected(null); setReason('') }} title={selected?.hiddenAt ? 'Restore content' : 'Hide content'}>
      {selected && <div className="space-y-4"><div className="rounded-xl border border-white/10 p-4"><strong className="block text-sm">{selected.title || selected.caption}</strong><p className="mt-2 line-clamp-4 text-xs leading-5 text-white/40">{selected.caption}</p></div><Textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required moderation reason…" /><Button variant={selected.hiddenAt ? 'pink' : 'outline'} loading={busy} onClick={moderate}>{selected.hiddenAt ? 'Restore to public surfaces' : 'Hide from public surfaces'}</Button></div>}
    </Drawer>
  </>
}

export function AdminVerificationsPage() {
  const { rows, loading, error } = useCases('VERIFICATION')
  const [selected, setSelected] = useState(null)
  const refresh = () => window.location.reload()
  return <>
    <AdminDataPage eyebrow="Trust & safety · Identity checks" title="Verifications" copy="Review verification requests." rows={rows} getId={(row) => row.id} onRow={setSelected} filters={['All', 'Open', 'Under Review', 'Resolved']} toolbar={loading ? <Skeleton className="mb-4 h-12"/> : error ? <p role="alert" className="mb-4 text-xs text-red-200">{error}</p> : null} columns={[{ key: 'target', label: 'Applicant' }, { key: 'reason', label: 'Request' }, { key: 'opened', label: 'Submitted' }, { key: 'priorityText', label: 'Priority' }, { key: 'statusText', label: 'Status', render: (row) => <StatusBadge status={row.statusText}/> }]}/>
    <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title="Verification review">
      {selected && <div>
        <ShieldCheck className="text-mint"/>
        <h3 className="mt-4 text-xl font-bold">{selected.target}</h3>
        <p className="mt-2 text-xs leading-5 text-white/40">{selected.reason}</p>
        <CaseReviewDrawerActions item={selected} onResolved={refresh} onClose={() => setSelected(null)} />
      </div>}
    </Drawer>
  </>
}

function CaseReviewDrawerActions({ item, onResolved, onClose }) {
  const { toast } = useToast()
  const [busy, setBusy] = useState('')
  const act = async (action, resolution) => {
    setBusy(action)
    try {
      await adminApi.resolveCase(item.id, { action, resolution, reason: resolution })
      toast(`Verification ${action.toLowerCase()}d.`, { type: 'success' })
      onResolved()
      onClose()
    } catch (error) {
      toast(error.response?.data?.error?.message || 'Verification could not be updated.', { type: 'error' })
    } finally {
      setBusy('')
    }
  }
  return <div className="mt-5 flex gap-2">
    <Button variant="outline" loading={busy === 'DISMISS'} disabled={Boolean(busy)} onClick={() => act('DISMISS', 'Verification request rejected by admin review.')}><X size={14}/>Reject</Button>
    <Button variant="pink" loading={busy === 'RESOLVE'} disabled={Boolean(busy)} onClick={() => act('RESOLVE', 'Verification request approved by admin review.')}><Check size={14}/>Approve</Button>
  </div>
}

export function AdminReviewsPage() {
  const [state, setState] = useState({ rows: [], loading: true, error: '' })
  useEffect(() => {
    adminApi.list('reviews', { page: 1, limit: 50 }).then((data) => setState({
      rows: (data.items || []).map((item) => ({
        id: item.id,
        author: item.reviewer?.displayName || 'Participant',
        target: item.subject?.displayName || 'Participant',
        rating: item.rating.toFixed(1),
        status: item.publishedAt ? 'Published' : 'Pending reveal',
      })),
      loading: false,
      error: '',
    })).catch((error) => setState({ rows: [], loading: false, error: error.response?.data?.error?.message || 'Reviews could not be loaded.' }))
  }, [])
  return <AdminDataPage eyebrow="Trust & safety · Reputation" title="Reviews" copy="Monitor marketplace feedback." rows={state.rows} getId={(row) => row.id} toolbar={state.loading ? <Skeleton className="mb-4 h-12"/> : state.error ? <p role="alert" className="mb-4 text-xs text-red-200">{state.error}</p> : null} columns={[{ key: 'author', label: 'Author' }, { key: 'target', label: 'Target' }, { key: 'rating', label: 'Rating' }, { key: 'status', label: 'Status' }]}/>
}
