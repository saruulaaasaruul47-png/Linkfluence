import { useState } from 'react'
import { Download, Trash2, WalletCards } from 'lucide-react'
import { BarChart, DashboardHeader, DashboardPage, DashboardPanel, DateFilter, LineChart, MetricCard, StatusBadge } from '../../components/dashboard/DashboardUI'
import { Badge, Button, Dialog, FeatureUnavailable, Input, Select, useToast } from '../../components/ui'
import { chartSeries, creatorMetrics, portfolioItems, transactions } from '../../data/dashboard'
import { useCollaboration } from '../../context/collaboration-context'
import { useDashboardData } from '../../context/dashboard-data-context'

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

const rangeSize = { '7D': 4, '1M': 8, '3M': 10, '1Y': 12 }

export function AnalyticsPage({ role }) {
  const { analyticsEvents, trackAnalyticsEvent } = useDashboardData()
  const { toast } = useToast()
  const [range, setRange] = useState('1M')
  const metrics = role === 'creator' ? creatorMetrics : [
    { label: 'Campaign reach', value: '8.6M', change: '+24.2%', trend: 'up' },
    { label: 'Engagement', value: '7.2%', change: '+1.4%', trend: 'up' },
    { label: 'Content saves', value: '142K', change: '+18.9%', trend: 'up' },
    { label: 'Cost per result', value: 'MNT 428', change: '-8.2%', trend: 'up' },
  ]
  const primary = (role === 'creator' ? chartSeries.engagement : chartSeries.reach).slice(-rangeSize[range])
  const secondary = (role === 'creator' ? chartSeries.earnings : chartSeries.spend).slice(-rangeSize[range])
  const chooseRange = (value) => {
    setRange(value)
    trackAnalyticsEvent('date_range_changed', { role, range: value })
  }
  const exportAnalytics = () => {
    downloadCsv(`vyra-${role}-analytics-${range.toLowerCase()}.csv`, [
      ['Period', role === 'creator' ? 'Engagement' : 'Reach', role === 'creator' ? 'Earnings index' : 'Spend index'],
      ...primary.map((value, index) => [`Point ${index + 1}`, value, secondary[index] ?? '']),
    ])
    trackAnalyticsEvent('analytics_exported', { role, range })
    toast('Analytics CSV downloaded.', { type: 'success' })
  }
  const eventSummary = analyticsEvents
    .filter((item) => item.role === role)
    .reduce((result, item) => ({ ...result, [item.type]: (result[item.type] || 0) + 1 }), {})

  return <DashboardPage>
    <DashboardHeader
      eyebrow={`${role} performance`}
      title="Analytics"
      copy={`Performance for the selected ${range} window. Charts and exports update together.`}
      action={<DateFilter value={range} onChange={chooseRange} />}
      secondary={<Button variant="outline" onClick={exportAnalytics}><Download size={15} />Export CSV</Button>}
    />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => <MetricCard key={item.label} metric={item} accent={role === 'business' ? 'mint' : 'pink'} />)}
    </div>
    <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
      <DashboardPanel className="h-full" title={role === 'creator' ? 'Audience growth' : 'Campaign reach'} eyebrow={`${range} performance trend`}>
        <LineChart data={primary} area color={role === 'creator' ? '#ff76bd' : '#bbf7d0'} />
      </DashboardPanel>
      <DashboardPanel className="h-full" title="Growth metrics">
        <div className="grid gap-3 sm:grid-cols-2">
          {[['Organic discovery', '+28.4%'], ['Profile conversion', '6.8%'], ['Returning audience', '42.1%'], ['Share rate', '3.9%']].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 p-4">
              <span className="block text-xs text-white/40">{label}</span><strong className="mt-2 block text-xl">{value}</strong>
            </div>
          ))}
        </div>
      </DashboardPanel>
      <DashboardPanel className="h-full" title={`Performance · ${range}`}><BarChart data={secondary} color={role === 'creator' ? '#ff76bd' : '#bbf7d0'} /></DashboardPanel>
      <DashboardPanel className="h-full" title="Top performing content">
        <div className="space-y-3">
          {portfolioItems.map((item, index) => <div key={item.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[.04]">
            <span className="text-xs text-white/25">0{index + 1}</span>
            <img src={item.image} alt="" loading="lazy" decoding="async" className="size-12 rounded-xl object-cover" />
            <span className="flex-1"><strong className="block text-xs">{item.title}</strong><small className="text-white/35">{item.category}</small></span>
            <strong className="text-xs">{item.views}</strong>
          </div>)}
        </div>
      </DashboardPanel>
      <DashboardPanel className="h-full" title="Performance highlights">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {[['Best day', 'Thursday', '+18% engagement'], ['Top audience', 'Ulaanbaatar', '38% of reach'], ['Strongest format', 'Short-form video', '2.4× avg. reach']].map(([title, value, copy]) => (
            <div key={title} className="rounded-xl border border-white/10 p-4">
              <small className="text-white/30">{title}</small>
              <strong className="mt-2 block text-lg">{value}</strong>
              <p className="mt-1 text-xs text-white/35">{copy}</p>
            </div>
          ))}
        </div>
      </DashboardPanel>
      <DashboardPanel className="h-full" title="Frontend event activity" eyebrow="Browser aggregation">
        <div className="flex flex-wrap gap-2">
          {Object.keys(eventSummary).length
            ? Object.entries(eventSummary).map(([type, count]) => <Badge key={type} variant="outline">{type.replaceAll('_', ' ')} · {count}</Badge>)
            : <p className="text-xs text-white/35">Change the date range or export analytics to record local events.</p>}
        </div>
      </DashboardPanel>
    </div>
  </DashboardPage>
}

export function WalletPage({ role }) {
  const { workspaces } = useCollaboration()
  const {
    paymentMethods, addPaymentMethod, removePaymentMethod,
    payoutRequests, requestPayout, refundCases, createRefundCase, reconcileRefundCase,
  } = useDashboardData()
  const { toast } = useToast()
  const [filter, setFilter] = useState('All')
  const [methodOpen, setMethodOpen] = useState(false)
  const [payoutOpen, setPayoutOpen] = useState(false)
  const [method, setMethod] = useState({ type: 'Bank account', label: '', last4: '' })
  const [payoutAmount, setPayoutAmount] = useState('')
  const filteredTransactions = transactions.filter((item) => {
    if (filter === 'All') return true
    if (filter === 'Incoming') return item.amount.startsWith('+')
    if (filter === 'Outgoing') return item.amount.startsWith('-')
    return item.status === 'In escrow'
  })
  const escrowRows = workspaces.map((workspace) => ({
    id: workspace.id,
    title: workspace.campaign?.title || 'Collaboration',
    amount: workspace.payment?.amount || workspace.terms?.budget || 'Not set',
    status: workspace.payment?.status || 'LOCKED',
  }))
  const exportStatement = () => {
    downloadCsv(`vyra-${role}-transactions.csv`, [
      ['Transaction', 'ID', 'Date', 'Amount', 'Status'],
      ...filteredTransactions.map((item) => [item.label, item.id, item.date, item.amount, item.status]),
    ])
    toast('Transaction CSV downloaded.', { type: 'success' })
  }
  const saveMethod = (event) => {
    event.preventDefault()
    if (!method.label.trim() || !/^\d{4}$/.test(method.last4)) {
      toast('Add a label and the last 4 digits.', { type: 'error' })
      return
    }
    addPaymentMethod(method)
    setMethodOpen(false)
    setMethod({ type: 'Bank account', label: '', last4: '' })
    toast('Payment method saved in this browser.', { type: 'success' })
  }
  const submitPayout = (event) => {
    event.preventDefault()
    if (!payoutAmount || Number(payoutAmount) <= 0) {
      toast('Enter a valid payout amount.', { type: 'error' })
      return
    }
    requestPayout(`MNT ${new Intl.NumberFormat('en-US').format(Number(payoutAmount))}`)
    setPayoutAmount('')
    setPayoutOpen(false)
    toast('Payout request recorded locally.', { type: 'success' })
  }

  return <DashboardPage>
    <DashboardHeader
      eyebrow={role === 'creator' ? 'Creator wallet' : 'Business payments'}
      title={role === 'creator' ? 'Wallet' : 'Payments'}
      copy="Balances, escrow state, payment methods and reconciliation are saved as a frontend prototype. No provider moves real money."
      action={<Button variant="outline" onClick={exportStatement}><Download size={15} />Export CSV</Button>}
      secondary={role === 'creator'
        ? <Button variant="pink" onClick={() => setPayoutOpen(true)}>Request payout</Button>
        : <Button variant="mint" onClick={() => setMethodOpen(true)}>Add payment method</Button>}
    />
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <DashboardPanel title={role === 'creator' ? 'Available balance' : 'Campaign funds'}><strong className="text-3xl">{role === 'creator' ? 'MNT 12.8M' : 'MNT 32.6M'}</strong><p className="mt-2 text-xs text-white/35">Available in this preview</p></DashboardPanel>
      <DashboardPanel title="In escrow"><strong className="text-3xl">MNT 9.6M</strong><p className="mt-2 text-xs text-white/35">{escrowRows.filter((item) => item.status === 'FUNDED').length} funded workspace(s)</p></DashboardPanel>
      <DashboardPanel title={role === 'creator' ? 'Lifetime earnings' : 'Campaign spend'}><strong className="text-3xl">{role === 'creator' ? 'MNT 84.2M' : 'MNT 148.2M'}</strong><p className="mt-2 text-xs text-mint">+18.2% this quarter</p></DashboardPanel>
      <DashboardPanel title="Platform commission"><strong className="text-3xl">10%</strong><p className="mt-2 text-xs text-white/35">{role === 'business' ? 'MNT 14.82M estimated' : 'Deducted per released milestone'}</p></DashboardPanel>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
      <DashboardPanel title="Transaction history" action={<div className="flex flex-wrap gap-1">{['All', 'Incoming', 'Outgoing', 'Escrow'].map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={`rounded-full px-3 py-1 text-[10px] font-bold ${filter === item ? 'bg-white text-black' : 'bg-white/[.05] text-white/40'}`}>{item}</button>)}</div>}>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs">
          <thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-[.12em] text-white/30"><th className="p-3">Transaction</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>{filteredTransactions.map((item) => <tr key={item.id} className="border-b border-white/[.07]">
            <td className="p-3"><strong className="block">{item.label}</strong><small className="text-white/30">{item.id}</small></td>
            <td>{item.date}</td><td className={item.amount.startsWith('+') ? 'text-mint' : ''}>{item.amount}</td><td><StatusBadge status={item.status} /></td>
            <td><Button size="sm" variant="ghost" onClick={() => { createRefundCase(item.id, `Review ${item.label}`); toast('Reconciliation case opened.', { type: 'success' }) }}>Review</Button></td>
          </tr>)}</tbody>
        </table></div>
      </DashboardPanel>
      <div className="space-y-5">
        <DashboardPanel title="Payment methods" action={<Button size="sm" variant="ghost" onClick={() => setMethodOpen(true)}>Add</Button>}>
          {paymentMethods.length ? <div className="space-y-2">{paymentMethods.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
            <WalletCards size={16} className="text-mint" />
            <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{item.label}</strong><small className="text-white/35">{item.type} · •••• {item.last4}</small></span>
            <button type="button" onClick={() => removePaymentMethod(item.id)} aria-label={`Remove ${item.label}`}><Trash2 size={14} className="text-white/30" /></button>
          </div>)}</div> : <p className="text-xs leading-5 text-white/35">No local payment method added yet.</p>}
        </DashboardPanel>
        <DashboardPanel title="Payout activity">
          {payoutRequests.length ? <div className="space-y-2">{payoutRequests.slice(0, 3).map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
            <span><strong className="block text-xs">{item.amount}</strong><small className="text-white/30">{new Date(item.createdAt).toLocaleDateString()}</small></span><StatusBadge status={item.status} />
          </div>)}</div> : <p className="text-xs text-white/35">No payout requests.</p>}
        </DashboardPanel>
      </div>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <DashboardPanel title="Escrow ledger" eyebrow="Workspace milestones">
        <div className="space-y-2">{escrowRows.length ? escrowRows.map((item) => <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-white/[.08] p-3">
          <span><strong className="block text-xs">{item.title}</strong><small className="text-white/35">{item.amount}</small></span><Badge variant={['FUNDED', 'RELEASED'].includes(item.status) ? 'mint' : 'outline'}>{item.status.replaceAll('_', ' ')}</Badge>
        </div>) : <p className="text-xs text-white/35">Escrow entries appear when a collaboration workspace is created.</p>}</div>
      </DashboardPanel>
      <DashboardPanel title="Refund & reconciliation">
        {refundCases.length ? <div className="space-y-2">{refundCases.slice(0, 5).map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/[.08] p-3">
          <span className="min-w-0 flex-1"><strong className="block text-xs">{item.transactionId}</strong><small className="line-clamp-1 text-white/35">{item.reason}</small></span>
          {item.status === 'Open' ? <Button size="sm" variant="outline" onClick={() => reconcileRefundCase(item.id)}>Reconcile</Button> : <StatusBadge status="Completed" />}
        </div>)}</div> : <p className="text-xs text-white/35">Use Review on a transaction to open a local reconciliation case.</p>}
      </DashboardPanel>
    </div>
    <div className="mt-5"><FeatureUnavailable title="Payment simulation only" description="Provider verification, real escrow, payouts, refunds and webhooks still require secure backend integration." /></div>
    <Dialog dark open={methodOpen} onClose={() => setMethodOpen(false)} title="Add payment method" description="Stores masked display data locally; no card or bank details are transmitted.">
      <form onSubmit={saveMethod} className="space-y-4">
        <Select label="Method type" value={method.type} onChange={(event) => setMethod((value) => ({ ...value, type: event.target.value }))} options={['Bank account', 'Payment card']} />
        <Input label="Display label" placeholder="Business operating account" value={method.label} onChange={(event) => setMethod((value) => ({ ...value, label: event.target.value }))} />
        <Input label="Last 4 digits" inputMode="numeric" maxLength={4} value={method.last4} onChange={(event) => setMethod((value) => ({ ...value, last4: event.target.value.replace(/\D/g, '') }))} />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setMethodOpen(false)}>Cancel</Button><Button type="submit" variant="mint">Save method</Button></div>
      </form>
    </Dialog>
    <Dialog dark open={payoutOpen} onClose={() => setPayoutOpen(false)} title="Request payout" description="Creates a local request for UX testing; no money is transferred.">
      <form onSubmit={submitPayout} className="space-y-4">
        <Input type="number" min="1" label="Amount (MNT)" value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)} />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setPayoutOpen(false)}>Cancel</Button><Button type="submit" variant="pink">Request payout</Button></div>
      </form>
    </Dialog>
  </DashboardPage>
}
