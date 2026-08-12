import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, FileSearch, Flag, LayoutDashboard, LogOut, Menu, Search, Settings, ShieldCheck, Users, X } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../BrandLogo'
import { Avatar, Badge } from '../ui'
import { useAuth } from '../../context/auth-context'
import { SidebarNavItem } from '../navigation/SidebarNavItem'
import { LanguageSwitcher } from '../navigation/LanguageSwitcher'
import { useLanguage } from '../../context/language-context'
import { adminApi, notificationApi } from '../../api/dashboard.api'

const sections=[
  {label:'admin.overview',items:[['admin.dashboard','/admin/dashboard',LayoutDashboard]]},
  {label:'admin.management',items:[['admin.managementCenter','/admin/users',Users]]},
  {label:'admin.finance',items:[['admin.financeCenter','/admin/finance',CircleDollarSign]]},
  {label:'admin.trustSafety',items:[['admin.reports','/admin/reports',Flag],['admin.verifications','/admin/verifications',ShieldCheck]]},
  {label:'admin.system',items:[['admin.operations','/admin/operations',ShieldCheck],['admin.announcements','/admin/notifications',Bell],['admin.auditLogs','/admin/audit-logs',FileSearch],['common.settings','/admin/settings',Settings]]},
]

const caseHref={DISPUTE:'/admin/disputes',REPORT:'/admin/reports',MODERATION:'/admin/content-moderation',VERIFICATION:'/admin/verifications'}
const relativeTime=(value)=>{
  if(!value)return ''
  const seconds=Math.round((new Date(value).getTime()-Date.now())/1000)
  const ranges=[['year',31536000],['month',2592000],['day',86400],['hour',3600],['minute',60]]
  const [unit,size]=ranges.find(([,amount])=>Math.abs(seconds)>=amount)||['second',1]
  return new Intl.RelativeTimeFormat('en',{numeric:'auto'}).format(Math.round(seconds/size),unit)
}
const initials=(value='Administrator')=>value.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]).join('').toUpperCase()
const noticeStyle=(item)=>{
  const value=`${item.type||''} ${item.title||''}`.toUpperCase()
  if(value.includes('PAYOUT')||value.includes('PAYMENT'))return {icon:CircleDollarSign,tone:'pink'}
  if(value.includes('VERIFICATION'))return {icon:ShieldCheck,tone:'mint'}
  if(value.includes('REPORT')||value.includes('DISPUTE')||value.includes('MODERATION'))return {icon:Flag,tone:'danger'}
  return {icon:Bell,tone:'pink'}
}

function AdminNav({collapsed=false,onNavigate}){
  const location=useLocation()
  const {t}=useLanguage()
  const managementActive=/^\/admin\/(users|channels|creators|businesses|campaigns|contracts)(\/|$)/.test(location.pathname)
  return <nav className="min-h-0 flex-1 space-y-3 px-3 pb-3">{sections.map((section)=><section key={section.label}><p className={`mb-1.5 px-3 text-[8px] font-bold uppercase tracking-[.15em] text-white/20 ${collapsed?'sr-only':''}`}>{t(section.label)}</p><div className="space-y-0.5">{section.items.map(([label,to,Icon])=><SidebarNavItem key={`${to}:${collapsed}`} label={t(label)} to={to} icon={Icon} onNavigate={onNavigate} collapsed={collapsed} activeClass="bg-pink text-black" forceActive={label==='admin.managementCenter'&&managementActive}/>)}</div></section>)}</nav>
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
  const {signOut,user}=useAuth()
  const {t}=useLanguage()
  const [notices,setNotices]=useState({items:[],unreadCount:0,loading:false,error:''})
  const crumbs=location.pathname.split('/').filter(Boolean).slice(1)
  const sidebarExpanded=sidebarPinned||sidebarHovered||sidebarFocused
  const collapsed=!sidebarExpanded
  const adminName=user?.displayName||user?.name||user?.email?.split('@')[0]||'Administrator'
  const adminRole=(user?.roles||[]).map((role)=>role.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase())).join(' · ')||'Administrator'
  const loadNotices=useCallback(async()=>{
    setNotices((current)=>({...current,loading:true,error:''}))
    const [caseResult,payoutResult,notificationResult]=await Promise.allSettled([
      adminApi.list('cases',{status:'OPEN',page:1,limit:5}),
      adminApi.financeList('payouts',{status:'PENDING',page:1,limit:5}),
      notificationApi.list({page:1,limit:5}),
    ])
    const cases=caseResult.status==='fulfilled'?(caseResult.value.items||[]).map((item)=>({id:`case-${item.id}`,type:item.kind,title:`${String(item.kind||'Case').replaceAll('_',' ')} needs review`,copy:item.reason||`${item.targetType} requires an administrator decision.`,createdAt:item.createdAt,href:caseHref[item.kind]||'/admin/operations',unread:true})):[]
    const payouts=payoutResult.status==='fulfilled'?(payoutResult.value.items||[]).map((item)=>({id:`payout-${item.id}`,type:'PAYOUT',title:'Payout request pending',copy:`${item.creator?.channelName||'Creator'} · ${Number(item.amount||0).toLocaleString()} ${item.payment?.currency||'MNT'}`,createdAt:item.createdAt,href:'/admin/finance/wallet',unread:true})):[]
    const accountNotices=notificationResult.status==='fulfilled'?(notificationResult.value.items||[]).map((item)=>({...item,id:`notification-${item.id}`,notificationId:item.id,copy:item.body})):[]
    const items=[...cases,...payouts,...accountNotices].sort((left,right)=>new Date(right.createdAt||0)-new Date(left.createdAt||0)).slice(0,6)
    const failed=[caseResult,payoutResult,notificationResult].every((result)=>result.status==='rejected')
    setNotices({items,unreadCount:items.filter((item)=>item.unread).length,loading:false,error:failed?'Live notifications could not be loaded.':''})
  },[])
  useEffect(()=>{
    const timer=window.setTimeout(loadNotices,0)
    return()=>window.clearTimeout(timer)
  },[loadNotices])
  const showNotices=()=>{
    if(!notice)loadNotices()
    setNotice(true)
  }
  const toggleNotices=()=>{
    if(!notice)loadNotices()
    setNotice((value)=>!value)
  }
  const openNotice=(item)=>{
    if(item.notificationId&&item.unread)notificationApi.read(item.notificationId).catch(()=>{})
    setNotice(false)
    navigate(item.href||'/admin/notifications')
  }
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
      <div className={`py-3 ${collapsed?'text-center':'px-5'}`}><Badge variant="pink">{collapsed?'A':t('admin.console')}</Badge></div>
      <AdminNav collapsed={collapsed}/>
    </aside>
    <div className={`transition-[padding] duration-300 ${sidebarPinned?'lg:pl-[17.5rem]':'lg:pl-[5.25rem]'}`}>
      <header className="admin-topbar">
        <button aria-label="Open admin navigation" onClick={()=>setMobile(true)} className="grid size-10 place-items-center rounded-full border border-white/10 lg:hidden"><Menu size={18}/></button>
        <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[.12em] text-white/30 sm:flex"><button onClick={()=>navigate('/admin/dashboard')}>Admin</button>{crumbs.map((item)=><span key={item} className="flex items-center gap-2"><i className="not-italic text-white/15">/</i><b className="max-w-40 truncate font-medium capitalize text-white/55">{item.replaceAll('-',' ')}</b></span>)}</div>
        <form onSubmit={(event)=>{event.preventDefault();navigate(search.trim()?`/admin/search?q=${encodeURIComponent(search.trim())}`:'/admin/search')}} role="search" className="relative ml-auto hidden w-full max-w-sm md:block"><Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"/><input aria-label={t('common.search')} value={search} onChange={(event)=>setSearch(event.target.value)} placeholder={t('admin.searchPlaceholder')} className="h-10 w-full rounded-full border border-white/10 bg-white/[.04] pl-10 pr-4 text-xs outline-none focus:border-pink"/></form>

        <div onPointerEnter={(event)=>{if(event.pointerType==='mouse')showNotices()}} onPointerLeave={(event)=>{if(event.pointerType==='mouse')setNotice(false)}} className="relative">
          <button aria-label="Open notifications" aria-expanded={notice} onClick={toggleNotices} className={`relative grid size-10 place-items-center rounded-full border transition ${notice?'border-pink/50 bg-pink/10 text-white':'border-transparent text-white/65 hover:bg-white/[.06] hover:text-white'}`}><Bell size={17}/>{notices.unreadCount>0&&<i className="absolute right-2 top-2 size-1.5 rounded-full bg-pink ring-2 ring-[#0d0d0d]"/>}</button>
          <AnimatePresence>{notice&&<motion.div initial={{opacity:0,y:-8,scale:.97}} animate={{opacity:1,y:7,scale:1}} exit={{opacity:0,y:-5,scale:.985}} transition={{duration:.18}} className="absolute right-0 z-50 w-[min(23rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#171717]/95 shadow-[0_28px_80px_rgba(0,0,0,.45)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-sm font-bold">{t('common.notifications')}</p><small className="mt-1 block text-[10px] text-white/35">{t('admin.notificationCopy')}</small></div><Badge variant="pink">{t('admin.newCount', { count: notices.unreadCount })}</Badge></div>
            <div className="space-y-1 p-2">{notices.loading?<p className="px-3 py-6 text-center text-[10px] text-white/35">Loading live notifications…</p>:notices.error?<p role="alert" className="px-3 py-6 text-center text-[10px] text-red-200">{notices.error}</p>:notices.items.length?notices.items.map((item)=>{const {icon:Icon,tone}=noticeStyle(item);return <button key={item.id} onClick={()=>openNotice(item)} className="group flex w-full items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-white/[.055]"><span className={`grid size-10 shrink-0 place-items-center rounded-xl border ${tone==='danger'?'border-[#ef7189]/25 bg-[#ef7189]/10 text-[#ef7189]':tone==='mint'?'border-mint/20 bg-mint/10 text-mint':'border-pink/20 bg-pink/10 text-pink'}`}><Icon size={16}/></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><strong className="text-xs text-white/85">{item.title}</strong><time className="shrink-0 text-[9px] text-white/25">{relativeTime(item.createdAt)}</time></span><small className="mt-1.5 line-clamp-2 block text-[10px] leading-4 text-white/35 group-hover:text-white/50">{item.copy}</small></span>{item.unread&&<i className="mt-1 size-1.5 shrink-0 rounded-full bg-pink"/>}</button>}):<p className="px-3 py-6 text-center text-[10px] text-white/35">No open admin notifications.</p>}</div>
            <button onClick={()=>{setNotice(false);navigate('/admin/notifications')}} className="w-full border-t border-white/10 px-5 py-3 text-center text-[10px] font-bold uppercase tracking-[.12em] text-white/40 transition hover:bg-white/[.035] hover:text-white">{t('admin.openNotificationCenter')}</button>
          </motion.div>}</AnimatePresence>
        </div>

        <div onPointerEnter={(event)=>{if(event.pointerType==='mouse')setProfile(true)}} onPointerLeave={(event)=>{if(event.pointerType==='mouse')setProfile(false)}} className="relative">
          <button aria-haspopup="menu" aria-expanded={profile} onClick={()=>setProfile(!profile)} className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-white/[.05]"><Avatar size="sm" src={user?.avatarUrl} alt={adminName} fallback={initials(adminName)}/><span className="hidden text-left sm:block"><strong className="block max-w-32 truncate text-xs">{adminName}</strong><small className="block max-w-32 truncate text-[9px] text-white/30">{adminRole}</small></span><ChevronDown size={13} className={`transition ${profile?'rotate-180':''}`}/></button>
          <AnimatePresence>{profile&&<motion.div role="menu" initial={{opacity:0,y:-8,scale:.98}} animate={{opacity:1,y:6,scale:1}} exit={{opacity:0,y:-5,scale:.985}} className="absolute right-0 z-50 w-52 rounded-2xl border border-white/10 bg-[#171717]/95 p-2 shadow-float backdrop-blur-xl"><div className="mb-1 border-b border-white/10 px-3 py-3"><strong className="block truncate text-xs">{adminName}</strong><small className="block truncate text-[9px] text-white/35">{user?.email||adminRole}</small></div><button role="menuitem" onClick={()=>navigate('/admin/settings')} className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-white/55 transition hover:bg-white/[.05] hover:text-white">{t('admin.adminSettings')}</button><button role="menuitem" onClick={()=>navigate('/showcase')} className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-white/55 transition hover:bg-white/[.05] hover:text-white">{t('admin.viewShowcase')}</button><button role="menuitem" onClick={()=>{signOut();navigate('/login',{replace:true})}} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-[#ef7189] transition hover:bg-[#ef7189]/10"><LogOut size={14}/>{t('common.signOut')}</button></motion.div>}</AnimatePresence>
        </div>
        <LanguageSwitcher compact />
      </header>
      <Outlet/>
    </div>
    <AnimatePresence>{mobile&&<><motion.div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setMobile(false)}/><motion.aside className="fixed inset-y-0 left-0 z-[90] w-[min(18rem,88vw)] overflow-y-auto border-r border-white/10 bg-[#101010]" initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}}><div className="flex h-[70px] items-center justify-between border-b border-white/10 px-5"><BrandLogo className="text-white"/><button aria-label="Close admin navigation" onClick={()=>setMobile(false)}><X size={18}/></button></div><div className="py-4"><AdminNav onNavigate={()=>setMobile(false)}/></div></motion.aside></>}</AnimatePresence>
  </div>
}
