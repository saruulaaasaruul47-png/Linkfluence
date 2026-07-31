import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BarChart3, Bell, BookmarkCheck, BriefcaseBusiness, Check, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, FileSignature, FolderKanban, FolderOpen, Gauge, Handshake, Inbox, LayoutDashboard, LogOut, Menu, MessageSquare, Palette, Search, Settings, Users, WalletCards, X } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../BrandLogo'
import { Avatar, Badge } from '../ui'
import { useCollaboration } from '../../context/collaboration-context'
import { useMarketplace } from '../../context/marketplace-context'
import { useAuth } from '../../context/auth-context'
import { SidebarNavItem } from '../navigation/SidebarNavItem'
import { TextType } from '../reactbits/TextType'

const creatorSections = [
  { label:'Overview', items:[['Overview','/creator/dashboard',LayoutDashboard]] },
  { label:'Opportunities', items:[['Discover campaigns','/creator/discover',Search],['Work requests','/creator/work-requests',Inbox],['My proposals','/creator/proposals',Handshake]] },
  { label:'Workspace', items:[['Portfolio','/creator/portfolio',Palette],['Campaigns','/creator/campaigns',BriefcaseBusiness],['Collaborations','/creator/collaborations',FolderKanban],['Contracts','/creator/contracts',FileSignature]] },
  { label:'Performance', items:[['Messages','/creator/messages',MessageSquare],['Analytics','/creator/analytics',BarChart3],['Wallet','/creator/wallet',WalletCards]] },
]

const businessSections = [
  { label:'Overview', items:[['Overview','/business/dashboard',LayoutDashboard]] },
  { label:'Campaign workspace', items:[['Campaigns','/business/campaigns',BriefcaseBusiness],['Proposals','/business/proposals',Handshake],['Creators','/business/creators',Users],['Shortlist','/business/shortlist',BookmarkCheck],['Compare','/business/compare',Gauge]] },
  { label:'Collaboration', items:[['Incoming responses','/business/responses',Inbox],['Collaborations','/business/collaborations',FolderKanban],['Contracts','/business/contracts',FileSignature]] },
  { label:'Performance', items:[['Messages','/business/messages',MessageSquare],['Analytics','/business/analytics',BarChart3],['Payments','/business/payments',CircleDollarSign]] },
]

const defaultChannels = [
  { role:'creator', name:'Amara Bat', sub:'Creator Channel', avatar:'AB', to:'/creator/dashboard' },
  { role:'business', name:'Northstar Studio', sub:'Business Channel', avatar:'NS', to:'/business/dashboard' },
]

function HeaderProfileMenu({ role, channels=defaultChannels, profile }) {
  const [open,setOpen]=useState(false)
  const navigate=useNavigate()
  const {logout}=useAuth()
  const accent=role==='creator'?'pink':'mint'
  const select=(item)=>{setOpen(false);navigate(item.to)}
  const signOut=async()=>{setOpen(false);await logout();navigate('/login',{replace:true})}
  return <div onPointerEnter={(event)=>{if(event.pointerType==='mouse')setOpen(true)}} onPointerLeave={(event)=>{if(event.pointerType==='mouse')setOpen(false)}} className="relative">
    <button aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(!open)} className="flex items-center gap-2 rounded-full border-l border-white/10 py-1 pl-3 pr-2 text-left transition hover:bg-white/[.05] sm:gap-3 sm:pl-4">
      <Avatar src={profile.image} size="sm" fallback={profile.avatar}/>
      <span className="hidden min-w-0 sm:block"><strong className="block max-w-36 truncate text-xs">{profile.name}</strong><small className="block text-[9px] text-white/35">{profile.sub}</small></span>
      <ChevronDown size={13} className={`text-white/35 transition ${open?'rotate-180':''}`}/>
    </button>
    <AnimatePresence>{open&&<motion.div role="menu" initial={{opacity:0,y:-7,scale:.98}} animate={{opacity:1,y:7,scale:1}} exit={{opacity:0,y:-5,scale:.985}} className="absolute right-0 z-50 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#181818]/95 p-2 shadow-float backdrop-blur-xl">
      <p className="px-3 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[.14em] text-white/25">Switch channel</p>
      {channels.map((item)=><button role="menuitem" key={item.role} onClick={()=>select(item)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.06]"><Avatar src={item.image} size="sm" fallback={item.avatar}/><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{item.name}</strong><small className="text-[10px] text-white/35">{item.sub}</small></span>{item.role===role&&<Check size={14} className={accent==='pink'?'text-pink':'text-mint'}/>}</button>)}
      <div className="my-1 border-t border-white/10 pt-1">
        <button role="menuitem" onClick={()=>{setOpen(false);navigate('/account')}} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-white/50 transition hover:bg-white/[.05] hover:text-white"><Users size={14}/>My account</button>
        <button role="menuitem" onClick={()=>{setOpen(false);navigate(`/${role}/settings`)}} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-white/50 transition hover:bg-white/[.05] hover:text-white"><Settings size={14}/>Channel settings</button>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <button role="menuitem" onClick={()=>{setOpen(false);navigate('/discover')}} className="group rounded-xl border border-white/10 bg-white/[.035] p-3 text-left transition hover:border-white/20 hover:bg-white/[.06]">
          <span className={`grid size-8 place-items-center rounded-full text-black ${accent==='pink'?'bg-pink':'bg-mint'}`}><Search size={14}/></span>
          <strong className="mt-3 block text-[11px]">Discover</strong>
          <small className="mt-1 block text-[9px] leading-4 text-white/35">Talent, brands and campaigns</small>
        </button>
        <button role="menuitem" onClick={()=>{setOpen(false);navigate('/showcase')}} className="group rounded-xl border border-white/10 bg-white/[.035] p-3 text-left transition hover:border-white/20 hover:bg-white/[.06]">
          <span className={`grid size-8 place-items-center rounded-full border ${accent==='pink'?'border-pink/25 bg-pink/10 text-pink':'border-mint/25 bg-mint/10 text-mint'}`}><FolderOpen size={14}/></span>
          <strong className="mt-3 block text-[11px]">Showcase</strong>
          <small className="mt-1 block text-[9px] leading-4 text-white/35">Creator content feed</small>
        </button>
      </div>
      <button role="menuitem" onClick={signOut} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-[#ef7189]/20 px-3 py-2.5 text-left text-xs text-[#ef7189] transition hover:bg-[#ef7189]/10"><LogOut size={14}/>Log out</button>
    </motion.div>}</AnimatePresence>
  </div>
}

function DashboardNavigation({ sections, role, collapsed=false, close }) {
  const activeClass=role==='creator'
    ? 'bg-pink !text-[#10070d] font-semibold'
    : 'bg-mint !text-[#07110c] font-semibold'
  return <nav className="flex-1 space-y-5 px-3 pb-5">{sections.map((section)=><section key={section.label}><p className={`mb-2 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-white/20 ${collapsed?'sr-only':''}`}>{section.label}</p><div className="space-y-1">{section.items.map(([label,to,Icon])=><SidebarNavItem key={`${to}:${collapsed}`} label={label} to={to} icon={Icon} end={to.endsWith('dashboard')} onNavigate={close} collapsed={collapsed} activeClass={activeClass}/>)}</div></section>)}</nav>
}

export function DashboardLayout({ role }) {
  const [sidebarHovered,setSidebarHovered]=useState(false)
  const [sidebarFocused,setSidebarFocused]=useState(false)
  const [sidebarPinned,setSidebarPinned]=useState(false)
  const [mobileOpen,setMobileOpen]=useState(false)
  const [searchQuery,setSearchQuery]=useState('')
  const navigate=useNavigate()
  const location=useLocation()
  const {notifications}=useCollaboration()
  const {account}=useMarketplace()
  const {hasRole}=useAuth()
  const channels=defaultChannels.filter((item)=>hasRole(item.role)).map((item)=>item.role==='creator'?{...item,name:account.creator.name||item.name,avatar:account.creator.name?.split(' ').map((part)=>part[0]).join('').slice(0,2)||item.avatar,image:account.creator.avatar}: {...item,name:account.business.name||item.name,avatar:account.business.name?.split(' ').map((part)=>part[0]).join('').slice(0,2)||item.avatar,image:account.business.logo})
  const sections=role==='creator'?creatorSections:businessSections
  const profile=channels.find((item)=>item.role===role)
  const crumbs=location.pathname.split('/').filter(Boolean).slice(1)
  const accent=role==='creator'?'pink':'mint'
  const unreadCount=notifications.filter((item)=>item.role===role&&item.unread).length
  const sidebarExpanded=sidebarPinned||sidebarHovered||sidebarFocused
  const collapsed=!sidebarExpanded
  useEffect(()=>{
    try { window.localStorage.setItem('vyra:last-dashboard-role', role) } catch { /* Login can still use role priority. */ }
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
      <div className={`pt-4 ${collapsed?'text-center':'px-4'}`}>
        <Badge
          variant={accent}
          className={collapsed ? undefined : 'max-w-full overflow-hidden whitespace-nowrap'}
        >
          {collapsed
            ? (role==='creator'?'C':'B')
            : <TextType
                text={`${profile.sub} workspace`}
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
        <button aria-label="Open navigation" className="grid size-10 place-items-center rounded-full border border-white/10 lg:hidden" onClick={()=>setMobileOpen(true)}><Menu size={18}/></button>
        <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[.12em] text-white/30 sm:flex"><button onClick={()=>navigate(`/${role}/dashboard`)} className="capitalize">{role}</button>{crumbs.map((item)=><span key={item} className="flex items-center gap-2"><i className="not-italic text-white/15">/</i><b className="max-w-40 truncate font-medium capitalize text-white/55">{item.replaceAll('-',' ')}</b></span>)}</div>
        <form onSubmit={(event)=>{event.preventDefault();if(searchQuery.trim())navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)}} role="search" className="relative ml-auto hidden w-full max-w-sm md:block"><Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"/><input value={searchQuery} onChange={(event)=>setSearchQuery(event.target.value)} aria-label={`Search ${role} dashboard`} placeholder="Search marketplace..." className={`h-10 w-full rounded-full border border-white/10 bg-white/[.04] pl-10 pr-4 text-xs outline-none ${role==='creator'?'focus:border-pink':'focus:border-mint'}`}/></form>
        <button aria-label={`Open notifications${unreadCount?` (${unreadCount} unread)`:''}`} onClick={()=>navigate(`/${role}/notifications`)} className="relative grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/[.06]"><Bell size={17}/>{unreadCount>0&&<i className={`absolute right-2 top-2 size-1.5 rounded-full ${role==='creator'?'bg-pink':'bg-mint'}`}/>}</button>
        <HeaderProfileMenu role={role} channels={channels} profile={profile}/>
      </header>
      <AnimatePresence mode="wait"><motion.div key={location.pathname} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.2}}><Outlet/></motion.div></AnimatePresence>
    </div>
    <AnimatePresence>{mobileOpen&&<><motion.div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm lg:hidden" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setMobileOpen(false)}/><motion.aside className="fixed inset-y-0 left-0 z-[90] flex w-[min(19rem,88vw)] flex-col overflow-y-auto border-r border-white/10 bg-[#101010] lg:hidden" initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}} transition={{type:'spring',stiffness:320,damping:32}}><div className="flex h-[70px] shrink-0 items-center justify-between border-b border-white/10 px-5"><BrandLogo className="text-white"/><button aria-label="Close navigation" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div><div className="px-4 py-4"><Badge variant={accent} className="max-w-full overflow-hidden whitespace-nowrap"><TextType text={`${profile.sub} workspace`} typingSpeed={9} initialDelay={0} loop={false} cursorCharacter="▍" cursorClassName={role==='creator'?'text-[#7d1f50]':'text-[#155b31]'}/></Badge></div><DashboardNavigation sections={sections} role={role} close={()=>setMobileOpen(false)}/></motion.aside></>}</AnimatePresence>
  </div>
}
