import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { BarChart, DashboardHeader, DashboardPage, DashboardPanel, DateFilter, LineChart, MetricCard } from '../../components/dashboard/DashboardUI'
import { Button, useToast } from '../../components/ui'
import { analyticsApi } from '../../api/dashboard.api'

function downloadCsv(filename, rows) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = rows.map((row) => row.map(escape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AnalyticsPage({ role }) {
  const { toast } = useToast()
  const [range, setRange] = useState('1M')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    analyticsApi.summary({ role, range })
      .then((result) => { if (active) setSummary(result) })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.error?.message || 'Analytics could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [role, range])
  const compactMoney = (value) => `MNT ${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)}`
  const metrics = summary ? [
    { label: 'Collaborations', value: String(summary.metrics.collaborations), change: `${summary.metrics.active} active`, trend: 'up' },
    { label: role === 'creator' ? 'Released earnings' : 'Funded spend', value: compactMoney(role === 'creator' ? summary.metrics.released : summary.metrics.funded), change: `${summary.metrics.completed} completed`, trend: 'up' },
    { label: 'Average rating', value: summary.metrics.rating ? summary.metrics.rating.toFixed(1) : '—', change: `${summary.metrics.ratingCount} review(s)`, trend: 'up' },
    { label: 'Completion rate', value: summary.metrics.collaborations ? `${Math.round(summary.metrics.completed / summary.metrics.collaborations * 100)}%` : '0%', change: `${summary.metrics.completed} completed`, trend: 'up' },
  ] : []
  const primary = summary?.series.map((item) => item.collaborations) || []
  const secondary = summary?.series.map((item) => role === 'creator' ? item.released : item.funded) || []
  const chooseRange = (value) => {
    setLoading(true)
    setError('')
    setRange(value)
    analyticsApi.track({ name: 'date_range_changed', properties: { role, range: value } }).catch(() => null)
  }
  const exportAnalytics = () => {
    downloadCsv(`vyra-${role}-analytics-${range.toLowerCase()}.csv`, [
      ['Period', role === 'creator' ? 'Engagement' : 'Reach', role === 'creator' ? 'Earnings index' : 'Spend index'],
      ...primary.map((value, index) => [`Point ${index + 1}`, value, secondary[index] ?? '']),
    ])
    analyticsApi.track({ name: 'analytics_exported', properties: { role, range } }).catch(() => null)
    toast('Analytics CSV downloaded.', { type: 'success' })
  }
  const exportCampaignReport = async (campaign) => {
    try {
      const response = await analyticsApi.campaignReportPdf(campaign.id)
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${campaign.title.replaceAll(/[^a-z0-9]+/gi, '-').toLowerCase()}-report.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
      toast('Campaign PDF report downloaded.', { type: 'success' })
    } catch (requestError) { toast(requestError.response?.data?.error?.message || 'Campaign report could not be downloaded.', { type: 'error' }) }
  }
  return <DashboardPage>
    <DashboardHeader
      eyebrow={`${role} performance`}
      title="Analytics"
      copy={`Performance for the selected ${range} window. Charts and exports update together.`}
      action={<DateFilter value={range} onChange={chooseRange} />}
      secondary={<Button variant="outline" onClick={exportAnalytics}><Download size={15} />Export CSV</Button>}
    />
    {error && <div role="alert" className="mb-5 rounded-xl border border-red-300/20 bg-red-300/[.06] p-4 text-xs text-red-200">{error}</div>}
    {loading && <div className="mb-5 rounded-xl border border-white/10 p-4 text-xs text-white/40">Loading analytics…</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => <MetricCard key={item.label} metric={item} accent={role === 'business' ? 'mint' : 'pink'} />)}
    </div>
    <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
      <DashboardPanel className="h-full" title={role === 'creator' ? 'Audience growth' : 'Campaign reach'} eyebrow={`${range} performance trend`}>
        <LineChart data={primary} area color={role === 'creator' ? '#ff76bd' : '#bbf7d0'} />
      </DashboardPanel>
      <DashboardPanel className="h-full" title={`Performance · ${range}`}><BarChart data={secondary} color={role === 'creator' ? '#ff76bd' : '#bbf7d0'} /></DashboardPanel>
      <DashboardPanel className="h-full" title="Top performing content">
        {(summary?.topCampaigns || []).length ? (
          <div className="space-y-3">
            {summary.topCampaigns.map((item, index) => <div key={item.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[.04]">
              <span className="text-xs text-white/25">0{index + 1}</span>
              <span className="grid size-12 place-items-center rounded-xl bg-white/[.05] text-xs font-bold">{item.deliverables}</span>
              <span className="flex-1"><strong className="block text-xs">{item.title}</strong><small className="text-white/35">{item.status.replaceAll('_', ' ')}</small></span>
              <strong className="text-xs">{item.deliverables} files</strong>{role === 'business' && <Button size="sm" variant="ghost" onClick={() => exportCampaignReport(item)}><Download size={12}/>PDF</Button>}
            </div>)}
          </div>
        ) : <p className="text-xs text-white/35">No campaign activity in this window yet.</p>}
      </DashboardPanel>
    </div>
  </DashboardPage>
}
