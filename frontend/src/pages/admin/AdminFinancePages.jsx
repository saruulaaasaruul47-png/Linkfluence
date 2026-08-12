import { useCallback, useEffect, useMemo, useState } from 'react'
import { Landmark, ReceiptText, RotateCcw, Search, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/dashboard.api'
import { AdminHeader, AdminPage, AdminPanel, AdminStat, DangerAction, StatusBadge } from '../../components/admin/AdminUI'
import { Button, Drawer, EmptyState, Input, Select, Skeleton, useToast } from '../../components/ui'

const money = (value, currency = 'MNT') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'MNT', maximumFractionDigits: 0 }).format(Number(value || 0))
  } catch {
    return `${Number(value || 0).toLocaleString()} ${currency || 'MNT'}`
  }
}
const date = (value) => value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)) : '—'
const titleCase = (value = '') => String(value).toLowerCase().replace(/(^|_)[a-z]/g, (match) => match.replace('_', ' ').toUpperCase())
const partyName = (profile, fallback = '—') => profile?.companyName || profile?.channelName || profile?.displayName || profile?.email || fallback

const tabs = [
  ['overview', 'Overview', '/admin/finance', Landmark],
  ['wallet', 'Wallet', '/admin/finance/wallet', WalletCards],
  ['transactions', 'Transactions', '/admin/finance/transactions', ReceiptText],
]

const transactionViews = [
  { value: 'all', label: 'All', resource: 'transactions' },
  { value: 'payments', label: 'Payments', resource: 'transactions', type: 'PAYMENTS' },
  { value: 'earnings', label: 'Earnings', resource: 'revenue', status: 'EARNED' },
  { value: 'fees', label: 'Fees', resource: 'transactions', type: 'PLATFORM_FEES' },
  { value: 'payouts', label: 'Payouts', resource: 'payouts' },
  { value: 'refunds', label: 'Refunds', resource: 'refunds' },
]
const transactionViewMap = Object.fromEntries(transactionViews.map((item) => [item.value, item]))
const currencies = [{ label: 'All currencies', value: '' }, { label: 'MNT', value: 'MNT' }, { label: 'USD', value: 'USD' }]
const statusOptions = {
  payouts: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'],
  refunds: ['PENDING', 'PROCESSING', 'REFUNDED', 'FAILED', 'CANCELLED'],
}

function FinanceTabs({ active }) {
  const navigate = useNavigate()
  return (
    <nav aria-label="Finance sections" className="mb-5 flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#151515] p-2 [scrollbar-width:none]">
      {tabs.map(([value, label, href, Icon]) => (
        <button
          ref={(node) => { if (active === value) node?.scrollIntoView({ block: 'nearest', inline: 'center' }) }}
          type="button"
          key={value}
          onClick={() => navigate(href)}
          aria-current={active === value ? 'page' : undefined}
          className={`flex min-h-10 min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[11px] font-bold transition ${active === value ? 'bg-pink text-black' : 'text-white/40 hover:bg-white/[.05] hover:text-white'}`}
        >
          <Icon size={14} />{label}
        </button>
      ))}
    </nav>
  )
}

function TransactionFilters({ resource, filters, onChange }) {
  const statuses = statusOptions[resource] || []
  const set = (key) => (event) => onChange({ ...filters, [key]: event.target.value, page: 1 })
  return (
    <div className={`mb-4 grid gap-2 rounded-2xl border border-white/10 bg-[#151515] p-3 md:grid-cols-2 ${statuses.length ? 'xl:grid-cols-[minmax(16rem,1fr)_10rem_9rem_9rem_9rem]' : 'xl:grid-cols-[minmax(16rem,1fr)_10rem_9rem_9rem]'}`}>
      <label className="relative min-w-0">
        <span className="sr-only">Search finance records</span>
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={filters.q} onChange={set('q')} placeholder="Search ID, account or collaboration..." className="h-10 w-full rounded-xl border border-white/10 bg-white/[.035] pl-9 pr-3 text-xs outline-none focus:border-pink" />
      </label>
      {statuses.length > 0 && <Select aria-label="Status" value={filters.status} onChange={set('status')} options={[{ label: 'All statuses', value: '' }, ...statuses.map((value) => ({ label: titleCase(value), value }))]} />}
      <Select aria-label="Currency" value={filters.currency} onChange={set('currency')} options={currencies} />
      <label className="min-w-0"><span className="sr-only">From date</span><input aria-label="From date" type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={set('dateFrom')} className="h-10 w-full rounded-xl border border-white/10 bg-white/[.035] px-3 text-[11px] text-white/65 outline-none focus:border-pink" /></label>
      <label className="min-w-0"><span className="sr-only">To date</span><input aria-label="To date" type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={set('dateTo')} className="h-10 w-full rounded-xl border border-white/10 bg-white/[.035] px-3 text-[11px] text-white/65 outline-none focus:border-pink" /></label>
    </div>
  )
}

function mapTransaction(item) {
  const collaboration = item.collaboration
  const owner = item.debitAccount?.owner || item.creditAccount?.owner
  const business = partyName(collaboration?.business)
  const creator = partyName(collaboration?.creator)
  return {
    ...item,
    typeText: titleCase(item.type),
    account: partyName(owner, collaboration ? `${business} → ${creator}` : item.debitAccount?.code || item.creditAccount?.code),
    reference: collaboration?.campaign?.title || collaboration?.id || item.postingBatchId,
    amountText: money(item.amount, item.currency),
    statusText: item.payment?.status ? titleCase(item.payment.status) : 'Posted',
    dateText: date(item.occurredAt || item.createdAt),
    paymentReference: item.payment?.id || item.paymentId || '—',
    providerReference: item.payment?.providerRef || '—',
    completedText: date(item.payment?.processedAt),
  }
}

function mapRevenue(item) {
  const collaboration = item.collaboration
  const isBarter = item.source === 'BARTER_SERVICE_FEE'
  return {
    ...item,
    typeText: isBarter ? 'Barter fee' : item.source === 'OTHER' ? 'Other' : 'Earning',
    sourceText: titleCase(item.source),
    reference: collaboration?.campaign?.title || collaboration?.id || 'Direct collaboration',
    business: partyName(collaboration?.business),
    creator: partyName(collaboration?.creator),
    baseAmountText: isBarter ? money(collaboration?.barterEstimatedValue, item.currency) : money(item.payment?.cashAmount, item.currency),
    rateText: isBarter ? 'Fixed fee' : `${Number(item.payment?.commissionRate || 0)}%`,
    amountText: money(item.amount, item.currency),
    statusText: titleCase(item.status),
    dateText: date(item.earnedAt || item.createdAt),
  }
}

function mapPayout(item) {
  const collaboration = item.payment?.collaboration
  return {
    ...item,
    creator: partyName(item.creator),
    reference: collaboration?.campaign?.title || collaboration?.id || 'Direct collaboration',
    amountText: money(item.amount, item.payment?.currency),
    currency: item.payment?.currency || 'MNT',
    method: `${item.payoutAccount?.provider || 'Provider'} •••• ${item.payoutAccount?.last4 || '—'}`,
    statusText: titleCase(item.status),
    requestedText: date(item.createdAt),
    processedText: date(item.processedAt),
  }
}

function mapRefund(item) {
  const collaboration = item.payment?.collaboration
  return {
    ...item,
    paymentReference: item.payment?.id || item.paymentId,
    requester: partyName(item.requester),
    reference: collaboration?.campaign?.title || collaboration?.id || 'Direct collaboration',
    amountText: money(item.amount, item.payment?.currency),
    currency: item.payment?.currency || 'MNT',
    statusText: titleCase(item.status),
    requestedText: date(item.createdAt),
    processedText: date(item.processedAt),
  }
}

function mapUnifiedRecord(resource, item) {
  if (resource === 'revenue') {
    const row = mapRevenue(item)
    return { ...row, sourceResource: resource, description: `${row.business} → ${row.creator}`, related: row.reference }
  }
  if (resource === 'payouts') {
    const row = mapPayout(item)
    return { ...row, sourceResource: resource, typeText: 'Payout', description: `${row.creator} · ${row.method}`, related: row.reference, dateText: row.requestedText }
  }
  if (resource === 'refunds') {
    const row = mapRefund(item)
    return { ...row, sourceResource: resource, typeText: 'Refund', description: row.reason || `Requested by ${row.requester}`, related: row.reference, dateText: row.requestedText }
  }
  const row = mapTransaction(item)
  return { ...row, sourceResource: resource, description: item.description || row.account, related: row.reference }
}

const unifiedColumns = [
  ['typeText', 'Type'], ['description', 'Description'], ['amountText', 'Amount'], ['statusText', 'Status'], ['dateText', 'Date'], ['related', 'Campaign / contract'],
]
const payoutColumns = [
  ['creator', 'Creator'], ['reference', 'Campaign / contract'], ['amountText', 'Amount'], ['method', 'Payout method'], ['statusText', 'Status'], ['requestedText', 'Requested'], ['processedText', 'Processed'],
]

function FinanceTable({ rows, columns, pagination, loading, error, onRow, onPage }) {
  if (loading) return <div className="space-y-2 rounded-2xl border border-white/10 bg-[#151515] p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
  if (error) return <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-xs text-red-200">{error}</div>
  if (!rows.length) return <div className="rounded-2xl border border-white/10 bg-[#151515] p-6"><EmptyState title="No finance records found" description="Try changing the search, date, status, type or currency filters." /></div>
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead><tr className="border-b border-white/10 text-[9px] uppercase tracking-[.12em] text-white/30">{columns.map(([key, label]) => <th key={key} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} tabIndex={0} onClick={() => onRow(row)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onRow(row) }} className="cursor-pointer border-b border-white/[.065] outline-none transition hover:bg-white/[.025] focus-visible:bg-white/[.04]">{columns.map(([key]) => <td key={key} className="max-w-56 px-4 py-4"><div className="truncate">{key === 'statusText' ? <StatusBadge status={row[key]} /> : row[key] ?? '—'}</div></td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-[10px] text-white/35">
        <span>{pagination.total} records · Page {pagination.page} of {Math.max(1, pagination.totalPages)}</span>
        <div className="flex gap-2"><Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={pagination.page >= pagination.totalPages} onClick={() => onPage(pagination.page + 1)}>Next</Button></div>
      </div>
    </section>
  )
}

function DetailRows({ items }) {
  return <dl className="divide-y divide-white/[.07] rounded-2xl border border-white/10">{items.filter(([, value]) => value !== undefined && value !== null).map(([label, value]) => <div key={label} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-4 py-3 text-xs"><dt className="text-white/35">{label}</dt><dd className="min-w-0 break-words text-white/80">{value || '—'}</dd></div>)}</dl>
}

function TransactionDetail({ item, onRefund, refundReason, setRefundReason }) {
  const collaboration = item.collaboration
  const refundable = item.payment?.type === 'FUNDING' && item.payment?.status === 'FUNDED'
  return <div className="space-y-4"><DetailRows items={[
    ['Transaction ID', item.id], ['Type', item.typeText], ['Amount', item.amountText], ['Currency', item.currency], ['Status', item.statusText],
    ['Business', partyName(collaboration?.business)], ['Creator', partyName(collaboration?.creator)], ['Campaign / contract', collaboration?.campaign?.title || collaboration?.id],
    ['Payment reference', item.paymentReference], ['Provider', item.payment?.provider || 'Internal'], ['Provider reference', item.providerReference],
    ['Created', item.dateText], ['Completed', item.completedText],
  ]} />{refundable && <div className="space-y-3"><Input label="Refund audit reason" value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder="Why is this refund required?" /><DangerAction label="Issue refund" title="Create refund request" description="The backend validates eligibility and records this action in the audit log." onConfirm={onRefund} /></div>}</div>
}

function RevenueDetail({ item }) {
  return <DetailRows items={[
    ['Revenue ID', item.id], ['Type', item.typeText], ['Source', item.sourceText], ['Status', item.statusText], ['Platform revenue', item.amountText],
    ['Base amount', item.baseAmountText], ['Rate / fee', item.rateText], ['Business', item.business], ['Creator', item.creator], ['Campaign / contract', item.reference],
    ['Payment reference', item.payment?.id], ['Earned at', date(item.earnedAt)], ['Created', date(item.createdAt)],
  ]} />
}

function PayoutDetail({ item, reason, setReason, onDecision }) {
  const collaboration = item.payment?.collaboration
  return <div className="space-y-4"><DetailRows items={[
    ['Request ID', item.id], ['Creator', item.creator], ['Amount', item.amountText], ['Status', item.statusText], ['Payout method', item.method],
    ['Account name', item.payoutAccount?.accountName], ['Bank code', item.payoutAccount?.bankCode], ['Campaign / contract', item.reference], ['Business', partyName(collaboration?.business)],
    ['Payment reference', item.payment?.id], ['Provider reference', item.providerRef], ['Requested', item.requestedText], ['Approved', date(item.approvedAt)], ['Processed', item.processedText], ['Rejection reason', item.rejectionReason],
  ]} />{item.status === 'PENDING' && <div className="space-y-3"><Input label="Decision audit reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Document the verification performed" /><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => onDecision('REJECT')}>Reject</Button><Button variant="mint" onClick={() => onDecision('APPROVE')}>Approve</Button></div></div>}</div>
}

function RefundDetail({ item, onOriginal }) {
  const collaboration = item.payment?.collaboration
  return <div className="space-y-4"><DetailRows items={[
    ['Refund ID', item.id], ['Original payment', item.paymentReference], ['Requester', item.requester], ['Amount', item.amountText], ['Status', item.statusText],
    ['Reason', item.reason], ['Campaign / contract', item.reference], ['Business', partyName(collaboration?.business)], ['Creator', partyName(collaboration?.creator)],
    ['Provider reference', item.providerRef], ['Created', item.requestedText], ['Processed', item.processedText],
  ]} /><Button variant="outline" onClick={onOriginal}>View original transaction</Button></div>
}

function sixMonthSeries(items) {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, index) => {
    const value = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return { key: `${value.getFullYear()}-${value.getMonth()}`, label: value.toLocaleDateString('en', { month: 'short' }), value: 0 }
  })
  items.forEach((item) => {
    const value = new Date(item.earnedAt || item.createdAt)
    const month = months.find((entry) => entry.key === `${value.getFullYear()}-${value.getMonth()}`)
    if (month) month.value += Number(item.amount || 0)
  })
  return months
}

function FinanceOverview() {
  const navigate = useNavigate()
  const [state, setState] = useState({ data: null, revenue: [], transactions: [], loading: true, error: '' })
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10)
    try {
      const [data, revenue, transactions] = await Promise.all([
        adminApi.financeOverview(),
        adminApi.financeList('revenue', { status: 'EARNED', dateFrom: sixMonthsAgo, page: 1, limit: 100 }),
        adminApi.financeList('transactions', { page: 1, limit: 6 }),
      ])
      setState({ data, revenue: revenue.items || [], transactions: (transactions.items || []).map(mapTransaction), loading: false, error: '' })
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.response?.data?.error?.message || 'Financial overview could not be loaded.' }))
    }
  }, [])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  const chart = useMemo(() => sixMonthSeries(state.revenue), [state.revenue])
  const chartMax = Math.max(...chart.map((item) => item.value), 1)
  const thisMonth = useMemo(() => {
    const now = new Date()
    return state.revenue.reduce((sum, item) => {
      const earned = new Date(item.earnedAt || item.createdAt)
      return earned.getFullYear() === now.getFullYear() && earned.getMonth() === now.getMonth() ? sum + Number(item.amount || 0) : sum
    }, 0)
  }, [state.revenue])
  const data = state.data
  return <AdminPage>
    <AdminHeader eyebrow="Finance · Platform ledger" title="Finance center" copy="Revenue, balances and recent money movement in one place." date={false} action={<Button variant="outline" onClick={load}><RotateCcw size={14} />Refresh</Button>} />
    <FinanceTabs active="overview" />
    {state.loading && <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-56" /></div>}
    {state.error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-xs text-red-200">{state.error}</div>}
    {data && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Total revenue" value={money(data.platformRevenue)} change="Earned platform income" tone="mint" />
        <AdminStat label="Available balance" value={money(data.adminWalletBalance)} change="Available in admin wallet" tone="mint" />
        <AdminStat label="Pending balance" value={money(data.pendingRevenue)} change="Reserved until approval" />
        <AdminStat label="This month revenue" value={money(thisMonth)} change="Earned this calendar month" />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(21rem,.65fr)]">
        <AdminPanel title="Revenue · last 6 months">
          <div className="flex h-48 items-end gap-3 border-b border-white/10 px-1 pt-4">
            {chart.map((item) => <div key={item.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2 text-center"><span className="truncate text-[9px] text-white/30">{item.value ? money(item.value) : '—'}</span><div className="mx-auto w-full max-w-14 rounded-t-lg bg-gradient-to-t from-pink/55 to-mint/80 transition-[height]" style={{ height: item.value ? `${Math.max(10, (item.value / chartMax) * 132)}px` : '3px' }} /><span className="pb-2 text-[9px] uppercase tracking-[.1em] text-white/35">{item.label}</span></div>)}
          </div>
        </AdminPanel>
        <AdminPanel title="Payment summary">
          <div className="space-y-2">{[
            ['Escrow held', data.escrowHeld], ['Pending payouts', data.pendingPayoutAmount], ['Refunded', data.refundedAmount], ['Creator earnings', data.creatorEarnings],
          ].map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-xl border border-white/[.08] px-3 py-3 text-xs"><span className="text-white/40">{label}</span><strong>{money(value)}</strong></div>)}</div>
        </AdminPanel>
      </div>
      <AdminPanel className="mt-5" title="Recent transactions" action={<Button size="sm" variant="ghost" onClick={() => navigate('/admin/finance/transactions')}>View all</Button>}>
        {state.transactions.length ? <div className="divide-y divide-white/[.07]">{state.transactions.map((item) => <div key={item.id} className="grid gap-2 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_8rem_7rem] sm:items-center"><div className="min-w-0"><strong className="block truncate text-white/80">{item.typeText}</strong><small className="mt-1 block truncate text-[10px] text-white/30">{item.reference} · {item.dateText}</small></div><strong className="sm:text-right">{item.amountText}</strong><div className="sm:text-right"><StatusBadge status={item.statusText} /></div></div>)}</div> : <EmptyState title="No recent transactions" description="Ledger activity appears here after a payment is posted." />}
      </AdminPanel>
    </>}
  </AdminPage>
}

function AdminWalletPage() {
  const [page, setPage] = useState(1)
  const [state, setState] = useState({ overview: null, rows: [], pagination: { page: 1, total: 0, totalPages: 1 }, summary: null, loading: true, error: '' })
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState('')
  const { toast } = useToast()
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const [overview, payouts] = await Promise.all([
        adminApi.financeOverview(),
        adminApi.financeList('payouts', { page, limit: 20 }),
      ])
      setState({ overview, rows: (payouts.items || []).map(mapPayout), pagination: payouts.pagination || { page: 1, total: 0, totalPages: 1 }, summary: payouts.summary || null, loading: false, error: '' })
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.response?.data?.error?.message || 'Admin wallet could not be loaded.' }))
    }
  }, [page])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  const openPayout = async (row) => {
    setSelected(row); setReason('')
    try { const data = await adminApi.financeDetail('payouts', row.id); setSelected(mapPayout(data.item)) } catch (error) { toast(error.response?.data?.error?.message || 'Payout detail could not be loaded.', { type: 'error' }) }
  }
  const decide = async (action) => {
    if (reason.trim().length < 5) return toast('Enter an audit reason of at least 5 characters.', { type: 'error' })
    try { await adminApi.decidePayout(selected.id, { action, reason: reason.trim(), autoConfirm: false }); toast(`Payout ${action === 'APPROVE' ? 'approved' : 'rejected'}.`, { type: 'success' }); setSelected(null); load() } catch (error) { toast(error.response?.data?.error?.message || 'Payout decision failed.', { type: 'error' }) }
  }
  const reconcile = async () => {
    const now = new Date(); const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    try { await adminApi.runReconciliation({ periodStart: start.toISOString(), periodEnd: now.toISOString() }); toast('Reconciliation completed.', { type: 'success' }); load() } catch (error) { toast(error.response?.data?.error?.message || 'Reconciliation failed.', { type: 'error' }) }
  }
  const methods = useMemo(() => {
    const byMethod = new Map()
    state.rows.forEach((item) => { if (!byMethod.has(item.method)) byMethod.set(item.method, item) })
    return [...byMethod.values()].slice(0, 4)
  }, [state.rows])
  const data = state.overview
  return <AdminPage>
    <AdminHeader eyebrow="Finance · Platform wallet" title="Wallet" copy="Available balance, pending funds, payout methods and payout history." date={false} action={<Button variant="outline" onClick={reconcile}><RotateCcw size={14} />Reconcile</Button>} />
    <FinanceTabs active="wallet" />
    {state.loading && <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div><Skeleton className="h-64" /></div>}
    {state.error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-xs text-red-200">{state.error}</div>}
    {data && <>
      <div className="grid gap-3 md:grid-cols-3">
        <AdminPanel title="Available balance" className="border-mint/20 bg-mint/[.045]"><strong className="mt-2 block text-3xl tracking-[-.04em] text-mint">{money(data.adminWalletBalance)}</strong><p className="mt-2 text-[10px] leading-4 text-white/35">Earned platform commission available in the admin ledger.</p></AdminPanel>
        <AdminPanel title="Pending balance"><strong className="mt-2 block text-3xl tracking-[-.04em]">{money(data.pendingRevenue)}</strong><p className="mt-2 text-[10px] leading-4 text-white/35">Platform share reserved until the work is approved.</p></AdminPanel>
        <AdminPanel title="Payout queue"><strong className="mt-2 block text-3xl tracking-[-.04em]">{money(data.pendingPayoutAmount)}</strong><p className="mt-2 text-[10px] leading-4 text-white/35">{state.rows.filter((item) => item.status === 'PENDING').length} pending request(s) on this page.</p></AdminPanel>
      </div>
      <AdminPanel className="mt-5" title="Payout methods" action={<span className="text-[9px] uppercase tracking-[.1em] text-white/25">Encrypted account data</span>}>
        {methods.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{methods.map((item) => <button key={`${item.id}-${item.method}`} type="button" onClick={() => openPayout(item)} className="rounded-xl border border-white/10 p-3 text-left transition hover:border-mint/35"><WalletCards size={15} className="mb-3 text-mint" /><strong className="block truncate text-xs">{item.method}</strong><small className="mt-1 block truncate text-[10px] text-white/35">{item.payoutAccount?.accountName || item.creator}</small></button>)}</div> : <EmptyState title="No payout methods" description="Creator payout accounts appear after the first withdrawal request." />}
      </AdminPanel>
      <div className="mt-5"><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">Payout history</h2><p className="mt-1 text-[10px] text-white/35">Open a pending row to approve or reject the withdrawal request.</p></div></div><FinanceTable rows={state.rows} columns={payoutColumns} pagination={state.pagination} loading={false} error="" onRow={openPayout} onPage={setPage} /></div>
    </>}
    <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title="Payout detail">{selected && <PayoutDetail item={selected} reason={reason} setReason={setReason} onDecision={decide} />}</Drawer>
  </AdminPage>
}

function TransactionsPage() {
  const navigate = useNavigate()
  const initialView = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('view') || 'all'
    return transactionViewMap[value] ? value : 'all'
  }, [])
  const initialSearch = useMemo(() => new URLSearchParams(window.location.search).get('q') || '', [])
  const [view, setView] = useState(initialView)
  const [filters, setFilters] = useState({ q: initialSearch, status: '', currency: '', dateFrom: '', dateTo: '', page: 1, limit: 20 })
  const [state, setState] = useState({ rows: [], pagination: { page: 1, total: 0, totalPages: 1 }, loading: true, error: '' })
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const { toast } = useToast()
  const config = transactionViewMap[view]
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    const params = Object.fromEntries(Object.entries({
      q: filters.q,
      status: filters.status || config.status,
      currency: filters.currency,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      page: filters.page,
      limit: filters.limit,
      type: config.type,
    }).filter(([, value]) => value !== '' && value !== undefined))
    try {
      const data = await adminApi.financeList(config.resource, params)
      setState({ rows: (data.items || []).map((item) => mapUnifiedRecord(config.resource, item)), pagination: data.pagination || { page: 1, total: 0, totalPages: 1 }, loading: false, error: '' })
    } catch (error) {
      setState((current) => ({ ...current, rows: [], loading: false, error: error.response?.data?.error?.message || 'Transactions could not be loaded.' }))
    }
  }, [config.resource, config.status, config.type, filters])
  useEffect(() => { const timer = window.setTimeout(load, filters.q ? 250 : 0); return () => window.clearTimeout(timer) }, [load, filters.q])
  const changeView = (next) => {
    setView(next)
    setFilters((current) => ({ ...current, status: '', page: 1 }))
    navigate(`/admin/finance/transactions${next === 'all' ? '' : `?view=${next}`}`, { replace: true })
  }
  const openDetail = async (row) => {
    setSelected({ resource: row.sourceResource, item: row }); setReason(''); setRefundReason('')
    try {
      const data = await adminApi.financeDetail(row.sourceResource, row.id)
      const mapper = row.sourceResource === 'transactions' ? mapTransaction : row.sourceResource === 'revenue' ? mapRevenue : row.sourceResource === 'payouts' ? mapPayout : mapRefund
      setSelected({ resource: row.sourceResource, item: mapper(data.item) })
    } catch (error) { toast(error.response?.data?.error?.message || 'Finance detail could not be loaded.', { type: 'error' }) }
  }
  const decide = async (action) => {
    if (reason.trim().length < 5) return toast('Enter an audit reason of at least 5 characters.', { type: 'error' })
    try { await adminApi.decidePayout(selected.item.id, { action, reason: reason.trim(), autoConfirm: false }); toast(`Payout ${action === 'APPROVE' ? 'approved' : 'rejected'}.`, { type: 'success' }); setSelected(null); load() } catch (error) { toast(error.response?.data?.error?.message || 'Payout decision failed.', { type: 'error' }) }
  }
  const refund = async () => {
    if (refundReason.trim().length < 5) return toast('Enter an audit reason of at least 5 characters.', { type: 'error' })
    try { await adminApi.refundPayment(selected.item.payment?.id, { reason: refundReason.trim() }); toast('Refund request created.', { type: 'success' }); setSelected(null); changeView('refunds') } catch (error) { toast(error.response?.data?.error?.message || 'Refund could not be created.', { type: 'error' }) }
  }
  const showOriginal = () => {
    const paymentId = selected?.item?.paymentReference || ''
    setSelected(null); setView('payments'); setFilters((current) => ({ ...current, q: paymentId, status: '', page: 1 })); navigate(`/admin/finance/transactions?view=payments&q=${encodeURIComponent(paymentId)}`, { replace: true })
  }
  return <AdminPage>
    <AdminHeader eyebrow="Finance · Money movement" title="Transactions" copy="Payments, earnings, fees, payouts and refunds in one searchable ledger view." date={false} action={<Button variant="outline" onClick={load}><RotateCcw size={14} />Refresh</Button>} />
    <FinanceTabs active="transactions" />
    <div className="mb-3 flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#151515] p-1.5 [scrollbar-width:none]" role="tablist" aria-label="Transaction type">
      {transactionViews.map((item) => <button type="button" role="tab" aria-selected={view === item.value} key={item.value} onClick={() => changeView(item.value)} className={`min-h-9 min-w-max flex-1 rounded-xl px-4 text-[10px] font-bold transition ${view === item.value ? 'bg-white text-black' : 'text-white/40 hover:bg-white/[.05] hover:text-white'}`}>{item.label}</button>)}
    </div>
    <TransactionFilters resource={config.resource} filters={filters} onChange={setFilters} />
    <FinanceTable rows={state.rows} columns={unifiedColumns} pagination={state.pagination} loading={state.loading} error={state.error} onRow={openDetail} onPage={(page) => setFilters((current) => ({ ...current, page }))} />
    <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title="Transaction detail">
      {selected?.resource === 'transactions' && <TransactionDetail item={selected.item} onRefund={refund} refundReason={refundReason} setRefundReason={setRefundReason} />}
      {selected?.resource === 'revenue' && <RevenueDetail item={selected.item} />}
      {selected?.resource === 'payouts' && <PayoutDetail item={selected.item} reason={reason} setReason={setReason} onDecision={decide} />}
      {selected?.resource === 'refunds' && <RefundDetail item={selected.item} onOriginal={showOriginal} />}
    </Drawer>
  </AdminPage>
}

export function AdminFinancePage({ section = 'overview' }) {
  if (section === 'overview') return <FinanceOverview />
  if (section === 'wallet') return <AdminWalletPage />
  return <TransactionsPage />
}
