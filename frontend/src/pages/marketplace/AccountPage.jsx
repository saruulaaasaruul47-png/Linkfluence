import { useState } from 'react'
import { ArrowUpRight, Building2, Check, ChevronRight, Download, Plus, Save, Trash2, TriangleAlert, UserRound } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, Dialog, FileUpload, Input, Select, Textarea, useToast } from '../../components/ui'
import { useMarketplace } from '../../context/marketplace-context'
import { useAuth } from '../../context/auth-context'
import { useBusiness } from '../../hooks/useBusiness'
import { useCreator } from '../../hooks/useCreator'
import { useUser } from '../../hooks/useUser'
import { SocialConnectionsPanel } from '../../components/social/SocialConnectionsPanel'
import { availabilityOptions } from '../../lib/trustPresentation'

const channels = [
  { id: 'creator', sub: 'Creator channel', icon: UserRound, color: 'bg-pink text-black' },
  { id: 'business', sub: 'Business channel', icon: Building2, color: 'bg-mint text-black' },
]

function SectionTitle({ eyebrow, title, action }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow text-white/30">{eyebrow}</p><h2 className="mt-2 text-2xl font-bold tracking-[-.045em]">{title}</h2></div>{action}</div>
}

function imageData(file, onLoad) {
  if (!file) return onLoad('')
  const reader = new FileReader()
  reader.onload = () => onLoad(String(reader.result || ''))
  reader.readAsDataURL(file)
}

function ViewerForm({ value, onSave, loading, error }) {
  const [form, setForm] = useState(() => ({
    name: '',
    email: '',
    username: '',
    phone: '',
    location: '',
    avatar: '',
    ...value,
    bio: value?.bio || '',
  }))
  const [avatarFile, setAvatarFile] = useState(null)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  return <form onSubmit={(event) => { event.preventDefault(); onSave(form, avatarFile) }} className="grid gap-4 sm:grid-cols-2">
    <div className="sm:col-span-2"><FileUpload label="Profile avatar" compact value={form.avatar ? 'Current avatar' : ''} onChange={(files) => setAvatarFile(files[0] || null)} /></div>
    <Input label="Full name" value={form.name} onChange={set('name')} required />
    <Input label="Email address" type="email" value={form.email} onChange={set('email')} disabled help="Email changes require a separate verification flow." />
    <Input label="Phone number" value={form.phone} onChange={set('phone')} placeholder="+976 9911 2233" />
    <Input label="Location" value={form.location} onChange={set('location')} />
    <Textarea className="sm:col-span-2" label="About you" value={form.bio} onChange={set('bio')} placeholder="A short introduction..." maxLength={240} help={`${form.bio.length}/240 characters`} />
    {error && <p className="ui-error sm:col-span-2">{error.message}</p>}
    <Button type="submit" variant="pink" loading={loading} disabled={loading} className="sm:col-span-2 sm:justify-self-start"><Save size={15} /> Save personal details</Button>
  </form>
}

function CreatorForm({ value, onSave, loading, error }) {
  const [form, setForm] = useState(() => ({
    name: '',
    username: '',
    niche: '',
    location: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    youtube: '',
    rate: '',
    currency: 'MNT',
    availability: '',
    availableForWork: true,
    avatar: '',
    cover: '',
    ...value,
    bio: value?.bio || '',
    skillsText: (value?.skills || []).join(', '),
    languagesText: (value?.languages || []).join(', '),
    startingRate: value?.startingRate ?? value?.rate ?? '',
  }))
  const [avatarFile, setAvatarFile] = useState(null)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  return <form onSubmit={(event) => { event.preventDefault(); onSave(form, avatarFile) }} className="grid gap-4 sm:grid-cols-2">
    <div className="sm:col-span-2"><SocialConnectionsPanel channelType="CREATOR" /></div>
    <FileUpload label="Creator avatar" compact value={form.avatar ? 'Current avatar' : ''} onChange={(files) => setAvatarFile(files[0] || null)} />
    <FileUpload label="Profile cover" compact value={form.cover ? 'Current cover' : ''} onChange={(files) => imageData(files[0], (cover) => setForm((current) => ({ ...current, cover })))} />
    <Input label="Channel name" value={form.name} onChange={set('name')} required />
    <Input label="Username" value={form.username} onChange={set('username')} required />
    <Select label="Primary niche" value={form.niche} onChange={set('niche')} options={['Fashion', 'Beauty', 'Food', 'Travel', 'Gaming', 'Technology', 'Sport', 'Lifestyle']} />
    <Input label="Location" value={form.location} onChange={set('location')} />
    <Textarea className="sm:col-span-2" label="Bio" value={form.bio} onChange={set('bio')} maxLength={240} help={`${form.bio.length}/240 characters`} />
    <Input label="Instagram" value={form.instagram} onChange={set('instagram')} placeholder="instagram.com/username" />
    <Input label="TikTok" value={form.tiktok} onChange={set('tiktok')} placeholder="tiktok.com/@username" />
    <Input label="YouTube" value={form.youtube} onChange={set('youtube')} placeholder="youtube.com/@channel" />
    <Input label="Skills" value={form.skillsText} onChange={set('skillsText')} placeholder="Video editing, Storytelling" help="Separate skills with commas." />
    <Input label="Languages" value={form.languagesText} onChange={set('languagesText')} placeholder="Mongolian, English" help="Separate languages with commas." />
    <Input label="Starting rate" value={form.startingRate} onChange={set('startingRate')} inputMode="decimal" />
    <Select label="Currency" value={form.currency} onChange={set('currency')} options={['MNT', 'USD', 'EUR', 'KRW', 'JPY', 'CNY']} />
    <Select label="Availability" value={form.availability} onChange={set('availability')} options={availabilityOptions} />
    <div className="sm:col-span-2 rounded-xl border border-white/[.08] p-3"><label className="flex items-center justify-between gap-3 text-xs font-semibold"><span><span className="block">Available for work</span><small className="mt-1 block font-normal text-white/35">Turn this off to hide your profile from availability filters.</small></span><input type="checkbox" checked={Boolean(form.availableForWork)} onChange={(event) => setForm((current) => ({ ...current, availableForWork: event.target.checked }))} className="size-4 accent-pink-400" /></label></div>
    {error && <p className="ui-error sm:col-span-2">{error.message}</p>}
    <Button type="submit" variant="pink" loading={loading} disabled={loading} className="sm:col-span-2 sm:justify-self-start"><Save size={15} /> Save creator profile</Button>
  </form>
}

function BusinessForm({ value, onSave, loading, error }) {
  const [form, setForm] = useState(() => ({
    name: '',
    username: '',
    industry: '',
    website: '',
    location: '',
    companySize: '',
    contactEmail: '',
    logo: '',
    cover: '',
    ...value,
    description: value?.description || '',
  }))
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  return <form onSubmit={(event) => { event.preventDefault(); onSave(form) }} className="grid gap-4 sm:grid-cols-2">
    <div className="sm:col-span-2"><SocialConnectionsPanel channelType="BUSINESS" /></div>
    <FileUpload label="Business logo" compact value={form.logo ? 'Current logo' : ''} onChange={(files) => imageData(files[0], (logo) => setForm((current) => ({ ...current, logo })))} />
    <FileUpload label="Business cover" compact value={form.cover ? 'Current cover' : ''} onChange={(files) => imageData(files[0], (cover) => setForm((current) => ({ ...current, cover })))} />
    <Input label="Organization name" value={form.name} onChange={set('name')} required />
    <Input label="Username" value={form.username} onChange={set('username')} required />
    <Select label="Industry" value={form.industry} onChange={set('industry')} options={['Fashion & apparel', 'Beauty & wellness', 'Food & beverage', 'Travel & hospitality', 'Technology', 'Entertainment', 'Agency', 'Nonprofit', 'Other']} />
    <Select label="Company size" value={form.companySize} onChange={set('companySize')} options={['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,000+']} />
    <Input label="Website" type="url" value={form.website} onChange={set('website')} />
    <Input label="Business email" type="email" value={form.contactEmail} onChange={set('contactEmail')} />
    <Input className="sm:col-span-2" label="Location" value={form.location} onChange={set('location')} />
    <Textarea className="sm:col-span-2" label="Business description" value={form.description} onChange={set('description')} maxLength={320} help={`${form.description.length}/320 characters`} />
    {error && <p className="ui-error sm:col-span-2">{error.message}</p>}
    <Button type="submit" variant="mint" loading={loading} disabled={loading} className="sm:col-span-2 sm:justify-self-start"><Save size={15} /> Save business profile</Button>
  </form>
}

export default function AccountPage() {
  const { account, updateAccount } = useMarketplace()
  const { hasRole } = useAuth()
  const userProfile = useUser()
  const creatorProfile = useCreator()
  const businessProfile = useBusiness()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deletionPassword, setDeletionPassword] = useState('')
  const requestedChannel = params.get('channel')
  const channel = channels.some((item) => item.id === requestedChannel) ? requestedChannel : 'account'
  const { toast } = useToast()
  const active = channels.find((item) => item.id === channel)
  const selectChannel = (id) => {
    if (!hasRole(id)) {
      navigate(`/onboarding/${id}`)
      return
    }
    setParams({ channel: id })
  }
  const saveViewer = async (details, avatarFile) => {
    try {
      const result = await userProfile.updateMe({
        displayName: details.name,
        username: details.username || null,
        phone: details.phone || '',
        location: details.location || '',
        bio: details.bio || '',
      })
      let user = result.user
      if (avatarFile) user = (await userProfile.uploadAvatar(avatarFile)).user
      updateAccount('viewer', { ...user, name: user.displayName, avatar: user.avatarUrl })
      toast('Account saved.', { type: 'success' })
    } catch (error) {
      toast(error.message, { type: 'error' })
    }
  }
  const saveCreator = async (details, avatarFile) => {
    try {
      const fields = ['username', 'bio', 'niche', 'location', 'instagram', 'facebook', 'tiktok', 'youtube', 'startingRate', 'currency', 'availability', 'availableForWork', 'audience', 'format', 'publicRates']
      const payload = Object.fromEntries(fields.filter((key) => key in details).map((key) => [key, details[key]]))
      payload.skills = details.skillsText.split(',').map((item) => item.trim()).filter(Boolean)
      payload.languages = details.languagesText.split(',').map((item) => item.trim()).filter(Boolean)
      payload.channelName = details.name
      if (payload.username?.startsWith('@')) payload.username = payload.username.slice(1)
      const { profile: savedProfile } = await creatorProfile.updateProfile(payload)
      if (avatarFile) {
        const avatarResult = await userProfile.uploadAvatar(avatarFile)
        savedProfile.avatar = avatarResult.user.avatarUrl
        savedProfile.avatarUrl = avatarResult.user.avatarUrl
      }
      updateAccount('creator', savedProfile)
      toast('Creator profile saved.', { type: 'success' })
    } catch (error) { toast(error.message, { type: 'error' }) }
  }
  const saveBusiness = async (details) => {
    try {
      const fields = ['username', 'description', 'industry', 'website', 'companySize', 'contactEmail', 'location', 'targetNiche', 'campaignGoal', 'monthlyBudget']
      const payload = Object.fromEntries(fields.filter((key) => key in details).map((key) => [key, details[key]]))
      payload.organization = details.name
      if (payload.username?.startsWith('@')) payload.username = payload.username.slice(1)
      const { profile: savedProfile } = await businessProfile.updateProfile(payload)
      updateAccount('business', savedProfile)
      toast('Business profile saved.', { type: 'success' })
    } catch (error) { toast(error.message, { type: 'error' }) }
  }
  const deactivateChannel = async (type) => {
    if (type === 'creator') await creatorProfile.deleteProfile()
    else await businessProfile.deleteProfile()
    updateAccount(type, type === 'creator'
      ? { name: '', username: '', niche: '', location: '', bio: '', avatar: '', cover: '' }
      : { name: '', username: '', industry: '', location: '', description: '', logo: '', cover: '' })
    setParams({})
    toast(`${type[0].toUpperCase()}${type.slice(1)} channel deleted.`, { type: 'success' })
  }
  const deleteAccount = async () => {
    await userProfile.deleteMe(deletionPassword)
    navigate('/register', { replace: true })
  }
  const exportAccount = async () => {
    try {
      const response = await userProfile.exportMe()
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `influence-hub-account-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast('Account data exported.', { type: 'success' })
    } catch (error) { toast(error.message || 'Account data could not be exported.', { type: 'error' }) }
  }
  const confirmDeletion = async () => {
    if (!deleteTarget || deleting || (deleteTarget === 'account' && !deletionPassword)) return
    setDeleting(true)
    try {
      if (deleteTarget === 'account') await deleteAccount()
      else await deactivateChannel(deleteTarget)
      setDeleteTarget(null)
      setDeletionPassword('')
    } catch (error) {
      toast(error.message || 'This item could not be deleted.', { type: 'error' })
    } finally {
      setDeleting(false)
    }
  }
  const closeDeleteDialog = () => {
    if (!deleting) {
      setDeleteTarget(null)
      setDeletionPassword('')
    }
  }
  const deletingAccount = deleteTarget === 'account'
  const deleteLabel = deletingAccount ? 'Delete account' : `Delete ${deleteTarget || ''} channel`

  return <main className="mx-auto max-w-[1500px] px-5 pb-20 pt-10 lg:px-8 lg:pt-14">
    <section className="mb-8 border-b border-white/10 pb-8">
      <p className="eyebrow text-white/30">Account settings</p>
      <h1 className="mt-4 text-4xl font-extrabold uppercase tracking-[-.07em] sm:text-6xl">MY <span className="editorial text-pink">account.</span></h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-white/45">Manage your personal information or continue developing one of your channels.</p>
    </section>

    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="h-max min-w-0 lg:sticky lg:top-24">
        <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[.15em] text-white/25">Your channels</p>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2">
          {channels.map((item) => {
            const Icon = item.icon
            const selected = channel === item.id
            const enabled = hasRole(item.id)
            const profileName = enabled ? account[item.id]?.name || item.sub : `Create ${item.id} channel`
            return <button key={item.id} onClick={() => selectChannel(item.id)} className={`flex min-w-52 items-center gap-3 rounded-2xl border p-3 text-left transition lg:w-full lg:min-w-0 ${selected ? 'border-white/25 bg-white/[.09]' : 'border-transparent text-white/50 hover:bg-white/[.04] hover:text-white'}`}>
              <span className={`grid size-9 shrink-0 place-items-center rounded-full ${item.color}`}><Icon size={15} /></span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{profileName}</strong><small className="text-[10px] text-white/35">{enabled ? item.sub : 'Start guided setup'}</small></span>
              {enabled ? selected && <Check size={14} className={item.id === 'creator' ? 'text-pink' : 'text-mint'} /> : <Plus size={14} className={item.id === 'creator' ? 'text-pink' : 'text-mint'} />}
            </button>
          })}
        </div>
      </aside>

      <div className="min-w-0 space-y-8">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-5 sm:p-7">
          <SectionTitle eyebrow={active?.sub || 'Private account'} title={channel === 'account' ? 'Personal information' : 'Public channel information'} action={channel === 'account' ? <Badge variant="outline">Private</Badge> : <Link to={channel === 'creator' ? '/creators/my-creator' : '/businesses/my-business'} className={`inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-xs font-bold text-black ${channel === 'creator' ? 'bg-pink' : 'bg-mint'}`}>View public profile <ArrowUpRight size={13} /></Link>} />
          {channel === 'account' && <ViewerForm key={`${account.viewer.id}-${account.viewer.updatedAt}-${account.viewer.avatar}`} value={account.viewer} onSave={saveViewer} loading={userProfile.loading} error={userProfile.error} />}
          {channel === 'creator' && hasRole('creator') && <CreatorForm key={`${account.creator.id}-${account.creator.updatedAt}`} value={account.creator} onSave={saveCreator} loading={creatorProfile.loading} error={creatorProfile.error} />}
          {channel === 'business' && hasRole('business') && <BusinessForm key={`${account.business.id}-${account.business.updatedAt}`} value={account.business} onSave={saveBusiness} loading={businessProfile.loading} error={businessProfile.error} />}
          {channel !== 'account' && hasRole(channel) && <div className="mt-8 border-t border-white/10 pt-5"><Button variant="danger" onClick={() => setDeleteTarget(channel)}><Trash2 size={14} />Delete {channel} channel</Button><p className="mt-2 text-[10px] text-white/35">This removes the public channel profile. Your personal account remains active.</p></div>}
        </section>

        {channel !== 'account' && hasRole(channel) && <div className={`flex flex-col justify-between gap-4 rounded-2xl p-5 text-black sm:flex-row sm:items-center ${channel === 'creator' ? 'bg-pink-soft' : 'bg-mint-soft'}`}><span><strong className="block">Continue developing your {channel} channel</strong><small className="mt-1 block opacity-60">Manage content, collaborations, messages and analytics in its workspace.</small></span><Link to={`/${channel}/dashboard`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:opacity-85">Open dashboard <ChevronRight size={15} /></Link></div>}

        {channel === 'account' && <div className="flex justify-end gap-2 border-t border-white/[.07] pt-4"><Button size="sm" variant="outline" disabled={userProfile.loading} onClick={exportAccount}><Download size={13} />Export data</Button><Button size="sm" variant="ghost" className="text-[#ff6b82] hover:bg-[#ff6b82]/10 hover:text-[#ff8da0]" disabled={userProfile.loading} onClick={() => setDeleteTarget('account')}><Trash2 size={13} />Delete account</Button></div>}
      </div>
    </div>

    <Dialog
      open={Boolean(deleteTarget)}
      onClose={closeDeleteDialog}
      dark
      className="max-w-md border-white/[.12] bg-[#171717] p-5 sm:p-6"
      title={<span className="flex items-center gap-3 text-xl font-bold tracking-[-.025em]"><span className="grid size-10 shrink-0 place-items-center rounded-full border border-pink/25 bg-pink/10 text-pink"><TriangleAlert size={19} strokeWidth={2.2} /></span>Are you sure?</span>}
      description={deletingAccount
        ? 'Deleting your account signs you out and removes access to every channel connected to it.'
        : `Deleting this ${deleteTarget || ''} channel removes its public profile and workspace access.`}
    >
      <div className="rounded-2xl border border-white/[.08] bg-white/[.035] p-4">
        <p className="text-xs font-semibold text-white/85">{deletingAccount ? 'This action affects your whole account.' : `Your ${deleteTarget || ''} channel will no longer be visible.`}</p>
        <p className="mt-1.5 text-[11px] leading-5 text-white/40">{deletingAccount ? 'Your personal account, creator and business channels, and active sessions will be removed. This cannot be undone.' : 'Your personal account and your other channel will remain active. This action cannot be undone.'}</p>
      </div>
      {deletingAccount && <div className="mt-4"><Input label="Confirm your password" type="password" autoComplete="current-password" value={deletionPassword} onChange={(event) => setDeletionPassword(event.target.value)} required help="A five-minute security confirmation protects this sensitive action." /></div>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={closeDeleteDialog} disabled={deleting} className="sm:min-w-28">Cancel</Button>
        <Button variant="danger" onClick={confirmDeletion} loading={deleting} disabled={deletingAccount && !deletionPassword} className="sm:min-w-36"><Trash2 size={14} />{deleteLabel}</Button>
      </div>
    </Dialog>
  </main>
}
