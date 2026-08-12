import { Activity, ArrowDownRight, BarChart3, Bell, BriefcaseBusiness, CalendarDays, CircleDollarSign, FileSignature, FolderKanban, Gauge, Image, Inbox, LayoutDashboard, MessageSquare, Settings, ShieldCheck, TrendingUp, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button } from '../ui'

export function DashboardPage({ children, className='' }) { return <main className={`mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10 ${className}`}>{children}</main> }

function DashboardGlyph({ label='', size=14 }) {
  const value=String(label)
  if (/message|inbox|chat/i.test(value)) return <MessageSquare size={size}/>
  if (/notification|alert/i.test(value)) return <Bell size={size}/>
  if (/campaign/i.test(value)) return <BriefcaseBusiness size={size}/>
  if (/creator|participant|audience|follower/i.test(value)) return <Users size={size}/>
  if (/request|proposal|response|submission|decision/i.test(value)) return <Inbox size={size}/>
  if (/contract|agreement|signature/i.test(value)) return <FileSignature size={size}/>
  if (/payment|wallet|funding|balance|earning|payout|transaction|finance/i.test(value)) return <CircleDollarSign size={size}/>
  if (/analytic|performance|reach|engagement|metric|insight/i.test(value)) return <BarChart3 size={size}/>
  if (/deadline|calendar|schedule/i.test(value)) return <CalendarDays size={size}/>
  if (/portfolio|post|content|media|gallery/i.test(value)) return <Image size={size}/>
  if (/collaboration|workspace|project|deliverable/i.test(value)) return <FolderKanban size={size}/>
  if (/security|privacy|verification/i.test(value)) return <ShieldCheck size={size}/>
  if (/setting|profile|channel/i.test(value)) return <Settings size={size}/>
  if (/activity|recent|timeline/i.test(value)) return <Activity size={size}/>
  if (/compare|score|progress/i.test(value)) return <Gauge size={size}/>
  if (/account|user/i.test(value)) return <UserRound size={size}/>
  return <LayoutDashboard size={size}/>
}

export function DashboardTitleIcon({ label, accent='pink', size='sm' }) {
  const dimensions=size==='lg'?'size-11 rounded-xl':'size-8 rounded-lg'
  const iconSize=size==='lg'?19:14
  return <span aria-hidden="true" className={`dashboard-title-icon grid shrink-0 place-items-center ${dimensions} ${accent==='mint'?'dashboard-title-icon-mint':''}`}><DashboardGlyph label={label} size={iconSize}/></span>
}

export function DashboardHeader({ eyebrow, title, copy, action, secondary, accent='pink' }) { return <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="min-w-0"><p className="eyebrow text-white/30">{eyebrow}</p><div className="mt-3 flex items-center gap-3"><DashboardTitleIcon label={title} accent={accent} size="lg"/><h1 className="min-w-0 break-words text-4xl font-bold tracking-[-.06em] sm:text-5xl">{title}</h1></div>{copy&&<p className="mt-3 max-w-xl text-sm leading-6 text-white/45">{copy}</p>}</div><div className="flex shrink-0 flex-wrap gap-2">{secondary}{action}</div></div> }
export function MetricCard({ metric, accent='pink' }) { const up=metric.trend==='up'; return <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-white/20"><div className="flex items-start justify-between gap-3"><p className="truncate text-xs text-white/40">{metric.label}</p><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${accent==='mint'?'bg-mint/10 text-mint':'bg-pink/10 text-pink'}`}><DashboardGlyph label={metric.label} size={15}/></span></div><strong className="mt-6 block truncate text-3xl tracking-[-.055em]">{metric.value}</strong><span className={`mt-2 flex items-center gap-1 text-[11px] ${up?'text-mint':'text-white/35'}`}>{up?<TrendingUp size={12}/>:null}{metric.change}</span></article> }
export function DashboardPanel({ title, eyebrow, action, children, className='', accent='pink' }) { return <section className={`min-w-0 rounded-[1.4rem] border border-white/10 bg-white/[.028] p-5 ${className}`}><div className="mb-5 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><DashboardTitleIcon label={title} accent={accent}/><div className="min-w-0">{eyebrow&&<p className="eyebrow truncate text-white/25">{eyebrow}</p>}<h2 className={`${eyebrow?'mt-1':''} truncate text-base font-bold tracking-[-.025em]`}>{title}</h2></div></div>{action&&<div className="shrink-0">{action}</div>}</div>{children}</section> }
export function StatusBadge({ status }) { const positive=['Active','Available','Shortlisted','Completed','Approved','Verified','Paid','Success','Escrow funded','Released'];const attention=['New','Awaiting signature','Review','Reviewing','Pending','Open','Under Review','Payment required','Awaiting review'];const variant=positive.includes(status)?'mint':attention.includes(status)?'pink':'outline';return <Badge variant={variant}>{status}</Badge> }

export function LineChart({ data, area=false, color='#ff76bd', height=190 }) { const max=Math.max(...data); const min=Math.min(...data); const points=data.map((value,index)=>`${(index/(data.length-1))*100},${height-18-((value-min)/(max-min||1))*(height-38)}`).join(' '); const areaPoints=`0,${height} ${points} 100,${height}`; return <div className="dashboard-chart relative w-full overflow-hidden" style={{height}}><svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="size-full">{area&&<polygon points={areaPoints} fill={color} opacity=".12"/>}<polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"/><line x1="0" y1={height-1} x2="100" y2={height-1} stroke="rgba(255,255,255,.1)"/></svg></div> }
export function BarChart({ data, color='#bbf7d0', height=190 }) { const max=Math.max(...data);return <div className="dashboard-chart flex items-end gap-2" style={{height}}>{data.map((value,index)=><div key={index} className="group relative flex-1 rounded-t-md bg-white/[.055]" style={{height:`${Math.max(8,(value/max)*100)}%`}}><i className="absolute inset-0 rounded-t-md opacity-70 transition group-hover:opacity-100" style={{background:color}}/></div>)}</div> }
export function DateFilter({ value, onChange, compact = false }) {
  const [internalValue, setInternalValue] = useState('1M')
  const active = value || internalValue
  const select = (nextValue) => {
    if (onChange) onChange(nextValue)
    else setInternalValue(nextValue)
  }
  const options = [['1D', '1d'], ['7D', '7d'], ['1M', '1m'], ['1Y', '1y'], ['ALL', 'All']]
  return <div className={`dashboard-date-filter ${compact?'is-compact':''} inline-flex min-h-9 rounded-lg border border-white/10 bg-white/[.035] p-0.5 shadow-inner shadow-black/10`}>{options.map(([item,label])=><button type="button" aria-pressed={active===item} onClick={()=>select(item)} key={item} className={`rounded-md ${compact?'px-1.5':'px-2'} py-0.5 tracking-[.01em] transition ${active===item?'bg-white text-black shadow-sm':'text-white/40 hover:bg-white/[.06] hover:text-white'}`}>{label}</button>)}</div>
}

export function DeadlineList({ items }) { return <div className="space-y-1">{items.map((item)=><div key={item.title} className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/[.04]"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pink-soft text-center text-[9px] font-bold leading-3 text-[#7d1f50]">{item.date}</span><span className="flex-1"><strong className="block text-xs">{item.title}</strong><small className="mt-1 flex items-center gap-1 text-white/35"><CalendarDays size={10}/>{item.type}</small></span><ArrowDownRight size={14} className="text-white/25"/></div>)}</div> }
export function Progress({ value, color='pink' }) { return <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${color==='mint'?'bg-mint':'bg-pink'}`} style={{width:`${value}%`}}/></div> }
export function QuickAction({ icon:Icon, label, onClick }) { return <Button variant="outline" className="min-h-24 flex-col rounded-2xl" onClick={onClick}><Icon size={19}/>{label}</Button> }
