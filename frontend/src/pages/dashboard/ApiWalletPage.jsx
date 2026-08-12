import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw, Trash2, WalletCards } from 'lucide-react'
import { paymentApi } from '../../api/collaboration.api'
import { DashboardHeader, DashboardPage, DashboardPanel, StatusBadge } from '../../components/dashboard/DashboardUI'
import { Button, Dialog, EmptyState, Input, Skeleton, useToast } from '../../components/ui'

const money = (value, currency = 'MNT') => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0))
const errorMessage = (error, fallback) => error?.response?.data?.error?.message || error?.message || fallback

function downloadCsv(role, payments) {
  const rows = [['ID', 'Type', 'Status', 'Amount', 'Currency', 'Created'], ...payments.map((item) => [item.id, item.type, item.status, item.amount, item.currency, item.createdAt])]
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `vyra-${role}-transactions.csv`; anchor.click(); URL.revokeObjectURL(url)
}

export function WalletPage({ role }) {
  const { toast } = useToast()
  const [state, setState] = useState({ payments: [], methods: [], accounts: [], earnings: null, wallet: null, loading: true, error: '' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [method, setMethod] = useState({ brand: '', last4: '' })
  const [account, setAccount] = useState({ provider: '', accountName: '', accountNumber: '', bankCode: '' })
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpBusy, setTopUpBusy] = useState(false)

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const [payments, methods, accounts, earnings, wallet] = await Promise.all([
        paymentApi.transactions({ limit: 100 }),
        paymentApi.methods(),
        role === 'creator' ? paymentApi.payoutAccounts() : Promise.resolve({ accounts: [] }),
        role === 'creator' ? paymentApi.earningsSummary() : Promise.resolve(null),
        role === 'business' ? paymentApi.wallet() : Promise.resolve(null),
      ])
      setState({ payments: payments.items || [], methods: methods.methods || [], accounts: accounts.accounts || [], earnings, wallet, loading: false, error: '' })
    } catch (error) {
      setState({ payments: [], methods: [], accounts: [], earnings: null, wallet: null, loading: false, error: errorMessage(error, 'Payment records could not be loaded.') })
    }
  }, [role])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])

  const save = async (event) => {
    event.preventDefault()
    try {
      if (role === 'creator') {
        await paymentApi.addPayoutAccount({ ...account, currency: 'MNT', isDefault: state.accounts.length === 0 })
        setAccount({ provider: '', accountName: '', accountNumber: '', bankCode: '' })
      } else {
        if (!method.brand.trim() || !/^\d{4}$/.test(method.last4)) return toast('Add a method label and last four digits.', { type: 'error' })
        await paymentApi.addMethod({ tokenRef: `pm_demo_${Date.now()}`, brand: method.brand.trim(), last4: method.last4, isDefault: state.methods.length === 0 })
        setMethod({ brand: '', last4: '' })
      }
      setDialogOpen(false); await load(); toast(role === 'creator' ? 'Encrypted payout account saved.' : 'Payment method saved.', { type: 'success' })
    } catch (error) { toast(errorMessage(error, 'Account could not be saved.'), { type: 'error' }) }
  }

  const removeAccount = async (id) => {
    try { await (role === 'creator' ? paymentApi.removePayoutAccount(id) : paymentApi.removeMethod(id)); await load() }
    catch (error) { toast(errorMessage(error, 'Account could not be removed.'), { type: 'error' }) }
  }

  const exportEarnings = async () => {
    try {
      const response = await paymentApi.earningsExport()
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'vyra-earnings-tax-export.csv'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) { toast(errorMessage(error, 'Earnings export could not be downloaded.'), { type: 'error' }) }
  }

  const addFunds = async (event) => {
    event.preventDefault()
    const amount = Number(String(topUpAmount).replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) return toast('Enter a valid top-up amount.', { type: 'error' })
    setTopUpBusy(true)
    try {
      const result = await paymentApi.createTopUp({
        amount,
        currency: 'MNT',
        idempotencyKey: globalThis.crypto?.randomUUID?.() || `topup-${Date.now()}`,
      })
      const topUp = result.topUp
      if (topUp.checkoutUrl) { window.location.assign(topUp.checkoutUrl); return }
      setTopUpAmount('')
      setTopUpOpen(false)
      await load()
      toast(topUp.status === 'COMPLETED' ? 'Wallet balance updated.' : 'Top-up is waiting for verified provider confirmation.', { type: 'success' })
    } catch (error) { toast(errorMessage(error, 'Wallet top-up could not be started.'), { type: 'error' }) }
    finally { setTopUpBusy(false) }
  }

  const requestAction = async (item) => {
    try {
      if (role === 'creator') {
        const payoutAccount = state.accounts.find((entry) => entry.isDefault) || state.accounts[0]
        if (!payoutAccount) return toast('Add a payout account before requesting payout.', { type: 'error' })
        await paymentApi.requestPayout(item.id, { payoutAccountId: payoutAccount.id })
      } else await paymentApi.requestRefund(item.id, { reason: 'Refund requested from the business payment dashboard.', autoConfirm: false })
      await load(); toast(role === 'creator' ? 'Payout sent for admin approval.' : 'Refund request created.', { type: 'success' })
    } catch (error) { toast(errorMessage(error, 'The payment action could not be completed.'), { type: 'error' }) }
  }

  const savedAccounts = role === 'creator' ? state.accounts : state.methods
  return <DashboardPage>
    <DashboardHeader eyebrow={role === 'creator' ? 'Creator earnings' : 'Business wallet'} title={role === 'creator' ? 'Earnings' : 'Wallet'} copy="Balances and transactions are calculated from the immutable finance ledger." action={<div className="flex flex-wrap gap-2">{role === 'business' && <Button variant="mint" onClick={() => setTopUpOpen(true)}>Add funds</Button>}<Button variant="outline" onClick={() => downloadCsv(role, state.payments)} disabled={!state.payments.length}><Download size={14}/>Export CSV</Button>{role === 'creator' && <Button variant="outline" onClick={exportEarnings}><Download size={14}/>Tax export</Button>}</div>} secondary={<Button variant="outline" onClick={load}><RefreshCw size={14}/>Refresh</Button>}/>
    {state.error && <div role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-xs text-red-200">{state.error}</div>}
    {state.loading ? <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-28"/>)}</div> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><DashboardPanel title={role === 'creator' ? 'Available earnings' : 'Available balance'}><strong className="text-2xl">{money(role === 'creator' ? state.earnings?.availableEarnings : state.wallet?.availableBalance, state.earnings?.currency || state.wallet?.currency || 'MNT')}</strong></DashboardPanel><DashboardPanel title={role === 'creator' ? 'Pending earnings' : 'Total funded'}><strong className="text-2xl">{money(role === 'creator' ? state.earnings?.pendingEarnings : state.wallet?.totalFunded, state.earnings?.currency || state.wallet?.currency || 'MNT')}</strong></DashboardPanel><DashboardPanel title={role === 'creator' ? 'Paid out' : 'Total spent'}><strong className="text-2xl">{money(role === 'creator' ? state.earnings?.totalPaidOut : state.wallet?.totalSpent, state.earnings?.currency || state.wallet?.currency || 'MNT')}</strong></DashboardPanel><DashboardPanel title="Transactions"><strong className="text-2xl">{role === 'business' ? state.wallet?.transactions?.length || 0 : state.payments.length}</strong></DashboardPanel></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <DashboardPanel title="Transaction history"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-[.1em] text-white/30"><th className="p-3">Type</th><th>Status</th><th>Amount</th><th>Date</th><th></th></tr></thead><tbody>{state.payments.map((item) => { const eligible = role === 'creator' ? item.status === 'RELEASED' && Number(item.creatorAmount ?? item.amount) > 0 && ['FUNDING', 'MILESTONE_RELEASE'].includes(item.type) : ['FUNDING', 'BARTER_PLATFORM_FEE'].includes(item.type) && item.status === 'FUNDED'; return <tr key={item.id} className="border-b border-white/[.07]"><td className="p-3"><b>{item.type.replaceAll('_', ' ')}</b><small className="block text-white/30">{item.paymentType || 'PAID'}</small></td><td><StatusBadge status={item.status}/></td><td>{money(role === 'creator' ? item.creatorAmount ?? item.amount : item.amount, item.currency)}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td><td>{eligible && <Button size="sm" variant="outline" onClick={() => requestAction(item)}>{role === 'creator' ? 'Request payout' : 'Request refund'}</Button>}</td></tr>})}</tbody></table>{!state.payments.length && <EmptyState title="No transactions" description="Payment records appear after contract funding begins."/>}</div></DashboardPanel>
        <DashboardPanel title={role === 'creator' ? 'Payout accounts' : 'Payment methods'} action={<Button size="sm" variant="ghost" onClick={() => setDialogOpen(true)}>Add</Button>}>{savedAccounts.length ? <div className="space-y-2">{savedAccounts.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3"><WalletCards size={15} className="text-mint"/><span className="min-w-0 flex-1"><b className="block truncate text-xs">{item.accountName || item.brand || item.provider}</b><small className="text-white/35">•••• {item.last4 || '—'}{item.isDefault ? ' · Default' : ''}</small></span><button aria-label="Remove account" onClick={() => removeAccount(item.id)}><Trash2 size={14} className="text-white/30"/></button></div>)}</div> : <EmptyState title="No saved accounts" description={role === 'creator' ? 'Add an encrypted bank account before requesting payout.' : 'Add a tokenized provider method.'}/>}</DashboardPanel>
      </div>
    </>}
    <Dialog dark open={dialogOpen} onClose={() => setDialogOpen(false)} title={role === 'creator' ? 'Add payout account' : 'Add payment method'} description={role === 'creator' ? 'The complete account number is encrypted. Only its last four characters are returned.' : 'Raw card details are never stored.'}>
      {role === 'creator' ? <form onSubmit={save} className="space-y-4"><Input required label="Bank / provider" value={account.provider} onChange={(event) => setAccount((current) => ({ ...current, provider: event.target.value }))}/><Input required label="Account holder" value={account.accountName} onChange={(event) => setAccount((current) => ({ ...current, accountName: event.target.value }))}/><Input required label="Account number" value={account.accountNumber} onChange={(event) => setAccount((current) => ({ ...current, accountNumber: event.target.value.replace(/\s/g, '') }))}/><Input label="Bank code" value={account.bankCode} onChange={(event) => setAccount((current) => ({ ...current, bankCode: event.target.value }))}/><Button className="w-full" type="submit" variant="mint">Save encrypted account</Button></form> : <form onSubmit={save} className="space-y-4"><Input label="Method label" value={method.brand} onChange={(event) => setMethod((current) => ({ ...current, brand: event.target.value }))}/><Input label="Last four digits" value={method.last4} maxLength={4} inputMode="numeric" onChange={(event) => setMethod((current) => ({ ...current, last4: event.target.value.replace(/\D/g, '') }))}/><Button className="w-full" type="submit" variant="mint">Save method</Button></form>}
    </Dialog>
    <Dialog dark open={topUpOpen} onClose={() => setTopUpOpen(false)} title="Add funds" description="Development demo funds are confirmed instantly. Stripe funds are credited only after its signed webhook is verified.">
      <form className="space-y-4" onSubmit={addFunds}><Input label="Amount (MNT)" inputMode="numeric" value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} placeholder="1,000,000"/><div className="rounded-xl border border-white/10 p-3 text-[11px] leading-5 text-white/40">Repeated provider events are idempotent and cannot credit the wallet twice.</div><Button className="w-full" type="submit" variant="mint" loading={topUpBusy}>Add funds</Button></form>
    </Dialog>
  </DashboardPage>
}
