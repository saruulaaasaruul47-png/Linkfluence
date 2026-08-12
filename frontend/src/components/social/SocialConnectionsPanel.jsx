import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Plus, RefreshCw, Unplug } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { socialApi } from '../../api/social.api'
import { socialTrustPresentation } from '../../lib/trustPresentation'
import { Badge, Button, Dialog, EmptyState, Input, Select, Spinner } from '../ui'

const messageOf = (error, fallback) => error?.response?.data?.error?.message
  || error?.response?.data?.message || error?.message || fallback

export function SocialConnectionsPanel({ channelType = 'CREATOR' }) {
  const type = channelType.toUpperCase()
  const [params, setParams] = useSearchParams()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [manual, setManual] = useState({ platform: 'YOUTUBE', profileUrl: '', handle: '' })
  const [selection, setSelection] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await socialApi.list(type); setAccounts(result.accounts || []) }
    catch (reason) { setError(messageOf(reason, 'Social connections could not be loaded.')) }
    finally { setLoading(false) }
  }, [type])

  useEffect(() => {
    let active = true
    socialApi.list(type)
      .then((result) => { if (active) setAccounts(result.accounts || []) })
      .catch((reason) => { if (active) setError(messageOf(reason, 'Social connections could not be loaded.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [type])
  useEffect(() => {
    const token = params.get('selectionToken')
    if (params.get('social') !== 'select' || !token) return
    socialApi.selectionOptions(token)
      .then((result) => setSelection({ token, ...result }))
      .catch((reason) => setError(messageOf(reason, 'Authorized accounts could not be loaded.')))
  }, [params])

  const cleanCallback = () => {
    const next = new URLSearchParams(params)
    ;['social', 'selectionToken', 'platform'].forEach((key) => next.delete(key))
    setParams(next, { replace: true })
  }
  const connect = async (provider) => {
    setBusy(provider); setError('')
    try { const result = await socialApi.authorize(provider, type); window.location.assign(result.authorizeUrl) }
    catch (reason) { setError(messageOf(reason, 'Connection could not be started.')); setBusy('') }
  }
  const finishSelection = async (externalAccountId) => {
    setBusy(externalAccountId)
    try { await socialApi.completeSelection(selection.token, externalAccountId); setSelection(null); cleanCallback(); await load() }
    catch (reason) { setError(messageOf(reason, 'Social account could not be connected.')) }
    finally { setBusy('') }
  }
  const sync = async (id) => {
    setBusy(id)
    try { await socialApi.sync(id); await load() }
    catch (reason) { setError(messageOf(reason, 'Statistics could not be refreshed.')) }
    finally { setBusy('') }
  }
  const disconnect = async (id) => {
    if (!window.confirm('Disconnect this social account?')) return
    setBusy(id)
    try { await socialApi.disconnect(id, type); await load() }
    catch (reason) { setError(messageOf(reason, 'Account could not be disconnected.')) }
    finally { setBusy('') }
  }
  const addManual = async () => {
    if (!manual.profileUrl.trim()) { setError('Enter a profile URL first.'); return }
    setBusy('manual')
    try {
      await socialApi.createManual({ ...manual, handle: manual.handle.trim() || undefined }, type)
      setManual({ platform: 'YOUTUBE', profileUrl: '', handle: '' }); await load()
    } catch (reason) { setError(messageOf(reason, 'Manual profile could not be added.')) }
    finally { setBusy('') }
  }

  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><strong className="block text-sm">Social channels</strong><small className="mt-1 block max-w-xl text-[11px] leading-5 text-white/40">Connect a Facebook Page or Instagram professional account. Tokens stay encrypted and synchronized metrics are separated from manually entered links.</small></div>
      <div className="flex gap-2">{['instagram', 'facebook'].map((provider) => <Button key={provider} type="button" size="sm" variant="outline" loading={busy === provider} onClick={() => connect(provider)}>Connect <span className="capitalize">{provider}</span></Button>)}</div>
    </div>
    {loading ? <div className="grid min-h-28 place-items-center"><Spinner label="Loading social channels" /></div> : accounts.length ? <div className="mt-4 grid gap-2">{accounts.map((account) => {
      const trust = socialTrustPresentation(account)
      return <article key={account.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[.08] p-3">
        <div className="min-w-44 flex-1"><strong className="block truncate text-xs">{account.platform} · @{account.handle}</strong><small className="mt-1 block text-[10px] text-white/40">{Number(account.followerCount || 0).toLocaleString()} followers · {trust.detail}{account.recentMedia?.length ? ` · ${account.recentMedia.length} recent posts` : ''}</small></div>
        <Badge variant={trust.tone}>{trust.badge}</Badge>
        {account.profileUrl && <a href={account.profileUrl} target="_blank" rel="noreferrer" aria-label={`Open ${account.handle}`} className="grid size-8 place-items-center rounded-full border border-white/10"><ExternalLink size={13} /></a>}
        {trust.canRefresh && <Button type="button" size="sm" variant="ghost" loading={busy === account.id} onClick={() => sync(account.id)}><RefreshCw size={13} />Sync</Button>}
        {trust.needsReconnect && ['INSTAGRAM', 'FACEBOOK'].includes(account.platform) && <Button type="button" size="sm" variant="outline" onClick={() => connect(account.platform.toLowerCase())}>Reconnect</Button>}
        <Button type="button" size="sm" variant="ghost" disabled={busy === account.id} onClick={() => disconnect(account.id)}><Unplug size={13} />Disconnect</Button>
      </article>
    })}</div> : <EmptyState compact title="No social channels connected" description="Connect with Meta for verified metrics, or add another platform as a manual link." />}
    <div className="mt-4 grid gap-2 border-t border-white/[.07] pt-4 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(8rem,.6fr)_auto]">
      <Select aria-label="Manual social platform" value={manual.platform} onChange={(event) => setManual((value) => ({ ...value, platform: event.target.value }))} options={['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'X', 'OTHER']} />
      <Input aria-label="Manual profile URL" value={manual.profileUrl} onChange={(event) => setManual((value) => ({ ...value, profileUrl: event.target.value }))} placeholder="youtube.com/@channel" />
      <Input aria-label="Manual handle" value={manual.handle} onChange={(event) => setManual((value) => ({ ...value, handle: event.target.value }))} placeholder="Handle (optional)" />
      <Button type="button" size="sm" variant="outline" loading={busy === 'manual'} onClick={addManual}><Plus size={13} />Add link</Button>
    </div>
    {error && <p className="ui-error mt-3">{error}</p>}
    <Dialog dark open={Boolean(selection)} onClose={() => { setSelection(null); cleanCallback() }} title="Choose a social channel" description="Only the selected Page or professional account will be connected.">
      <div className="grid gap-2">{selection?.accounts?.map((account) => <button key={account.providerAccountId} type="button" disabled={Boolean(busy)} onClick={() => finishSelection(account.providerAccountId)} className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-left hover:bg-white/[.05]"><span className="grid size-9 place-items-center overflow-hidden rounded-full bg-mint text-xs font-bold text-black">{account.profilePictureUrl ? <img src={account.profilePictureUrl} alt="" className="size-full object-cover" /> : account.handle?.slice(0, 2).toUpperCase()}</span><span><strong className="block text-xs">{account.name || account.handle}</strong><small className="text-[10px] text-white/40">@{account.handle}</small></span></button>)}</div>
    </Dialog>
  </section>
}
