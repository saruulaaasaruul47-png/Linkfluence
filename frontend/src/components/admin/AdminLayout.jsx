import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, FileSearch, Flag, LayoutDashboard, LogOut, Menu, MessageSquareWarning, Search, Settings, ShieldCheck, Star, Users, X } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../BrandLogo'
import { Avatar, Badge } from '../ui'
import { useAuth } from '../../context/auth-context'
import { SidebarNavItem } from '../navigation/SidebarNavItem'

const sections=[
  {label:'Overview',items:[['Dashboard','/admin/dashboard',LayoutDashboard]]},
  {label:'Management',items:[['Management center','/admin/users',Users]]},
  {label:'Finance',items:[['Finance center','/admin/payments',CircleDollarSign],['Refunds','/admin/refunds',ChevronLeft]]},
  {label:'Trust & Safety',items:[['Disputes','/admin/disputes',MessageSquareWarning],['Reports','/admin/reports',Flag],['Content moderation','/admin/content-moderation',FileSearch],['Verifications','/admin/verifications',ShieldCheck],['Reviews','/admin/reviews',Star]]},
  {label:'System',items:[['Operations','/admin/operations',ShieldCheck],['Announcements','/admin/notifications',Bell],['Audit logs','/admin/audit-logs',FileSearch],['Settings','/admin/settings',Settings]]},
]

const noticeItems=[
  {title:'Urgent reports need review',copy:'3 high-priority trust reports are waiting in the moderation queue.',time:'8 min',icon:Flag,tone:'danger'},
  {title:'Payment attempt failed',copy:'TX-8019 could not be processed. The payer has been notified.',time:'42 min',icon:CircleDollarSign,tone:'pink'},
  {title:'Verification queue updated',copy:'47 identity requests are ready for administrative review.',time:'1 hr',icon:ShieldCheck,tone:'mint'},
]

function AdminNav({collapsed=false,onNavigate}){
  const location=useLocation()
  const managementActive=/^\/admin\/(users|channels|creators|businesses|campaigns|contracts)(\/|$)/.test(location.pathname)
  return <nav className="flex-1 space-y-5 px-3 pb-5">{sections.map((section)=><section key={section.label}><p className={`mb-2 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-white/20 ${collapsed?'sr-only':''}`}>{section.label}</p><div className="space-y-1">{section.items.map(([label,to,Icon])=><SidebarNavItem key={`${to}:${collapsed}`} label={label} to={to} icon={Icon} onNavigate={onNavigate} collapsed={collapsed} activeClass="bg-pink text-black" forceActive={label==='Management center'&&managementActive}/>)}</div></section>)}</nav>
}

export function AdminLayout(){
  const [sidebarHovered,setSidebarHovered]=useState(false)
  const [sidebarFocused,setSidebarFocused]=useState(false)
  const [sidebarPinned,setSidebarPinned]=useState(false)
  const [mobile,setMobile]=useState(false)
  const [notice,setNotice]=useState(false)
  const [profile,setProfile]=useState(false)
  const [search,setSearch]=useState('')
  const location=useLocation()
  const navigate=useNavigate()
  const {signOut}=useAuth()
  const crumbs=location.pathname.split('/').filter(Boolean).slice(1)
  const sidebarExpanded=sidebarPinned||sidebarHovered||sidebarFocused
  const collapsed=!sidebarExpanded
  return <div data-theme="dark" className="admin-shell min-h-screen bg-[var(--background)] text-[var(--foreground)]">
    <aside
      className={`admin-sidebar hidden lg:flex ${collapsed?'w-[5.25rem]':'w-[17.5rem]'}`}
      onPointerEnter={(event)=>{if(event.pointerType==='mouse')setSidebarHovered(true)}}
      onPointerLeave={(event)=>{if(event.pointerType==='mouse')setSidebarHovered(false)}}
      onFocusCapture={(event)=>{if(event.target.matches(':focus-visible'))setSidebarFocused(true)}}
      onBlurCapture={(event)=>{if(!event.currentTarget.contains(event.relatedTarget))setSidebarFocused(false)}}
    >
      <div className={`flex h-[76px] items-center border-b border-white/10 ${collapsed?'justify-center gap-1 px-2':'justify-between px-5'}`}>
        {collapsed?<span className="font-serif text-xl font-black italic text-pink">V</span>:<BrandLogo className="text-white"/>}
        <button aria-label={sidebarPinned?'Unpin sidebar':'Pin sidebar open'} aria-pressed={sidebarPinned} onClick={()=>setSidebarPinned((value)=>!value)} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white/[.06]">{sidebarPinned?<ChevronLeft size={15}/>:<ChevronRight size={15}/>}</button>
      </div>
      <div className={`py-4 ${collapsed?'text-center':'px-5'}`}><Badge variant="pink">{collapsed?'A':'Admin console'}</Badge></div>
      <AdminNav collapsed={collapsed}/>
    </aside>
    <div className={`transition-[padding] duration-300 ${sidebarPinned?'lg:pl-[17.5rem]':'lg:pl-[5.25rem]'}`}>
      <header className="admin-topbar">
        <button aria-label="Open admin navigation" onClick={()=>setMobile(true)} className="grid size-10 place-items-center rounded-full border border-white/10 lg:hidden"><Menu size={18}/></button>
        <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[.12em] text-white/30 sm:flex"><button onClick={()=>navigate('/admin/dashboard')}>Admin</button>{crumbs.map((item)=><span key={item} className="flex items-center gap-2"><i className="not-italic text-white/15">/</i><b className="max-w-40 truncate font-medium capitalize text-white/55">{item.replaceAll('-',' ')}</b></span>)}</div>
        <form onSubmit={(event)=>{event.preventDefault();navigate(search.trim()?`/admin/search?q=${encodeURIComponent(search.trim())}`:'/admin/search')}} role="search" className="relative ml-auto hidden w-full max-w-sm md:block"><Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"/><input aria-label="Search admin workspace" value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search users, channels, contracts..." className="h-10 w-full rounded-full border border-white/10 bg-white/[.04] pl-10 pr-4 text-xs outline-none focus:border-pink"/></form>

        <div onPointerEnter={(event)=>{if(event.pointerType==='mouse')setNotice(true)}} onPointerLeave={(event)=>{if(event.pointerType==='mouse')setNotice(false)}} className="relative">
          <button aria-label="Open notifications" aria-expanded={notice} onClick={()=>setNotice(!notice)} className={`relative grid size-10 place-items-center rounded-full border transition ${notice?'border-pink/50 bg-pink/10 text-white':'border-transparent text-white/65 hover:bg-white/[.06] hover:text-white'}`}><Bell size={17}/><i className="absolute right-2 top-2 size-1.5 rounded-full bg-pink ring-2 ring-[#0d0d0d]"/></button>
          <AnimatePresence>{notice&&<motion.div initial={{opacity:0,y:-8,scale:.97}} animate={{opacity:1,y:7,scale:1}} exit={{opacity:0,y:-5,scale:.985}} transition={{duration:.18}} className="absolute right-0 z-50 w-[min(23rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#171717]/95 shadow-[0_28px_80px_rgba(0,0,0,.45)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-sm font-bold">Notifications</p><small className="mt-1 block text-[10px] text-white/35">Admin activity requiring attention</small></div><Badge variant="pink">3 new</Badge></div>
            <div className="space-y-1 p-2">{noticeItems.map((item)=>{const Icon=item.icon;return <button key={item.title} onClick={()=>setNotice(false)} className="group flex w-full items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-white/[.055]"><span className={`grid size-10 shrink-0 place-items-center rounded-xl border ${item.tone==='danger'?'border-[#ef7189]/25 bg-[#ef7189]/10 text-[#ef7189]':item.tone==='mint'?'border-mint/20 bg-mint/10 text-mint':'border-pink/20 bg-pink/10 text-pink'}`}><Icon size={16}/></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><strong className="text-xs text-white/85">{item.title}</strong><time className="shrink-0 text-[9px] text-white/25">{item.time}</time></span><small className="mt-1.5 line-clamp-2 block text-[10px] leading-4 text-white/35 group-hover:text-white/50">{item.copy}</small></span><i className="mt-1 size-1.5 shrink-0 rounded-full bg-pink"/></button>})}</div>
            <button onClick={()=>{setNotice(false);navigate('/admin/notifications')}} className="w-full border-t border-white/10 px-5 py-3 text-center text-[10px] font-bold uppercase tracking-[.12em] text-white/40 transition hover:bg-white/[.035] hover:text-white">Open notification center</button>
          </motion.div>}</AnimatePresence>
        </div>

        <div onPointerEnter={(event)=>{if(event.pointerType==='mouse')setProfile(true)}} onPointerLeave={(event)=>{if(event.pointerType==='mouse')setProfile(false)}} className="relative">
          <button aria-haspopup="menu" aria-expanded={profile} onClick={()=>setProfile(!profile)} className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-white/[.05]"><Avatar size="sm" fallback="BA"/><span className="hidden text-left sm:block"><strong className="block text-xs">Bolor Admin</strong><small className="text-[9px] text-white/30">Super Admin</small></span><ChevronDown size={13} className={`transition ${profile?'rotate-180':''}`}/></button>
          <AnimatePresence>{profile&&<motion.div role="menu" initial={{opacity:0,y:-8,scale:.98}} animate={{opacity:1,y:6,scale:1}} exit={{opacity:0,y:-5,scale:.985}} className="absolute right-0 z-50 w-52 rounded-2xl border border-white/10 bg-[#171717]/95 p-2 shadow-float backdrop-blur-xl"><div className="mb-1 border-b border-white/10 px-3 py-3"><strong className="block text-xs">Bolor Admin</strong><small className="text-[9px] text-white/35">bolor@influencehub.mn</small></div><button role="menuitem" onClick={()=>navigate('/admin/settings')} className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-white/55 transition hover:bg-white/[.05] hover:text-white">Admin settings</button><button role="menuitem" onClick={()=>navigate('/showcase')} className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-white/55 transition hover:bg-white/[.05] hover:text-white">View showcase</button><button role="menuitem" onClick={()=>{signOut();navigate('/login',{replace:true})}} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-[#ef7189] transition hover:bg-[#ef7189]/10"><LogOut size={14}/>Sign out</button></motion.div>}</AnimatePresence>
        </div>
      </header>
      <Outlet/>
    </div>
    <AnimatePresence>{mobile&&<><motion.div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setMobile(false)}/><motion.aside className="fixed inset-y-0 left-0 z-[90] w-[min(18rem,88vw)] overflow-y-auto border-r border-white/10 bg-[#101010]" initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}}><div className="flex h-[70px] items-center justify-between border-b border-white/10 px-5"><BrandLogo className="text-white"/><button aria-label="Close admin navigation" onClick={()=>setMobile(false)}><X size={18}/></button></div><div className="py-4"><AdminNav onNavigate={()=>setMobile(false)}/></div></motion.aside></>}</AnimatePresence>
  </div>
}
