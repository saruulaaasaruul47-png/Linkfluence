import { useState } from 'react'
import { ArrowUpRight, Bookmark, Building2, Check, ChevronRight, FolderHeart, LayoutGrid, Plus, Save, Trash2, UserRound, Users } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MarketplaceItem } from '../../components/marketplace/MarketplaceItem'
import { CollectionCard } from '../../components/marketplace/cards'
import { Badge, Button, FileUpload, Input, Select, Textarea, useToast } from '../../components/ui'
import { useMarketplace } from '../../context/marketplace-context'
import { useAuth } from '../../context/auth-context'
import { useBusiness } from '../../hooks/useBusiness'
import { useCreator } from '../../hooks/useCreator'
import { useUser } from '../../hooks/useUser'
import { businesses, creators } from '../../data/marketplace'

const views = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'saved', label: 'Saved content', icon: Bookmark },
  { id: 'following', label: 'Following', icon: Users },
  { id: 'collections', label: 'Collections', icon: FolderHeart },
]

const channels = [
  { id: 'creator', sub: 'Creator channel', icon: UserRound, color: 'bg-pink text-black' },
  { id: 'business', sub: 'Business channel', icon: Building2, color: 'bg-mint text-black' },
]

function Stat({ value, label, to }) {
  return <Link to={to} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-white/25 hover:bg-white/[.06]">
    <strong className="text-3xl tracking-[-.05em]">{value}</strong>
    <span className="mt-2 flex items-center justify-between text-xs text-white/40">{label}<ChevronRight size={14} className="transition group-hover:translate-x-1 group-hover:text-white" /></span>
  </Link>
}

function ChannelHubCard({ type, active, profile, onManage }) {
  const creator = type === 'creator'
  const Icon = creator ? UserRound : Building2
  const accent = creator ? 'pink' : 'mint'
  const label = creator ? 'Creator Channel' : 'Business Channel'
  return (
    <article className="rounded-[1.35rem] border border-white/10 bg-white/[.025] p-4 transition hover:border-white/20">
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full text-black ${creator ? 'bg-pink' : 'bg-mint'}`}>
          <Icon size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <small className="block text-[9px] font-bold uppercase tracking-[.12em] text-white/30">{label}</small>
          <strong className="mt-1 block truncate text-sm">{active ? profile.name : `Create a ${type} channel`}</strong>
          <span className="mt-2 inline-flex"><Badge variant={active ? accent : 'outline'}>{active ? 'Active' : 'Not created'}</Badge></span>
        </span>
      </div>
      <p className="mt-4 min-h-10 text-xs leading-5 text-white/38">
        {creator
          ? 'Publish a portfolio, discover campaigns and manage collaborations.'
          : 'Create campaigns, discover creators and manage business collaborations.'}
      </p>
      <div className="mt-4 flex gap-2 border-t border-white/[.07] pt-3">
        {active ? (
          <>
            <Button size="sm" variant="outline" className="flex-1" onClick={onManage}>Manage</Button>
            <Link to={`/${type}/dashboard`} className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[11px] font-bold text-black ${creator ? 'bg-pink' : 'bg-mint'}`}>
              Dashboard <ChevronRight size={13} />
            </Link>
          </>
        ) : (
          <Link to={`/onboarding/${type}`} className={`inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full text-[11px] font-bold text-black ${creator ? 'bg-pink' : 'bg-mint'}`}>
            <Plus size={13} /> Create {label}
          </Link>
        )}
      </div>
    </article>
  )
}

function FollowedChannelRow({ itemKey }) {
  const [type, id] = String(itemKey).split(':')
  const item = type === 'creator'
    ? creators.find((value) => value.id === id)
    : type === 'business'
      ? businesses.find((value) => value.id === id)
      : null
  if (!item) return null
  const image = type === 'creator' ? item.avatar : item.cover
  const meta = type === 'creator' ? item.niche : item.industry
  return (
    <Link to={type === 'creator' ? `/creators/${id}` : `/businesses/${id}`} className="flex items-center gap-3 rounded-xl border border-white/10 p-3 transition hover:border-white/25 hover:bg-white/[.035]">
      <img src={image} alt="" loading="lazy" decoding="async" className="size-10 rounded-full object-cover" />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-xs">{item.name}</strong>
        <small className="mt-1 block truncate text-[10px] text-white/35">{meta}</small>
      </span>
      <ChevronRight size={14} className="text-white/25" />
    </Link>
  )
}

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
    rate: '',
    availability: '',
    avatar: '',
    cover: '',
    ...value,
    bio: value?.bio || '',
  }))
  const [avatarFile, setAvatarFile] = useState(null)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  return <form onSubmit={(event) => { event.preventDefault(); onSave(form, avatarFile) }} className="grid gap-4 sm:grid-cols-2">
    <FileUpload label="Creator avatar" compact value={form.avatar ? 'Current avatar' : ''} onChange={(files) => setAvatarFile(files[0] || null)} />
    <FileUpload label="Profile cover" compact value={form.cover ? 'Current cover' : ''} onChange={(files) => imageData(files[0], (cover) => setForm((current) => ({ ...current, cover })))} />
    <Input label="Channel name" value={form.name} onChange={set('name')} required />
    <Input label="Username" value={form.username} onChange={set('username')} required />
    <Select label="Primary niche" value={form.niche} onChange={set('niche')} options={['Fashion', 'Beauty', 'Food', 'Travel', 'Gaming', 'Technology', 'Sport', 'Lifestyle']} />
    <Input label="Location" value={form.location} onChange={set('location')} />
    <Textarea className="sm:col-span-2" label="Bio" value={form.bio} onChange={set('bio')} maxLength={240} help={`${form.bio.length}/240 characters`} />
    <Input label="Instagram" value={form.instagram} onChange={set('instagram')} placeholder="instagram.com/username" />
    <Input label="TikTok" value={form.tiktok} onChange={set('tiktok')} placeholder="tiktok.com/@username" />
    <Input label="Starting rate" value={form.rate} onChange={set('rate')} />
    <Select label="Availability" value={form.availability} onChange={set('availability')} options={['Available now', 'Available this month', 'Limited availability', 'Not accepting work']} />
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
  const { account, updateAccount, saved, following, collections } = useMarketplace()
  const { hasRole } = useAuth()
  const userProfile = useUser()
  const creatorProfile = useCreator()
  const businessProfile = useBusiness()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const initialChannel = channels.some((item) => item.id === params.get('channel')) ? params.get('channel') : 'account'
  const [channel, setChannel] = useState(initialChannel)
  const [view, setView] = useState('overview')
  const { toast } = useToast()
  const active = channels.find((item) => item.id === channel)
  const selectChannel = (id) => { setChannel(id); setView('overview'); setParams(id === 'account' ? {} : { channel: id }) }
  const selectView = (id) => {
    setView(id)
    setChannel('account')
    setParams({})
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
      const fields = ['username', 'bio', 'niche', 'location', 'instagram', 'facebook', 'tiktok', 'rate', 'availability', 'audience', 'format', 'language', 'publicRates']
      const payload = Object.fromEntries(fields.filter((key) => key in details).map((key) => [key, details[key]]))
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
    if (!window.confirm(`Delete your ${type} channel? Its public profile data will be removed.`)) return
    try {
      if (type === 'creator') await creatorProfile.deleteProfile()
      else await businessProfile.deleteProfile()
      updateAccount(type, type === 'creator'
        ? { name: '', username: '', niche: '', location: '', bio: '', avatar: '', cover: '' }
        : { name: '', username: '', industry: '', location: '', description: '', logo: '', cover: '' })
      setChannel('account'); setParams({})
      toast(`${type[0].toUpperCase()}${type.slice(1)} channel deleted.`, { type: 'success' })
    } catch (error) { toast(error.message, { type: 'error' }) }
  }
  const deleteAccount = async () => {
    if (!window.confirm('Delete this account? This cannot be undone.')) return
    try {
      await userProfile.deleteMe()
      navigate('/register', { replace: true })
    } catch (error) { toast(error.message, { type: 'error' }) }
  }

  return <main className="mx-auto max-w-[1500px] px-5 pb-20 pt-10 lg:px-8 lg:pt-14">
    <section className="mb-8 border-b border-white/10 pb-8">
      <div><p className="eyebrow text-white/30">Your private workspace</p><h1 className="mt-4 text-4xl font-extrabold uppercase tracking-[-.07em] sm:text-6xl">MY <span className="editorial text-pink">account.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-white/45">Manage personal details, channel profiles and everything you saved or followed in one place.</p></div>
    </section>

    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="h-max min-w-0 space-y-5 lg:sticky lg:top-24 lg:space-y-6">
        <div className="min-w-0"><p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[.15em] text-white/25">Your channels</p><div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2">{channels.map((item) => { const Icon = item.icon; const selected = channel === item.id; const enabled = hasRole(item.id); const profileName = enabled ? account[item.id]?.name || item.sub : `Create ${item.id} channel`; return <button key={item.id} onClick={() => selectChannel(item.id)} className={`flex min-w-52 items-center gap-3 rounded-2xl border p-3 text-left transition lg:w-full lg:min-w-0 ${selected ? 'border-white/25 bg-white/[.09]' : 'border-transparent text-white/50 hover:bg-white/[.04] hover:text-white'}`}><span className={`grid size-9 shrink-0 place-items-center rounded-full ${item.color}`}><Icon size={15} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{profileName}</strong><small className="text-[10px] text-white/35">{enabled ? item.sub : 'Channel not created'}</small></span>{selected && <Check size={14} className={item.id === 'creator' ? 'text-pink' : 'text-mint'} />}</button> })}</div></div>
        <div className="min-w-0"><p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[.15em] text-white/25">My activity</p><nav className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1">{views.map((item) => { const Icon = item.icon; const selected = view === item.id && channel === 'account'; return <button key={item.id} onClick={() => selectView(item.id)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs transition lg:w-full ${selected ? 'bg-pink text-black' : 'text-white/45 hover:bg-white/[.05] hover:text-white'}`}><Icon size={15} />{item.label}{item.id === 'saved' && <span className="ml-auto">{saved.length}</span>}{item.id === 'following' && <span className="ml-auto">{following.length}</span>}{item.id === 'collections' && <span className="ml-auto">{collections.length}</span>}</button> })}</nav></div>
      </aside>

      <div className="min-w-0">
        {view === 'overview' && <div className="space-y-10">
          <section><SectionTitle eyebrow="At a glance" title="Your activity" /><div className="grid gap-3 sm:grid-cols-3"><Stat value={saved.length} label="Saved items" to="/saved" /><Stat value={following.length} label="Following" to="/following" /><Stat value={collections.length} label="Collections" to="/collections" /></div></section>
          {channel === 'account' && <section>
            <SectionTitle eyebrow="One login, multiple channels" title="Your channels" action={<Badge variant="outline">Switch anytime</Badge>} />
            <div className="grid gap-3 md:grid-cols-2">
              <ChannelHubCard type="creator" active={hasRole('creator')} profile={account.creator} onManage={() => selectChannel('creator')} />
              <ChannelHubCard type="business" active={hasRole('business')} profile={account.business} onManage={() => selectChannel('business')} />
            </div>
          </section>}
          {channel === 'account' && <section>
            <SectionTitle eyebrow={`${following.length} channels`} title="Recently followed" action={<button type="button" onClick={() => setView('following')} className="text-xs font-bold text-mint">View all →</button>} />
            {following.length
              ? <div className="grid gap-2 md:grid-cols-2">{following.slice(0, 4).map((key) => <FollowedChannelRow key={key} itemKey={key} />)}</div>
              : <div className="flex flex-col justify-between gap-4 rounded-2xl border border-dashed border-white/15 p-5 sm:flex-row sm:items-center"><span><strong className="block text-sm">Build your network</strong><small className="mt-1 block text-white/35">Follow creators and businesses to keep them close.</small></span><Link to="/search/creators" className="inline-flex min-h-9 items-center justify-center rounded-full bg-mint px-4 text-[11px] font-bold text-black">Discover channels</Link></div>}
          </section>}
          <section className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-5 sm:p-7">
            <SectionTitle eyebrow={active?.sub || 'Private account'} title={channel === 'account' ? 'Personal information' : 'Public channel information'} action={channel === 'account' ? <Badge variant="outline">Private</Badge> : <Link to={channel === 'creator' ? '/creators/my-creator' : '/businesses/my-business'} className={`inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-xs font-bold text-black ${channel === 'creator' ? 'bg-pink' : 'bg-mint'}`}>View public profile <ArrowUpRight size={13} /></Link>} />
            {channel === 'account' && <ViewerForm key={`${account.viewer.id}-${account.viewer.updatedAt}-${account.viewer.avatar}`} value={account.viewer} onSave={saveViewer} loading={userProfile.loading} error={userProfile.error} />}
            {channel === 'creator' && (hasRole('creator') ? <CreatorForm key={`${account.creator.id}-${account.creator.updatedAt}`} value={account.creator} onSave={saveCreator} loading={creatorProfile.loading} error={creatorProfile.error} /> : <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/15 text-center"><div><Plus className="mx-auto text-pink" /><h3 className="mt-3 font-bold">Creator Channel is not active</h3><p className="mt-2 text-xs text-white/40">Complete the guided setup to add it to this account.</p><Link to="/onboarding/creator" className="mt-5 inline-flex min-h-10 items-center rounded-full bg-pink px-5 text-xs font-bold text-black">Create Creator Channel</Link></div></div>)}
            {channel === 'business' && (hasRole('business') ? <BusinessForm key={`${account.business.id}-${account.business.updatedAt}`} value={account.business} onSave={saveBusiness} loading={businessProfile.loading} error={businessProfile.error} /> : <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/15 text-center"><div><Plus className="mx-auto text-mint" /><h3 className="mt-3 font-bold">Business Channel is not active</h3><p className="mt-2 text-xs text-white/40">Complete the guided setup to add it to this account.</p><Link to="/onboarding/business" className="mt-5 inline-flex min-h-10 items-center rounded-full bg-mint px-5 text-xs font-bold text-black">Create Business Channel</Link></div></div>)}
            {channel !== 'account' && hasRole(channel) && <div className="mt-8 border-t border-white/10 pt-5"><Button variant="danger" onClick={() => deactivateChannel(channel)}><Trash2 size={14} />Delete {channel} channel</Button><p className="mt-2 text-[10px] text-white/35">This removes the public channel profile. Your personal account remains active.</p></div>}
          </section>
          {channel !== 'account' && hasRole(channel) && <div className={`flex flex-col justify-between gap-4 rounded-2xl p-5 text-black sm:flex-row sm:items-center ${channel === 'creator' ? 'bg-pink-soft' : 'bg-mint-soft'}`}><span><strong className="block">Open the full {channel} workspace</strong><small className="mt-1 block opacity-60">Manage campaigns, messages, analytics and settings.</small></span><Link to={`/${channel}/dashboard`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:opacity-85">Go to dashboard <ChevronRight size={15} /></Link></div>}
          {channel === 'account' && <section className="rounded-2xl border border-red-300/15 bg-red-300/[.035] p-5"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-red-200/45">Account controls</p><div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><span><strong className="block text-sm">Delete account</strong><small className="mt-1 block text-white/35">Soft deletes your account and ends every active session.</small></span><Button variant="ghost" disabled={userProfile.loading} onClick={deleteAccount}><Trash2 size={14} />Delete account</Button></div></section>}
        </div>}
        {view === 'saved' && <section><SectionTitle eyebrow={`${saved.length} items`} title="Saved content" action={<Link to="/saved" className="text-xs font-bold text-pink">View all →</Link>} />{saved.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{saved.map((key) => <MarketplaceItem key={key} itemKey={key} />)}</div> : <div className="grid min-h-56 place-items-center rounded-3xl border border-dashed border-white/15 text-center"><div><FolderHeart className="mx-auto text-pink" /><p className="mt-3 text-sm text-white/45">You have not saved anything yet.</p><Link to="/showcase" className="mt-4 inline-flex min-h-9 items-center rounded-full bg-pink px-4 text-[11px] font-bold text-black">Browse showcase</Link></div></div>}</section>}
        {view === 'following' && <section><SectionTitle eyebrow={`${following.length} channels`} title="People & businesses you follow" action={<Link to="/following" className="text-xs font-bold text-mint">View all →</Link>} />{following.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{following.map((key) => <MarketplaceItem key={key} itemKey={key} />)}</div> : <div className="grid min-h-56 place-items-center rounded-3xl border border-dashed border-white/15 text-center"><div><Users className="mx-auto text-mint" /><p className="mt-3 text-sm text-white/45">You are not following any channels yet.</p><Link to="/search/creators" className="mt-4 inline-flex min-h-9 items-center rounded-full bg-mint px-4 text-[11px] font-bold text-black">Find creators</Link></div></div>}</section>}
        {view === 'collections' && <section><SectionTitle eyebrow={`${collections.length} collections`} title="Your collections" action={<Link to="/collections" className="text-xs font-bold text-pink">Manage all →</Link>} /><div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-white/[.07] bg-white/[.025] p-3 text-[10px] text-white/40"><span><b className="text-white/65">Private</b> · only you</span><span><b className="text-white/65">Shareable</b> · anyone with the link</span><span><b className="text-white/65">Public</b> · visible on your profile</span></div>{collections.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{collections.map((item) => <CollectionCard key={item.id} collection={item} />)}</div> : <div className="grid min-h-56 place-items-center rounded-3xl border border-dashed border-white/15 text-center"><div><FolderHeart className="mx-auto text-pink" /><p className="mt-3 text-sm text-white/45">Create a collection to organize saved work.</p><Link to="/collections" className="mt-4 inline-flex min-h-9 items-center rounded-full bg-pink px-4 text-[11px] font-bold text-black">Create collection</Link></div></div>}</section>}
      </div>
    </div>
  </main>
}
