import { useEffect, useState } from 'react'
import { ArrowUpRight, Bookmark, BriefcaseBusiness, Download, Edit3, GitCompareArrows, ImagePlus, Search, Star, Trash2, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DashboardHeader, DashboardPage, DashboardPanel } from '../../components/dashboard/DashboardUI'
import { Avatar, Badge, Button, Dialog, EmptyState, FileUpload, Input, Select, Switch, Tabs, Textarea, useToast } from '../../components/ui'
import { useCollaboration } from '../../context/collaboration-context'
import { useDashboardData } from '../../context/dashboard-data-context'
import { useMarketplace } from '../../context/marketplace-context'
import { useAuth } from '../../context/auth-context'
import { useBusiness } from '../../hooks/useBusiness'
import { useCreator } from '../../hooks/useCreator'
import { useUser } from '../../hooks/useUser'
import { marketplaceApi } from '../../api/marketplace.api'
import { sourcingApi } from '../../api/campaign.api'
import { toCreatorCard } from '../../api/marketplace.mapper'
import { resolveMediaUrl } from '../../api/mediaUrl'

function toShortlistCreatorCard(entry) {
  const source = entry.creator
  return {
    id: source.id,
    name: source.name,
    username: source.slug ? `@${source.slug}` : '',
    niche: source.niche || 'Creator',
    location: source.location || '—',
    followers: Number.isFinite(source.followers) ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(source.followers) : '—',
    engagement: source.engagementRate == null ? '—' : `${Number(source.engagementRate).toFixed(1)}%`,
    rating: source.rating ?? '—',
    price: source.startingRate ? new Intl.NumberFormat('en', { style: 'currency', currency: 'MNT', maximumFractionDigits: 0 }).format(source.startingRate) : 'Contact for rate',
    verified: source.verified,
    statisticsVerified: source.statisticsVerified,
    statisticsCapturedAt: source.statisticsCapturedAt,
    statisticsSource: source.statisticsSource,
    avatar: resolveMediaUrl(source.avatar),
    cover: resolveMediaUrl(source.avatar),
    platforms: source.platforms || [],
  }
}

function portfolioMedia(file, onLoad) {
  if (!file) return onLoad('')
  const reader = new FileReader()
  reader.onload = () => onLoad(String(reader.result || ''))
  reader.readAsDataURL(file)
}

const emptyPortfolioDraft={title:'',client:'',year:'2026',category:'',status:'Published',description:'',image:''}

export function PortfolioPage(){
  const {toast}=useToast()
  const {portfolio,addPortfolioItem,updatePortfolioItem,deletePortfolioItem}=useDashboardData()
  const {account}=useMarketplace()
  const [open,setOpen]=useState(false)
  const [editing,setEditing]=useState(null)
  const [filter,setFilter]=useState('All')
  const [draft,setDraft]=useState(emptyPortfolioDraft)
  const openEditor=(item=null)=>{
    setEditing(item?.id||null)
    setDraft(item?{
      title:item.title,
      client:item.client||'',
      year:item.year||'2026',
      category:item.category,
      status:item.status||'Published',
      description:item.description||'',
      image:item.image,
    }:emptyPortfolioDraft)
    setOpen(true)
  }
  const save=(event)=>{event.preventDefault();if(!draft.title.trim()||!draft.category||!draft.image){toast('Title, category and media are required.',{type:'error'});return}if(editing)updatePortfolioItem(editing,draft);else addPortfolioItem(draft);setOpen(false);toast(editing?'Portfolio item updated.':'Portfolio item added.',{type:'success'})}
  const downloadKit=()=>{const content=[`VYRA Creator Media Kit`,`Creator: ${account.creator.name}`,`Niche: ${account.creator.niche}`,`Location: ${account.creator.location}`,`Starting rate: ${account.creator.rate}`,`Portfolio items: ${portfolio.length}`].join('\n');const url=URL.createObjectURL(new Blob([content],{type:'text/plain'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`${account.creator.username?.replace('@','')||'creator'}-media-kit.txt`;anchor.click();URL.revokeObjectURL(url);toast('Media kit downloaded.',{type:'success'})}
  const visible=portfolio.filter((item)=>filter==='All'||(item.status||'Published')===filter)
  const published=portfolio.filter((item)=>(item.status||'Published')==='Published').length
  const drafts=portfolio.length-published

  return <DashboardPage>
    <DashboardHeader
      eyebrow="Creator channel"
      title="Portfolio"
      copy="Manage your own published case studies and work-in-progress drafts."
      action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={downloadKit}><Download size={15}/>Media kit</Button><Button variant="pink" onClick={()=>openEditor()}><ImagePlus size={15}/>Add project</Button></div>}
    />

    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-5 px-2 text-xs">
        <span><b className="mr-1.5 text-white">{portfolio.length}</b><i className="not-italic text-white/35">Projects</i></span>
        <span><b className="mr-1.5 text-mint">{published}</b><i className="not-italic text-white/35">Published</i></span>
        <span><b className="mr-1.5 text-pink">{drafts}</b><i className="not-italic text-white/35">Drafts</i></span>
      </div>
      <div className="flex rounded-xl bg-black/20 p-1">
        {['All','Published','Draft'].map((item)=><button key={item} onClick={()=>setFilter(item)} className={`rounded-lg px-3 py-2 text-[10px] font-bold transition ${filter===item?'bg-white text-black':'text-white/35 hover:text-white'}`}>{item}</button>)}
      </div>
    </div>

    {visible.length?<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((item)=><article key={item.id} className="group min-w-0 overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[.025] transition hover:-translate-y-0.5 hover:border-white/20">
        <div className="relative aspect-[4/3] overflow-hidden bg-white/[.03]">
          {item.image?.startsWith('data:video')?<video src={item.image} muted playsInline controls className="size-full object-cover"/>:<img src={item.image} alt={item.title} className="size-full object-cover transition duration-500 group-hover:scale-[1.025]"/>}
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <Badge variant={(item.status||'Published')==='Draft'?'pink':'mint'}>{item.status||'Published'}</Badge>
            <button onClick={()=>openEditor(item)} aria-label={`Edit ${item.title}`} className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/65 text-white backdrop-blur transition hover:bg-white hover:text-black"><Edit3 size={14}/></button>
          </div>
        </div>
        <div className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-[.13em] text-white/30">{item.category}</p>
          <h2 className="mt-2 truncate text-xl font-bold">{item.title}</h2>
          <p className="mt-1 text-[11px] text-white/35">{item.client||'Independent'} · {item.year||'2026'}</p>
          {item.description&&<p className="mt-3 line-clamp-2 text-[11px] leading-5 text-white/45">{item.description}</p>}
          <div className="mt-4 flex gap-4 border-t border-white/[.08] pt-3 text-[10px] text-white/35"><span><b className="text-white/70">{item.views||'0'}</b> views</span><span><b className="text-white/70">{item.saves||'0'}</b> saves</span></div>
        </div>
      </article>)}
    </div>:<EmptyState title={filter==='All'?'Build your portfolio':`No ${filter.toLowerCase()} projects`} description={filter==='All'?'Add finished collaborations or personal projects as clear case studies.':'Choose another filter or add a new project.'} onAction={()=>openEditor()} action="Add project"/>}

    <Dialog dark open={open} onClose={()=>setOpen(false)} title={editing?'Edit portfolio project':'Add portfolio project'} description="Add only work you created or have permission to showcase.">
      <form onSubmit={save} className="space-y-4">
        <FileUpload label="Cover image or video" accept="image/*,video/*" value={draft.image?'Media selected':''} onChange={(files)=>portfolioMedia(files[0],(image)=>setDraft((value)=>({...value,image})))} />
        <Input label="Project title" value={draft.title} onChange={(event)=>setDraft((value)=>({...value,title:event.target.value}))}/>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Client / brand" value={draft.client} onChange={(event)=>setDraft((value)=>({...value,client:event.target.value}))} placeholder="Independent"/>
          <Input label="Year" value={draft.year} onChange={(event)=>setDraft((value)=>({...value,year:event.target.value}))}/>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" value={draft.category} onChange={(event)=>setDraft((value)=>({...value,category:event.target.value}))} options={['Brand campaign','UGC','Fashion editorial','Review','Event coverage','Personal project']}/>
          <Select label="Status" value={draft.status} onChange={(event)=>setDraft((value)=>({...value,status:event.target.value}))} options={['Published','Draft']}/>
        </div>
        <Textarea label="Case study summary" value={draft.description} onChange={(event)=>setDraft((value)=>({...value,description:event.target.value}))} placeholder="Briefly explain the idea, your role and the result."/>
        <div className="flex justify-between gap-2">
          {editing?<Button type="button" variant="ghost" onClick={()=>{deletePortfolioItem(editing);setOpen(false);toast('Portfolio project deleted.',{type:'success'})}}><Trash2 size={14}/>Delete</Button>:<span/>}
          <div className="flex gap-2"><Button type="button" variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" variant="pink">Save project</Button></div>
        </div>
      </form>
    </Dialog>
  </DashboardPage>
}

export function SettingsPage({ role }){
  const [tab,setTab]=useState('profile')
  const {account,updateAccount}=useMarketplace()
  const {preferences,updatePreferences}=useDashboardData()
  const {clearSession}=useAuth()
  const creatorProfile=useCreator()
  const businessProfile=useBusiness()
  const userProfile=useUser()
  const navigate=useNavigate()
  const {toast}=useToast()
  const [edits,setEdits]=useState({})
  const form={...account[role],...edits}
  const [passwords,setPasswords]=useState({currentPassword:'',newPassword:'',confirmPassword:''})
  const prefs=preferences[role]
  const channelApi=role==='creator'?creatorProfile:businessProfile
  const set=(name)=>(event)=>setEdits((value)=>({...value,[name]:event.target.value}))
  const saveProfile=async()=>{try{const payload=role==='creator'?{channelName:form.name,username:(form.username||'').replace(/^@/,''),location:form.location||'',niche:form.niche||'',bio:form.bio||''}:{organization:form.name,username:(form.username||'').replace(/^@/,''),location:form.location||'',industry:form.industry||'',description:form.description||''};const result=await channelApi.updateProfile(payload);updateAccount(role,result.profile);toast('Channel settings saved to My Account.',{type:'success'})}catch(error){toast(error.message,{type:'error'})}}
  const changePassword=async()=>{if(passwords.newPassword!==passwords.confirmPassword){toast('New passwords do not match.',{type:'error'});return}try{await userProfile.changePassword({currentPassword:passwords.currentPassword,newPassword:passwords.newPassword});clearSession();toast('Password updated. Sign in again.',{type:'success'});navigate('/login',{replace:true})}catch(error){toast(error.message,{type:'error'})}}
  const deactivate=async()=>{if(!window.confirm(`Delete this ${role} channel?`))return;try{await channelApi.deleteProfile();updateAccount(role,{name:'',username:'',location:''});toast('Channel deleted.',{type:'success'});navigate('/welcome',{replace:true})}catch(error){toast(error.message,{type:'error'})}}
  return <DashboardPage><DashboardHeader eyebrow={`${role} channel`} title="Settings" copy="Manage channel details, preferences and frontend notification states."/><Tabs value={tab} onChange={setTab} tabs={[
    {label:'Profile',value:'profile',content:<DashboardPanel title="Channel profile"><div className="grid gap-4 sm:grid-cols-2"><Input label="Display name" value={form.name||''} onChange={set('name')}/><Input label="Username" value={form.username||''} onChange={set('username')}/><Input label="Location" value={form.location||''} onChange={set('location')}/><Select label="Primary category" value={form.niche||form.industry||''} onChange={(event)=>setEdits((value)=>({...value,[role==='creator'?'niche':'industry']:event.target.value}))} options={['Fashion','Travel','Technology','Beauty','Lifestyle','Agency']}/><Textarea className="sm:col-span-2" label="Channel description" value={form.bio||form.description||''} onChange={(event)=>setEdits((value)=>({...value,[role==='creator'?'bio':'description']:event.target.value}))}/></div>{channelApi.error&&<p className="ui-error mt-4">{channelApi.error.message}</p>}<Button className="mt-5" variant="pink" loading={channelApi.loading} disabled={channelApi.loading} onClick={saveProfile}>Save changes</Button></DashboardPanel>},
    {label:'Notifications',value:'notifications',content:<DashboardPanel title="Notification preferences"><div className="space-y-5"><Switch label="Email notifications" description="Receive important account and campaign updates." checked={prefs.email} onChange={(event)=>updatePreferences(role,{email:event.target.checked})}/><Switch label="Campaign activity" description="Milestones, proposals, invitations and approvals." checked={prefs.campaign} onChange={(event)=>updatePreferences(role,{campaign:event.target.checked})}/><Switch label="Marketing updates" description="Product news and creator economy reports." checked={prefs.marketing} onChange={(event)=>updatePreferences(role,{marketing:event.target.checked})}/><p className="text-xs text-white/35">Preferences are saved automatically in this browser.</p></div></DashboardPanel>},
    {label:'Security',value:'security',content:<DashboardPanel title="Security"><div className="max-w-lg space-y-4"><Input type="password" label="Current password" value={passwords.currentPassword} onChange={(event)=>setPasswords((value)=>({...value,currentPassword:event.target.value}))} placeholder="••••••••"/><Input type="password" label="New password" value={passwords.newPassword} onChange={(event)=>setPasswords((value)=>({...value,newPassword:event.target.value}))} placeholder="At least 8 characters"/><Input type="password" label="Confirm new password" value={passwords.confirmPassword} onChange={(event)=>setPasswords((value)=>({...value,confirmPassword:event.target.value}))}/>{userProfile.error&&<p className="ui-error">{userProfile.error.message}</p>}<Button variant="outline" loading={userProfile.loading} disabled={userProfile.loading||!passwords.currentPassword||!passwords.newPassword||!passwords.confirmPassword} onClick={changePassword}>Update password</Button></div></DashboardPanel>},
    {label:'Danger zone',value:'danger',content:<DashboardPanel title="Danger zone"><div className="flex items-center justify-between gap-4 rounded-xl border border-[#df3f65]/30 p-4"><span><strong className="block text-sm">Delete channel</strong><small className="text-white/35">Removes this public channel and its saved profile data.</small></span><Button variant="danger" disabled={channelApi.loading} onClick={deactivate}><Trash2 size={15}/>Delete</Button></div></DashboardPanel>},
  ]}/></DashboardPage>
}

function creatorAudience(creator) {
  const values = String(creator.followers || '')
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number) || [0]
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

function creatorPrice(creator) {
  return Number(String(creator.price || '').replace(/[^\d.]/g, '')) || 0
}

function CreatorTalentCard({
  creator,
  index,
  shortlist,
  compare,
  invited,
  toggleShortlist,
  toggleCompare,
  inviteCreator,
  navigate,
  toast,
}) {
  return (
    <article className="group relative isolate min-h-[21.5rem] overflow-hidden rounded-[1.3rem] border border-white/15 bg-[#171717] transition duration-500 hover:-translate-y-1 hover:border-white/30">
      <img
        src={creator.cover}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover opacity-70 transition duration-700 group-hover:scale-[1.045] group-hover:opacity-85"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/90" />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-mint/35 via-mint/10 to-transparent mix-blend-screen" />
      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <span className="grid size-8 place-items-center rounded-full border border-white/35 bg-black/20 text-[9px] tracking-[.1em] backdrop-blur-md">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="max-w-36 truncate rounded-full border border-white/20 bg-black/25 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[.1em] text-white/75 backdrop-blur-md">
          {creator.location}
        </span>
      </div>
      <div className="absolute inset-x-3 bottom-3 text-center">
        <div className="flex items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-[.13em] text-white/75">
          <span className="truncate">{creator.niche}</span>
        </div>
        <h2 className="mt-1.5 line-clamp-2 text-[clamp(1.3rem,1.6vw,1.75rem)] font-semibold leading-none tracking-[-.035em]">
          {creator.name}
        </h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[8px] font-bold uppercase tracking-[.08em] text-white/65">
          <span>{creator.followers}</span>
          <span className="text-mint">{creator.engagement} ER</span>
          <span className="flex items-center gap-1"><Star size={9} fill="currentColor" />{creator.rating}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={async () => {
              try {
                await toggleShortlist(creator.id)
              } catch (error) {
                toast(error.response?.data?.error?.message || error.response?.data?.message || 'Shortlist could not be updated.', { type: 'error' })
              }
            }}
            className={`flex min-h-8 items-center justify-center gap-1.5 rounded-full border px-2 text-[10px] font-bold ${
              shortlist.includes(creator.id)
                ? 'border-pink bg-pink text-black'
                : 'border-white/20 bg-black/35'
            }`}
          >
            <Bookmark size={11} />
            {shortlist.includes(creator.id) ? 'Saved' : 'Shortlist'}
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await toggleCompare(creator.id)
              } catch (error) {
                toast(error.response?.data?.error?.message || error.response?.data?.message || 'Comparison could not be updated.', { type: 'error' })
              }
            }}
            className={`flex min-h-8 items-center justify-center gap-1.5 rounded-full border px-2 text-[10px] font-bold ${
              compare.includes(creator.id)
                ? 'border-mint bg-mint text-black'
                : 'border-white/20 bg-black/35'
            }`}
          >
            <GitCompareArrows size={11} />
            Compare
          </button>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <button
            type="button"
            onClick={() => navigate(`/creators/${creator.id}`)}
            className="flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-bold text-black transition hover:bg-pink"
          >
            <span className="truncate">View</span>
            <ArrowUpRight size={12} className="shrink-0" />
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await inviteCreator(creator.id)
                toast(`${creator.name} invited.`, { type: 'success' })
              } catch (error) {
                toast(error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Invitation could not be sent.', { type: 'error' })
              }
            }}
            className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-black ${
              invited.includes(creator.id) ? 'bg-white/70' : 'bg-mint'
            }`}
            aria-label={`Invite ${creator.name}`}
          >
            <UserPlus size={13} />
          </button>
        </div>
      </div>
    </article>
  )
}

export function BusinessCreatorsPage({ mode = 'browse' }) {
  const navigate = useNavigate()
  const { openOfferComposer } = useCollaboration()
  const { toast } = useToast()
  const {
    shortlist,
    compare,
    invited,
    toggleShortlist,
    toggleCompare,
    inviteCreator,
  } = useDashboardData()
  const [query, setQuery] = useState('')
  const [niche, setNiche] = useState('')
  const [location, setLocation] = useState('')
  const [audience, setAudience] = useState('')
  const [engagement, setEngagement] = useState('')
  const [sort, setSort] = useState('recommended')
  const [remoteCreators, setRemoteCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) {
        setLoading(true)
        setLoadError('')
      }
    })
    const request = mode === 'shortlist'
      ? sourcingApi.shortlist().then((result) => (result.items || []).map(toShortlistCreatorCard))
      : mode === 'compare'
        ? sourcingApi.compare().then((result) => (result.items || []).map(toShortlistCreatorCard))
        : marketplaceApi.listCreators({ limit: 50 }).then((result) => (result.items || []).map(toCreatorCard))
    request
      .then((items) => { if (active) setRemoteCreators(items) })
      .catch((error) => {
        if (!active) return
        setRemoteCreators([])
        setLoadError(error.response?.data?.error?.message || error.response?.data?.message || 'Creators could not be loaded.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [mode, reloadKey])

  const title = mode === 'shortlist'
    ? 'Creator shortlist'
    : mode === 'compare'
      ? 'Compare creators'
      : 'Find creators'

  const baseCreators = remoteCreators

  const nicheOptions = [...new Set(remoteCreators.map((creator) => creator.niche.split(/[·&]/)[0].trim()))]
  const locationOptions = [...new Set(remoteCreators.map((creator) => creator.location))]
  const hasFilters = Boolean(query || niche || location || audience || engagement || sort !== 'recommended')

  const visible = baseCreators
    .filter((creator) => {
      const haystack = [
        creator.name,
        creator.username,
        creator.niche,
        creator.location,
        ...(creator.platforms || []),
      ].join(' ').toLowerCase()
      const audienceRange = creatorAudience(creator)
      const engagementValue = Number.parseFloat(creator.engagement) || 0
      const matchesAudience = !audience
        || (audience === 'under-100' && audienceRange.max < 100)
        || (audience === '100-200' && audienceRange.max >= 100 && audienceRange.min <= 200)
        || (audience === '200-plus' && audienceRange.max >= 200)
      return haystack.includes(query.trim().toLowerCase())
        && (!niche || creator.niche.includes(niche))
        && (!location || creator.location === location)
        && matchesAudience
        && (!engagement || engagementValue >= Number(engagement))
    })
    .sort((left, right) => {
      if (sort === 'audience') return creatorAudience(right).max - creatorAudience(left).max
      if (sort === 'engagement') return Number.parseFloat(right.engagement) - Number.parseFloat(left.engagement)
      if (sort === 'rating') return right.rating - left.rating
      if (sort === 'price-low') return creatorPrice(left) - creatorPrice(right)
      return remoteCreators.indexOf(left) - remoteCreators.indexOf(right)
    })

  const clearFilters = () => {
    setQuery('')
    setNiche('')
    setLocation('')
    setAudience('')
    setEngagement('')
    setSort('recommended')
  }

  const toolbar = (
    <section aria-label="Creator search and filters" className="mb-6 rounded-[1.4rem] border border-white/10 bg-white/[.025] p-3 sm:p-4">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, niche, location or platform..."
          aria-label="Search creators"
          className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-mint/60"
        />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <Select
          aria-label="Filter creator niche"
          value={niche}
          onChange={(event) => setNiche(event.target.value)}
          options={[
            { label: 'All niches', value: '' },
            ...nicheOptions.map((value) => ({ label: value, value })),
          ]}
        />
        <Select
          aria-label="Filter creator location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          options={[
            { label: 'All locations', value: '' },
            ...locationOptions.map((value) => ({ label: value, value })),
          ]}
        />
        <Select
          aria-label="Filter creator audience"
          value={audience}
          onChange={(event) => setAudience(event.target.value)}
          options={[
            { label: 'Any audience', value: '' },
            { label: 'Under 100K', value: 'under-100' },
            { label: '100K–200K', value: '100-200' },
            { label: '200K+', value: '200-plus' },
          ]}
        />
        <Select
          aria-label="Filter creator engagement"
          value={engagement}
          onChange={(event) => setEngagement(event.target.value)}
          options={[
            { label: 'Any engagement', value: '' },
            { label: '6% and above', value: '6' },
            { label: '8% and above', value: '8' },
            { label: '10% and above', value: '10' },
          ]}
        />
        <Select
          aria-label="Sort creators"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          options={[
            { label: 'Recommended', value: 'recommended' },
            { label: 'Largest audience', value: 'audience' },
            { label: 'Highest engagement', value: 'engagement' },
            { label: 'Highest rating', value: 'rating' },
            { label: 'Lowest starting price', value: 'price-low' },
          ]}
        />
      </div>
      <div className="mt-3 flex min-h-8 flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-3">
        <p aria-live="polite" className="text-xs text-white/38">
          <strong className="text-white/80">{visible.length}</strong> of {baseCreators.length} creators
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-bold text-mint transition hover:text-white"
          >
            Clear all filters
          </button>
        )}
      </div>
    </section>
  )

  return (
    <DashboardPage>
      <DashboardHeader
        eyebrow={mode === 'compare' ? 'Decision workspace' : 'Talent workspace'}
        title={title}
        copy={
          mode === 'shortlist'
            ? 'Search and refine creators saved for active campaign consideration.'
            : mode === 'compare'
              ? 'Filter selected creators, then compare audience, engagement, fit and pricing.'
              : 'Search and evaluate creators by niche, location, audience and engagement.'
        }
        action={
          mode === 'compare'
            ? <Button variant="outline" onClick={() => navigate('/business/creators')}><UserPlus size={14} />Add creators</Button>
            : null
        }
      />

      {toolbar}

      {loading ? (
        <p className="py-16 text-center text-sm text-white/40">Loading creators…</p>
      ) : loadError ? (
        <EmptyState
          title="Creators could not be loaded"
          description={loadError}
          action="Try again"
          onAction={() => setReloadKey((value) => value + 1)}
        />
      ) : mode === 'compare' ? (
        visible.length ? (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/35">
                  <th scope="col" className="p-4">Creator</th>
                  <th scope="col">Niche</th>
                  <th scope="col">Audience</th>
                  <th scope="col">Engagement</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Starting price</th>
                  <th scope="col">Statistics</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((creator) => (
                  <tr key={creator.id} className="border-b border-white/[.07] last:border-0">
                    <td className="p-4"><span className="flex items-center gap-3"><Avatar src={creator.avatar} size="sm" /><b>{creator.name}</b></span></td>
                    <td>{creator.niche}</td>
                    <td>{creator.followers}</td>
                    <td className="text-mint">{creator.engagement}</td>
                    <td>{creator.rating}</td>
                    <td>{creator.price}</td>
                    <td><span className="block font-semibold text-white/75">{creator.statisticsVerified ? 'Provider verified' : 'Manual / unavailable'}</span><small className="mt-1 block text-[10px] text-white/35">{creator.statisticsCapturedAt ? `Captured ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(creator.statisticsCapturedAt))}` : 'No verified capture'}</small></td>
                    <td>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openOfferComposer(creator)}><BriefcaseBusiness size={14} />Offer</Button>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          try {
                            await toggleCompare(creator.id)
                          } catch (error) {
                            toast(error.response?.data?.error?.message || error.response?.data?.message || 'Comparison could not be updated.', { type: 'error' })
                          }
                        }}>Remove</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={baseCreators.length ? 'No creators match these filters' : 'No creators selected for comparison'}
            description={baseCreators.length ? 'Clear or adjust the filters to see selected creators.' : 'Choose Compare on creator cards to build this table.'}
            onAction={baseCreators.length ? clearFilters : () => navigate('/business/creators')}
            action={baseCreators.length ? 'Clear filters' : 'Browse creators'}
          />
        )
      ) : visible.length ? (
        <div className="creator-talent-grid grid gap-3">
          {visible.map((creator, index) => (
            <CreatorTalentCard
              key={creator.id}
              creator={creator}
              index={index}
              shortlist={shortlist}
              compare={compare}
              invited={invited}
              toggleShortlist={toggleShortlist}
              toggleCompare={toggleCompare}
              inviteCreator={inviteCreator}
              navigate={navigate}
              toast={toast}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={baseCreators.length ? 'No creators match these filters' : mode === 'shortlist' ? 'Your shortlist is empty' : 'No creator channels yet'}
          description={baseCreators.length ? 'Try a broader niche, audience or engagement range.' : mode === 'shortlist' ? 'Add creators from the browse page.' : 'Registered creator channels will appear here as soon as they are active.'}
          onAction={baseCreators.length ? clearFilters : () => navigate('/business/creators')}
          action={baseCreators.length ? 'Clear filters' : mode === 'shortlist' ? 'Browse creators' : undefined}
        />
      )}
    </DashboardPage>
  )
}
