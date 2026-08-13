import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BarChart3, Bell, BookmarkCheck, BriefcaseBusiness, Check, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Compass, FileSignature, FolderKanban, FolderOpen, Gauge, Handshake, ImagePlus, Inbox, LayoutDashboard, LogOut, Menu, MessageSquare, Palette, Search, Settings, Users, WalletCards, X } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../BrandLogo'
import { Avatar, Badge } from '../ui'
import { useCollaboration } from '../../context/collaboration-context'
import { useMarketplace } from '../../context/marketplace-context'
import { useAuth } from '../../context/auth-context'
import { SidebarNavItem } from '../navigation/SidebarNavItem'
import { TextType } from '../reactbits/TextType'
import { useLanguage } from '../../context/language-context'
import { LanguageSwitcher } from '../navigation/LanguageSwitcher'
import { contentApi } from '../../api/content.api'
import { StoryViewer } from '../content/StoryViewer'

const exploreSection = (role) => ({
  label:'marketplace.explore',
  items:[['common.discover','/discover',Compass],['common.showcase',`/${role}/showcase`,FolderOpen]],
})

const creatorSections = [
  { label:'dashboard.sections.overview', items:[['dashboard.items.overview','/creator/dashboard',LayoutDashboard]] },
  exploreSection('creator'),
  { label:'dashboard.sections.opportunities', items:[['dashboard.items.discoverCampaigns','/creator/discover',Search],['dashboard.items.incomingRequests','/creator/work-requests',Inbox],['dashboard.items.sentWorkRequests','/creator/proposals',Handshake]] },
  { label:'dashboard.sections.workspace', items:[['dashboard.items.posts','/creator/posts',ImagePlus],['dashboard.items.portfolio','/creator/portfolio',Palette],['dashboard.items.campaigns','/creator/campaigns',BriefcaseBusiness],['dashboard.items.collaborations','/creator/collaborations',FolderKanban],['dashboard.items.contracts','/creator/contracts',FileSignature]] },
  { label:'dashboard.sections.performance', items:[['dashboard.items.messages','/creator/messages',MessageSquare],['dashboard.items.analytics','/creator/analytics',BarChart3],['dashboard.items.wallet','/creator/wallet',WalletCards]] },
]

const businessSections = [
  { label:'dashboard.sections.overview', items:[['dashboard.items.overview','/business/dashboard',LayoutDashboard]] },
  exploreSection('business'),
  { label:'dashboard.sections.campaignWorkspace', items:[['dashboard.items.posts','/business/posts',ImagePlus],['dashboard.items.campaigns','/business/campaigns',BriefcaseBusiness],['dashboard.items.creatorRequests','/business/proposals',Handshake],['dashboard.items.creators','/business/creators',Users],['dashboard.items.shortlist','/business/shortlist',BookmarkCheck],['dashboard.items.compare','/business/compare',Gauge]] },
  { label:'dashboard.sections.collaboration', items:[['dashboard.items.incomingResponses','/business/responses',Inbox],['dashboard.items.collaborations','/business/collaborations',FolderKanban],['dashboard.items.contracts','/business/contracts',FileSignature]] },
  { label:'dashboard.sections.performance', items:[['dashboard.items.messages','/business/messages',MessageSquare],['dashboard.items.analytics','/business/analytics',BarChart3],['dashboard.items.payments','/business/payments',CircleDollarSign]] },
]

const channelDefinitions = [
  { role:'creator', subKey:'dashboard.creatorChannel', to:'/creator/dashboard' },
  { role:'business', subKey:'dashboard.businessChannel', to:'/business/dashboard' },
]

const initials = (value, fallback = 'A') => value?.trim().split(/\s+/).map((part)=>part[0]).join('').slice(0,2).toUpperCase() || fallback
const relativeTime = (value) => {
  if (!value) return ''
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const ranges = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]
  const [unit, size] = ranges.find(([, amount]) => Math.abs(seconds) >= amount) || ['second', 1]
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round(seconds / size), unit)
}

function DashboardNotificationMenu({ role, notifications, onRead, onReadAll }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const unreadCount = notifications.filter((item) => item.unread).length
  const accent = role === 'creator' ? 'pink' : 'mint'
  const openItem = async (item) => {
    if (item.unread) {
      try { await onRead(item.id) } catch { return }
    }
    setOpen(false)
    if (item.href) navigate(item.href)
  }
  const markAll = async () => {
    try { await onReadAll() } catch { /* Keep the current unread state if the API fails. */ }
  }
  return <div onPointerEnter={(event) => { if (event.pointerType === 'mouse') setOpen(true) }} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setOpen(false) }} className="relative">
    <button aria-label={`Open notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`} aria-expanded={open} onClick={() => setOpen(true)} className={`relative grid size-10 shrink-0 place-items-center rounded-full border transition ${open ? (role==='creator'?'border-pink/40 bg-pink/10':'border-mint/40 bg-mint/10') : 'border-transparent hover:bg-white/[.06]'}`}><Bell size={17}/>{unreadCount>0&&<i className={`absolute right-2 top-2 size-1.5 rounded-full ${role==='creator'?'bg-pink':'bg-mint'}`}/>}</button>
    <AnimatePresence>{open&&<motion.div initial={{opacity:0,y:-8,scale:.97}} animate={{opacity:1,y:7,scale:1}} exit={{opacity:0,y:-5,scale:.985}} transition={{duration:.16}} className="absolute right-0 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#171717]/95 shadow-[0_28px_80px_rgba(0,0,0,.45)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5"><div><strong className="block text-sm">Notifications</strong><small className="mt-0.5 block text-[10px] text-white/35">Account and collaboration updates</small></div>{unreadCount>0?<button type="button" onClick={markAll} className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${role==='creator'?'bg-pink/10 text-pink':'bg-mint/10 text-mint'}`}>Mark all read</button>:<Badge variant={accent}>Up to date</Badge>}</div>
      <div className="max-h-[22rem] space-y-1 overflow-y-auto p-2 [scrollbar-width:none]">{notifications.length?notifications.slice(0,6).map((item)=><button type="button" key={item.id} onClick={()=>openItem(item)} className="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.055]"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.unread?(role==='creator'?'bg-pink':'bg-mint'):'bg-white/15'}`}/><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><strong className={`line-clamp-1 text-xs ${item.unread?'text-white':'text-white/65'}`}>{item.title||'Notification'}</strong><time className="shrink-0 text-[9px] text-white/25">{relativeTime(item.createdAt)}</time></span><small className="mt-1.5 line-clamp-2 block text-[10px] leading-4 text-white/35 group-hover:text-white/50">{item.body}</small><span className="mt-2 block text-[8px] font-bold uppercase tracking-[.12em] text-white/20">{String(item.type||'UPDATE').replaceAll('_',' ')}</span></span></button>):<p className="px-4 py-8 text-center text-xs text-white/35">No notifications yet.</p>}</div>
      <button type="button" onClick={()=>{setOpen(false);navigate(`/${role}/notifications`)}} className="w-full border-t border-white/10 px-4 py-2 text-center !text-[8px] font-semibold uppercase leading-none tracking-[.08em] text-white/35 transition hover:bg-white/[.035] hover:text-white">Open notification center</button>
    </motion.div>}</AnimatePresence>
  </div>
}

function HeaderProfileMenu({ role, channels=[], profile, hasActiveStory = false, onOpenStory }) {
  const [open,setOpen]=useState(false)
  const navigate=useNavigate()
  const {logout}=useAuth()
  const {t}=useLanguage()
  const accent=role==='creator'?'pink':'mint'
  const select=(item)=>{setOpen(false);navigate(item.to)}
  const signOut=async()=>{setOpen(false);await logout();navigate('/login',{replace:true})}
  return <div onPointerEnter={(event)=>{if(event.pointerType==='mouse')setOpen(true)}} onPointerLeave={(event)=>{if(event.pointerType==='mouse')setOpen(false)}} className="relative">
    <div className="flex items-center gap-2 rounded-full border-l border-white/10 py-1 pl-3 pr-2 transition hover:bg-white/[.05] sm:gap-3 sm:pl-4">
      <button type="button" onClick={()=>{if(hasActiveStory){setOpen(false);onOpenStory?.()}else setOpen(!open)}} aria-label={hasActiveStory?'View your active story':'Open profile menu'} className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-pink"><Avatar src={profile.image} size="sm" fallback={profile.avatar} story={hasActiveStory}/></button>
      <button aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(!open)} className="flex min-w-0 items-center gap-2 text-left sm:gap-3">
        <span className="hidden min-w-0 sm:block"><strong className="block max-w-36 truncate text-xs">{profile.name}</strong><small className="block text-[9px] text-white/35">{profile.sub}</small></span>
        <ChevronDown size={13} className={`text-white/35 transition ${open?'rotate-180':''}`}/>
      </button>
    </div>
    <AnimatePresence>{open&&<motion.div role="menu" initial={{opacity:0,y:-7,scale:.98}} animate={{opacity:1,y:7,scale:1}} exit={{opacity:0,y:-5,scale:.985}} className="absolute right-0 z-50 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#181818]/95 p-2 shadow-float backdrop-blur-xl">
      <p className="px-3 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[.14em] text-white/25">{t('dashboard.switchChannel')}</p>
      {channels.map((item)=><button role="menuitem" key={item.role} onClick={()=>select(item)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.06]"><Avatar src={item.image} size="sm" fallback={item.avatar} story={item.role===role&&hasActiveStory}/><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{item.name}</strong><small className="text-[10px] text-white/35">{item.sub}</small></span>{item.role===role&&<Check size={14} className={accent==='pink'?'text-pink':'text-mint'}/>}</button>)}
      <div className="my-1 border-t border-white/10 pt-1">
        <button role="menuitem" onClick={()=>{setOpen(false);navigate('/account')}} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-white/50 transition hover:bg-white/[.05] hover:text-white"><Users size={14}/>{t('common.myAccount')}</button>
        <button role="menuitem" onClick={()=>{setOpen(false);navigate(`/${role}/settings`)}} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-white/50 transition hover:bg-white/[.05] hover:text-white"><Settings size={14}/>{t('common.channelSettings')}</button>
      </div>
      <button role="menuitem" onClick={signOut} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-[#ef7189]/20 px-3 py-2.5 text-left text-xs text-[#ef7189] transition hover:bg-[#ef7189]/10"><LogOut size={14}/>{t('common.logOut')}</button>
    </motion.div>}</AnimatePresence>
  </div>
}

function DashboardNavigation({ sections, role, collapsed=false, close }) {
  const {t}=useLanguage()
  const activeClass=role==='creator'
    ? 'bg-pink !text-[#10070d] font-semibold'
    : 'bg-mint !text-[#07110c] font-semibold'
  return <nav className="flex-1 space-y-5 px-3 pb-5">{sections.map((section)=><section key={section.label}><p className={`mb-2 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-white/20 ${collapsed?'sr-only':''}`}>{t(section.label)}</p><div className="space-y-1">{section.items.map(([label,to,Icon])=><SidebarNavItem key={`${to}:${collapsed}`} label={t(label)} to={to} icon={Icon} end={to.endsWith('dashboard')} onNavigate={close} collapsed={collapsed} activeClass={activeClass}/>)}</div></section>)}</nav>
}

export function DashboardLayout({ role }) {
  const [sidebarHovered,setSidebarHovered]=useState(false)
  const [sidebarFocused,setSidebarFocused]=useState(false)
  const [sidebarPinned,setSidebarPinned]=useState(false)
  const [mobileOpen,setMobileOpen]=useState(false)
  const [activeStories,setActiveStories]=useState([])
  const [storyOpen,setStoryOpen]=useState(false)
  const navigate=useNavigate()
  const location=useLocation()
  const {workspaces,notifications,markNotificationRead,markAllNotificationsRead}=useCollaboration()
  const {account}=useMarketplace()
  const {hasRole,user}=useAuth()
  const {t}=useLanguage()
  const channels=channelDefinitions.filter((item)=>hasRole(item.role)).map((item)=>{
    const source=item.role==='creator'?account.creator:account.business
    const sub=t(item.subKey)
    const name=source.name||user?.displayName||user?.name||user?.email||sub
    return {...item,sub,name,avatar:initials(name,item.role==='creator'?'C':'B'),image:item.role==='creator'?source.avatar:source.logo}
  })
  const sections=role==='creator'?creatorSections:businessSections
  const profile=channels.find((item)=>item.role===role)||{
    role,
    name:user?.displayName||user?.name||user?.email||t(role==='creator'?'dashboard.creatorChannel':'dashboard.businessChannel'),
    sub:t(role==='creator'?'dashboard.creatorChannel':'dashboard.businessChannel'),
    avatar:initials(user?.displayName||user?.name||user?.email,role==='creator'?'C':'B'),
    image:user?.avatarUrl||'',
  }
  const pathSegments=location.pathname.split('/').filter(Boolean).slice(1)
  const crumbs=pathSegments.map((segment,index)=>{
    const previous=pathSegments[index-1]
    const isWorkspaceId=previous==='collaborations'
    const workspace=isWorkspaceId?workspaces.find((item)=>item.id===segment):null
    const campaign=workspace?.campaign
    const workspaceLabel=(typeof campaign==='string'?campaign:campaign?.title)||workspace?.campaignName||workspace?.title
    const looksLikeId=/^[a-z0-9_-]{16,}$/i.test(segment)
    return {
      key:`${index}-${segment}`,
      label:isWorkspaceId?(workspaceLabel||'Workspace'):(looksLikeId?'Details':segment.replaceAll('-',' ')),
      path:`/${role}/${pathSegments.slice(0,index+1).join('/')}`,
      current:index===pathSegments.length-1,
    }
  })
  const accent=role==='creator'?'pink':'mint'
  const hasActiveStory=activeStories.length>0
  const sidebarExpanded=sidebarPinned||sidebarHovered||sidebarFocused
  const collapsed=!sidebarExpanded
  useEffect(()=>{
    try { window.localStorage.setItem('vyra:last-dashboard-role', role) } catch { /* Login can still use role priority. */ }
  },[role])
  useEffect(()=>{
    let active=true
    const refresh=()=>contentApi.mine({authorType:role.toUpperCase(),status:'PUBLISHED',postType:'STORY',limit:30})
      .then((result)=>{if(active)setActiveStories((result.items||[]).filter((item)=>!item.expired&&Number(item.expiresInSeconds)>0))})
      .catch(()=>{if(active)setActiveStories([])})
    const handleStoryUpdate=(event)=>{if(!event.detail?.authorType||event.detail.authorType===role.toUpperCase())refresh()}
    refresh()
    window.addEventListener('vyra:story-updated',handleStoryUpdate)
    return()=>{active=false;window.removeEventListener('vyra:story-updated',handleStoryUpdate)}
  },[role])
  return <div data-theme="dark" className={`dashboard-shell dashboard-shell-${role} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}>
    <aside
      className={`dashboard-sidebar hidden lg:flex ${collapsed?'w-[5.25rem]':'w-[17.5rem]'}`}
      onPointerEnter={(event)=>{if(event.pointerType==='mouse')setSidebarHovered(true)}}
      onPointerLeave={(event)=>{if(event.pointerType==='mouse')setSidebarHovered(false)}}
      onFocusCapture={(event)=>{if(event.target.matches(':focus-visible'))setSidebarFocused(true)}}
      onBlurCapture={(event)=>{if(!event.currentTarget.contains(event.relatedTarget))setSidebarFocused(false)}}
    >
      <div className={`flex h-[76px] items-center border-b border-white/10 ${collapsed?'justify-center gap-1 px-2':'justify-between px-5'}`}>
        {collapsed?<span className={`font-serif text-xl font-black italic ${role==='creator'?'text-pink':'text-mint'}`}>V</span>:<BrandLogo className="text-white"/>}
        <button aria-label={sidebarPinned?'Unpin sidebar':'Pin sidebar open'} aria-pressed={sidebarPinned} onClick={()=>setSidebarPinned((value)=>!value)} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white/[.06]">{sidebarPinned?<ChevronLeft size={15}/>:<ChevronRight size={15}/>}</button>
      </div>
      <div className={`pt-4 ${collapsed?'pb-3 text-center':'px-4 pb-4'}`}>
        <Badge
          variant={accent}
          className={collapsed ? undefined : 'max-w-full overflow-hidden whitespace-nowrap'}
        >
          {collapsed
            ? (role==='creator'?'C':'B')
            : <TextType
                text={t('dashboard.workspace', { channel: profile.sub })}
                typingSpeed={9}
                initialDelay={0}
                loop={false}
                cursorCharacter="▍"
                cursorClassName={role==='creator'?'text-[#7d1f50]':'text-[#155b31]'}
              />}
        </Badge>
      </div>
      <DashboardNavigation sections={sections} role={role} collapsed={collapsed}/>
    </aside>
    <div className={`transition-[padding] duration-300 ${sidebarPinned?'lg:pl-[17.5rem]':'lg:pl-[5.25rem]'}`}>
      <header className="dashboard-topbar">
        <button aria-label={t('common.openNavigation')} className="grid size-10 place-items-center rounded-full border border-white/10 lg:hidden" onClick={()=>setMobileOpen(true)}><Menu size={18}/></button>
        <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-[10px] uppercase tracking-[.12em] text-white/30 sm:flex">
          <button onClick={()=>navigate(`/${role}/dashboard`)} className="capitalize transition hover:text-white/70">{role}</button>
          {crumbs.map((item)=><span key={item.key} className="flex min-w-0 items-center gap-2">
            <i className="not-italic text-white/15">/</i>
            {item.current
              ? <b aria-current="page" className="max-w-52 truncate font-semibold capitalize text-white/65">{item.label}</b>
              : <button onClick={()=>navigate(item.path)} className="max-w-40 truncate capitalize transition hover:text-white/70">{item.label}</button>}
          </span>)}
        </nav>
        <span className="ml-auto" />
        <DashboardNotificationMenu role={role} notifications={notifications} onRead={markNotificationRead} onReadAll={markAllNotificationsRead}/>
        <HeaderProfileMenu role={role} channels={channels} profile={profile} hasActiveStory={hasActiveStory} onOpenStory={()=>setStoryOpen(true)}/>
        <LanguageSwitcher compact />
      </header>
      <AnimatePresence mode="wait"><motion.div key={location.pathname} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.2}}><Outlet/></motion.div></AnimatePresence>
    </div>
    <AnimatePresence>{mobileOpen&&<><motion.div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm lg:hidden" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setMobileOpen(false)}/><motion.aside className="fixed inset-y-0 left-0 z-[90] flex w-[min(19rem,88vw)] flex-col overflow-y-auto border-r border-white/10 bg-[#101010] lg:hidden" initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}} transition={{type:'spring',stiffness:320,damping:32}}><div className="flex h-[70px] shrink-0 items-center justify-between border-b border-white/10 px-5"><BrandLogo className="text-white"/><button aria-label={t('common.closeNavigation')} onClick={()=>setMobileOpen(false)}><X size={18}/></button></div><div className="px-4 py-4"><Badge variant={accent} className="max-w-full overflow-hidden whitespace-nowrap"><TextType text={t('dashboard.workspace', { channel: profile.sub })} typingSpeed={9} initialDelay={0} loop={false} cursorCharacter="▍" cursorClassName={role==='creator'?'text-[#7d1f50]':'text-[#155b31]'}/></Badge></div><DashboardNavigation sections={sections} role={role} close={()=>setMobileOpen(false)}/></motion.aside></>}</AnimatePresence>
    {storyOpen&&<StoryViewer stories={activeStories} onClose={()=>setStoryOpen(false)}/>}
  </div>
}
