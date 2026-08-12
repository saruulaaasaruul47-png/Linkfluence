import { useCallback, useEffect, useState } from 'react'
import { BellRing, CircleDollarSign, FileSearch, Megaphone, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/dashboard.api'
import { AdminHeader, AdminPage, AdminPanel, AdminStat } from '../../components/admin/AdminUI'
import { QuickAction } from '../../components/dashboard/DashboardUI'
import { Button, EmptyState, Skeleton } from '../../components/ui'

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MNT', maximumFractionDigits: 0 }).format(Number(value || 0))

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const load = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    adminApi.overview()
      .then((data) => setState({ data, loading: false, error: '' }))
      .catch((error) => setState({ data: null, loading: false, error: error.response?.data?.error?.message || 'Live platform overview could not be loaded.' }))
  }, [])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  const data = state.data
  const stats = data ? [
    ['Users', data.users, 'Registered accounts', 'mint'],
    ['Creators', data.creators, 'Creator channels', 'pink'],
    ['Businesses', data.businesses, 'Business channels', 'mint'],
    ['Campaigns', data.campaigns, 'All campaign states', 'pink'],
    ['Active workspaces', data.activeCollaborations, 'Current collaborations', 'mint'],
    ['Open cases', data.openCases, 'Trust review queue', data.openCases ? 'danger' : 'mint'],
  ] : []
  return <AdminPage>
    <AdminHeader eyebrow="Platform administration · Live API overview" title="Control center" copy="Platform health, marketplace activity, trust signals and financial summaries from the current database." action={<Button variant="outline" onClick={load}>Refresh</Button>} />
    {state.error && <div role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-xs text-red-200">{state.error}</div>}
    {state.loading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map((item) => <Skeleton key={item} className="h-28" />)}</div> : !data ? <EmptyState title="Overview unavailable" description="Refresh to request the administration overview again." /> : <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">{stats.map(([label,value,change,tone]) => <AdminStat key={label} label={label} value={String(value)} change={change} tone={tone} />)}</div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <AdminPanel title="Financial health"><div className="grid gap-3 sm:grid-cols-2"><AdminStat label="Gross processed volume" value={money(data.grossVolume)} change="Funded and released payments" tone="mint"/><AdminStat label="Platform fees" value={money(data.platformFees)} change="Recorded commission" tone="pink"/></div><button onClick={() => navigate('/admin/finance')} className="mt-4 w-full rounded-xl border border-white/10 p-4 text-left text-xs text-white/55 transition hover:border-mint/40 hover:text-white">Open finance center →</button></AdminPanel>
        <AdminPanel title="Review queues"><div className="space-y-2">{[['Trust cases',data.openCases,'/admin/reports'],['Active collaborations',data.activeCollaborations,'/admin/contracts'],['Campaign records',data.campaigns,'/admin/campaigns']].map(([label,value,to]) => <button key={label} onClick={() => navigate(to)} className="flex w-full items-center justify-between rounded-xl border border-white/[.07] p-3 text-left hover:bg-white/[.03]"><span className="text-xs text-white/55">{label}</span><b>{value}</b></button>)}</div></AdminPanel>
      </div>
      <AdminPanel className="mt-5" title="Critical admin actions"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><QuickAction icon={ShieldCheck} label="Review verification" onClick={() => navigate('/admin/verifications')}/><QuickAction icon={FileSearch} label="Review report" onClick={() => navigate('/admin/reports')}/><QuickAction icon={CircleDollarSign} label="Finance operations" onClick={() => navigate('/admin/finance')}/><QuickAction icon={Megaphone} label="Announcement" onClick={() => navigate('/admin/notifications')}/><QuickAction icon={BellRing} label="Audit log" onClick={() => navigate('/admin/audit-logs')}/></div></AdminPanel>
    </>}
  </AdminPage>
}
