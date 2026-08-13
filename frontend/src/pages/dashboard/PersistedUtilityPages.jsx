import { useCallback, useEffect, useState } from 'react'
import { Download, Edit3, ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { businessApi } from '../../api/business.api'
import { creatorApi } from '../../api/creator.api'
import { notificationApi } from '../../api/dashboard.api'
import { mediaApi } from '../../api/media.api'
import { resolveMediaUrl } from '../../api/mediaUrl'
import { DashboardHeader, DashboardPage, DashboardPanel } from '../../components/dashboard/DashboardUI'
import { SocialConnectionsPanel } from '../../components/social/SocialConnectionsPanel'
import { Badge, Button, Dialog, EmptyState, FileUpload, Input, Select, Spinner, Switch, Tabs, Textarea, useToast } from '../../components/ui'
import { useAuth } from '../../context/auth-context'
import { useMarketplace } from '../../context/marketplace-context'
import { useUser } from '../../hooks/useUser'

const errorMessage = (error, fallback) => error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || fallback
const emptyDraft = { title: '', category: '', status: 'PUBLISHED', description: '', mediaAssetId: '', mediaLabel: '' }

export function PortfolioPage() {
  const { toast } = useToast()
  const { account } = useMarketplace()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [draft, setDraft] = useState(emptyDraft)
  const [mediaFile, setMediaFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const result = await creatorApi.listPortfolio()
      setItems(result.items || [])
    } catch (reason) { setError(errorMessage(reason, 'Portfolio could not be loaded.')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let active = true
    creatorApi.listPortfolio()
      .then((result) => { if (active) setItems(result.items || []) })
      .catch((reason) => { if (active) setError(errorMessage(reason, 'Portfolio could not be loaded.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const openEditor = (item = null) => {
    setEditing(item?.id || null)
    setMediaFile(null)
    setDraft(item ? {
      title: item.title,
      category: item.category || '',
      status: item.status,
      description: item.description || '',
      mediaAssetId: '',
      mediaLabel: item.mediaUrl ? 'Current media' : '',
    } : emptyDraft)
    setOpen(true)
  }
  const save = async (event) => {
    event.preventDefault()
    if (!draft.title.trim() || !draft.category || (!editing && !mediaFile)) {
      toast('Title, category and media are required.', { type: 'error' }); return
    }
    setSaving(true)
    try {
      let mediaAssetId
      if (mediaFile) {
        const upload = await mediaApi.upload(mediaFile, 'PORTFOLIO')
        mediaAssetId = upload.asset.id
      }
      const payload = {
        title: draft.title.trim(),
        category: draft.category,
        status: draft.status,
        description: draft.description.trim(),
        ...(mediaAssetId ? { mediaAssetId } : {}),
      }
      const result = editing
        ? await creatorApi.updatePortfolio(editing, payload)
        : await creatorApi.createPortfolio(payload)
      setItems((current) => editing
        ? current.map((item) => item.id === editing ? result.item : item)
        : [result.item, ...current])
      setOpen(false)
      toast(editing ? 'Portfolio item updated.' : 'Portfolio item published to your channel.', { type: 'success' })
    } catch (reason) { toast(errorMessage(reason, 'Portfolio item could not be saved.'), { type: 'error' }) }
    finally { setSaving(false) }
  }
  const remove = async () => {
    if (!editing || !window.confirm('Delete this portfolio project?')) return
    setSaving(true)
    try {
      await creatorApi.deletePortfolio(editing)
      setItems((current) => current.filter((item) => item.id !== editing))
      setOpen(false)
      toast('Portfolio project deleted.', { type: 'success' })
    } catch (reason) { toast(errorMessage(reason, 'Portfolio project could not be deleted.'), { type: 'error' }) }
    finally { setSaving(false) }
  }
  const downloadKit = async () => {
    try {
      const response = await creatorApi.downloadMediaKit()
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${account.creator.username?.replace('@', '') || 'creator'}-media-kit.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
      toast('Media kit downloaded.', { type: 'success' })
    } catch (reason) { toast(errorMessage(reason, 'Media kit could not be generated.'), { type: 'error' }) }
  }
  const visible = items.filter((item) => filter === 'ALL' || item.status === filter)
  const published = items.filter((item) => item.status === 'PUBLISHED').length

  return <DashboardPage>
    <DashboardHeader eyebrow="Creator channel" title="Portfolio" copy="Portfolio projects are stored on your creator channel and remain after refresh." action={<div className="flex gap-2"><Button variant="outline" onClick={downloadKit}><Download size={15} />Media kit</Button><Button variant="pink" onClick={() => openEditor()}><ImagePlus size={15} />Add project</Button></div>} />
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-5 px-2 text-xs"><span><b className="mr-1.5">{items.length}</b><i className="not-italic text-white/35">Projects</i></span><span><b className="mr-1.5 text-mint">{published}</b><i className="not-italic text-white/35">Published</i></span><span><b className="mr-1.5 text-pink">{items.length - published}</b><i className="not-italic text-white/35">Drafts</i></span></div><div className="flex rounded-xl bg-black/20 p-1">{[['ALL', 'All'], ['PUBLISHED', 'Published'], ['DRAFT', 'Draft']].map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${filter === value ? 'bg-white text-black' : 'text-white/35'}`}>{label}</button>)}</div></div>
    {loading ? <div className="grid min-h-64 place-items-center"><Spinner label="Loading portfolio" /></div> : error ? <EmptyState title="Portfolio could not load" description={error} action="Retry" onAction={load} /> : visible.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <article key={item.id} className="group overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[.025]"><div className="relative aspect-[4/3] overflow-hidden bg-white/[.03]">{item.mediaType === 'VIDEO' ? <video src={resolveMediaUrl(item.mediaUrl)} muted playsInline controls className="size-full object-cover" /> : <img src={resolveMediaUrl(item.thumbnailUrl || item.mediaUrl)} alt={item.title} className="size-full object-cover" />}<div className="absolute inset-x-3 top-3 flex justify-between"><Badge variant={item.status === 'DRAFT' ? 'pink' : 'mint'}>{item.status}</Badge><button type="button" onClick={() => openEditor(item)} aria-label={`Edit ${item.title}`} className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/65"><Edit3 size={14} /></button></div></div><div className="p-4"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-white/30">{item.category || 'Portfolio'}</p><h2 className="mt-2 truncate text-xl font-bold">{item.title}</h2>{item.description && <p className="mt-3 line-clamp-2 text-[11px] leading-5 text-white/45">{item.description}</p>}<p className="mt-4 border-t border-white/[.08] pt-3 text-[10px] text-white/35">Updated {new Date(item.createdAt).toLocaleDateString()}</p></div></article>)}</div> : <EmptyState title={filter === 'ALL' ? 'Build your portfolio' : 'No matching portfolio projects'} description="Add finished collaborations or personal work that you are allowed to showcase." action="Add project" onAction={() => openEditor()} />}
    <Dialog dark open={open} onClose={() => !saving && setOpen(false)} title={editing ? 'Edit portfolio project' : 'Add portfolio project'} description="Media is uploaded securely before the portfolio record is saved."><form onSubmit={save} className="space-y-4"><FileUpload label="Cover image or video" accept="image/*,video/*" value={mediaFile?.name || draft.mediaLabel} onChange={(files) => setMediaFile(files[0] || null)} /><Input label="Project title" value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} /><div className="grid gap-4 sm:grid-cols-2"><Select label="Category" value={draft.category} onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))} options={['Brand campaign', 'UGC', 'Fashion editorial', 'Review', 'Event coverage', 'Personal project']} /><Select label="Status" value={draft.status} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value }))} options={[{ label: 'Published', value: 'PUBLISHED' }, { label: 'Draft', value: 'DRAFT' }]} /></div><Textarea label="Case study summary" value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} /><div className="flex justify-between gap-2">{editing ? <Button type="button" variant="ghost" disabled={saving} onClick={remove}><Trash2 size={14} />Delete</Button> : <span />}<div className="flex gap-2"><Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="pink" loading={saving}>Save project</Button></div></div></form></Dialog>
  </DashboardPage>
}

const notificationOptions = [
  ['emailEnabled', 'Email notifications', 'Master switch for transactional email.'],
  ['offerEmail', 'Work offers', 'New direct offer and response emails.'],
  ['proposalEmail', 'Proposals', 'Proposal submission and decision emails.'],
  ['contractEmail', 'Contracts', 'Agreement changes and approval emails.'],
  ['paymentEmail', 'Payments', 'Funding and payment status emails.'],
  ['deliverableEmail', 'Deliverables', 'Submission and review emails.'],
  ['proofEmail', 'Publish proof', 'Proof review and verification emails.'],
  ['payoutEmail', 'Payouts', 'Payout status emails.'],
  ['deadlineEmail', 'Deadlines', 'Upcoming deadline reminders.'],
]

export function SettingsPage({ role }) {
  const [tab, setTab] = useState('profile')
  const { account, updateAccount } = useMarketplace()
  const { clearSession } = useAuth()
  const userProfile = useUser()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [edits, setEdits] = useState({})
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [preference, setPreference] = useState(null)
  const [preferenceLoading, setPreferenceLoading] = useState(true)
  const [preferenceError, setPreferenceError] = useState('')
  const [preferenceSaving, setPreferenceSaving] = useState('')
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const profileApi = role === 'creator' ? creatorApi : businessApi
  const form = { ...account[role], ...edits }

  const loadProfile = useCallback(async () => {
    setProfileLoading(true); setProfileError('')
    try { const result = await profileApi.getProfile(); updateAccount(role, result.profile) }
    catch (reason) { setProfileError(errorMessage(reason, 'Channel profile could not be loaded.')) }
    finally { setProfileLoading(false) }
  // profileApi is selected from stable imported objects.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, updateAccount])
  const loadPreference = useCallback(async () => {
    setPreferenceLoading(true); setPreferenceError('')
    try { const result = await notificationApi.preferences(); setPreference(result.preference) }
    catch (reason) { setPreferenceError(errorMessage(reason, 'Notification preferences could not be loaded.')) }
    finally { setPreferenceLoading(false) }
  }, [])
  useEffect(() => {
    let active = true
    profileApi.getProfile()
      .then((result) => { if (active) updateAccount(role, result.profile) })
      .catch((reason) => { if (active) setProfileError(errorMessage(reason, 'Channel profile could not be loaded.')) })
      .finally(() => { if (active) setProfileLoading(false) })
    return () => { active = false }
  // profileApi is selected from stable imported objects.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, updateAccount])
  useEffect(() => {
    let active = true
    notificationApi.preferences()
      .then((result) => { if (active) setPreference(result.preference) })
      .catch((reason) => { if (active) setPreferenceError(errorMessage(reason, 'Notification preferences could not be loaded.')) })
      .finally(() => { if (active) setPreferenceLoading(false) })
    return () => { active = false }
  }, [])

  const set = (name) => (event) => setEdits((value) => ({ ...value, [name]: event.target.value }))
  const saveProfile = async () => {
    setProfileSaving(true); setProfileError('')
    try {
      const payload = role === 'creator'
        ? { channelName: form.name, username: (form.username || '').replace(/^@/, ''), location: form.location || '', niche: form.niche || '', bio: form.bio || '' }
        : { organization: form.name, username: (form.username || '').replace(/^@/, ''), location: form.location || '', industry: form.industry || '', description: form.description || '' }
      const result = await profileApi.updateProfile(payload)
      updateAccount(role, result.profile); setEdits({}); toast('Channel settings saved.', { type: 'success' })
    } catch (reason) { const message = errorMessage(reason, 'Channel profile could not be saved.'); setProfileError(message); toast(message, { type: 'error' }) }
    finally { setProfileSaving(false) }
  }
  const savePreference = async (key, checked) => {
    const previous = preference
    setPreference((current) => ({ ...current, [key]: checked })); setPreferenceSaving(key); setPreferenceError('')
    try { const result = await notificationApi.savePreferences({ [key]: checked }); setPreference(result.preference) }
    catch (reason) { setPreference(previous); setPreferenceError(errorMessage(reason, 'Preference could not be saved.')) }
    finally { setPreferenceSaving('') }
  }
  const changePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) { toast('New passwords do not match.', { type: 'error' }); return }
    try { await userProfile.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }); clearSession(); navigate('/login', { replace: true }) }
    catch (reason) { toast(errorMessage(reason, 'Password could not be changed.'), { type: 'error' }) }
  }
  const deactivate = async () => {
    if (!window.confirm(`Delete this ${role} channel?`)) return
    setProfileSaving(true)
    try { await profileApi.deleteProfile(); updateAccount(role, { name: '', username: '', location: '' }); navigate('/welcome', { replace: true }) }
    catch (reason) { toast(errorMessage(reason, 'Channel could not be deleted.'), { type: 'error' }) }
    finally { setProfileSaving(false) }
  }

  const profileContent = profileLoading ? <div className="grid min-h-48 place-items-center"><Spinner label="Loading channel profile" /></div> : profileError && !form.name ? <EmptyState title="Profile could not load" description={profileError} action="Retry" onAction={loadProfile} /> : <DashboardPanel title="Channel profile"><div className="grid gap-4 sm:grid-cols-2"><Input label="Display name" value={form.name || ''} onChange={set('name')} /><Input label="Username" value={form.username || ''} onChange={set('username')} /><Input label="Location" value={form.location || ''} onChange={set('location')} /><Select label="Primary category" value={form.niche || form.industry || ''} onChange={(event) => setEdits((value) => ({ ...value, [role === 'creator' ? 'niche' : 'industry']: event.target.value }))} options={['Fashion', 'Travel', 'Technology', 'Beauty', 'Lifestyle', 'Agency']} /><Textarea className="sm:col-span-2" label="Channel description" value={form.bio || form.description || ''} onChange={(event) => setEdits((value) => ({ ...value, [role === 'creator' ? 'bio' : 'description']: event.target.value }))} /></div>{profileError && <p className="ui-error mt-4">{profileError}</p>}<Button className="mt-5" variant="pink" loading={profileSaving} onClick={saveProfile}>Save changes</Button></DashboardPanel>
  const notificationContent = preferenceLoading ? <div className="grid min-h-48 place-items-center"><Spinner label="Loading notification preferences" /></div> : preferenceError && !preference ? <EmptyState title="Preferences could not load" description={preferenceError} action="Retry" onAction={loadPreference} /> : <DashboardPanel title="Notification preferences"><div className="space-y-5">{notificationOptions.map(([key, label, description]) => <Switch key={key} label={label} description={description} disabled={Boolean(preferenceSaving)} checked={Boolean(preference?.[key])} onChange={(event) => savePreference(key, event.target.checked)} />)}{preferenceSaving && <p className="flex items-center gap-2 text-xs text-white/40"><RefreshCw size={12} className="animate-spin" />Saving preference…</p>}{preferenceError && <p className="ui-error">{preferenceError}</p>}<p className="text-xs text-white/35">Preferences are persisted to your account on the server.</p></div></DashboardPanel>
  const socialContent = <SocialConnectionsPanel channelType={role.toUpperCase()} />

  return <DashboardPage><DashboardHeader eyebrow={`${role} channel`} title="Settings" copy="Manage persisted channel details, social connections, notifications and security." /><Tabs value={tab} onChange={setTab} tabs={[{ label: 'Profile', value: 'profile', content: profileContent }, { label: 'Social channels', value: 'social', content: socialContent }, { label: 'Notifications', value: 'notifications', content: notificationContent }, { label: 'Security', value: 'security', content: <DashboardPanel title="Security"><div className="max-w-lg space-y-4"><Input type="password" label="Current password" value={passwords.currentPassword} onChange={(event) => setPasswords((value) => ({ ...value, currentPassword: event.target.value }))} /><Input type="password" label="New password" value={passwords.newPassword} onChange={(event) => setPasswords((value) => ({ ...value, newPassword: event.target.value }))} /><Input type="password" label="Confirm new password" value={passwords.confirmPassword} onChange={(event) => setPasswords((value) => ({ ...value, confirmPassword: event.target.value }))} /><Button variant="outline" loading={userProfile.loading} disabled={!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword} onClick={changePassword}>Update password</Button></div></DashboardPanel> }, { label: 'Danger zone', value: 'danger', content: <DashboardPanel title="Danger zone"><div className="flex items-center justify-between gap-4 rounded-xl border border-[#df3f65]/30 p-4"><span><strong className="block text-sm">Delete channel</strong><small className="text-white/35">Removes this public channel and its profile data.</small></span><Button variant="danger" loading={profileSaving} onClick={deactivate}><Trash2 size={15} />Delete</Button></div></DashboardPanel> }]} /></DashboardPage>
}
