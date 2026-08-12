import { useState } from 'react'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button, Input, Select, Switch } from '../ui'

const creatorFields = [
  ['niche','Niche',['All niches','Fashion','Beauty','Food','Travel','Gaming','Technology','Sport','Lifestyle']],
  ['platform','Platform',['All platforms','Instagram','TikTok','YouTube','Facebook','Twitch']],
  ['followers','Follower range',['Any audience','Under 100K','100K–250K','250K+']],
  ['engagement','Engagement rate',['Any rate','5%+','7%+','9%+']],
  ['rating','Rating',['Any rating','4.5+','4.8+']],
  ['price','Starting price',['Any price','Under ₮1.5M','₮1.5M–₮2M','₮2M+']],
  ['currency','Currency',['Any currency','MNT','USD']],
]
const campaignFields = [
  ['niche','Niche',['All niches','Fashion','Beauty','Food','Travel','Technology','Lifestyle','Music']],
  ['budget','Budget',['Any budget','Under ₮5M','₮5M–₮10M','₮10M+']],
  ['goal','Campaign goal',['Any goal','Awareness','Product launch','Education','App adoption']],
  ['platform','Platform',['All platforms','Instagram','TikTok','YouTube']],
  ['deadline','Deadline',['Any deadline','Next 14 days','Next 30 days','Later']],
]
const businessFields = [
  ['industry','Industry',['All industries','Fashion & Apparel','Beauty & Wellness','Travel & Aviation','Technology & Commerce','Music & Culture']],
  ['rating','Rating',['Any rating','4.5+','4.8+']],
  ['completed','Completed collaborations',['Any amount','1+','3+','5+']],
]

export function FilterSidebar({ type, filters, setFilters, className='', compact=false, horizontal=false }) {
  const [moreOpen,setMoreOpen]=useState(false)
  const fields=type==='creator'?creatorFields:type==='campaign'?campaignFields:businessFields
  const update=(name)=>(event)=>setFilters((value)=>({...value,[name]:event.target.value}))
  const activeCount=Object.values(filters).filter(Boolean).length
  const primaryFields=horizontal||compact?fields:fields.slice(0,3)
  const extraFields=horizontal||compact?[]:fields.slice(3)
  const textFields=type==='creator'?[['location','Location'],['language','Language'],['skills','Skills (comma separated)']]:type==='business'?[['location','Location']]:[]
  const extraActiveCount=[...extraFields,...textFields].filter(([name])=>Boolean(filters[name])).length
  const renderField=([name,label,options])=><Select key={name} label={compact?undefined:label} aria-label={label} value={filters[name]||''} onChange={update(name)} options={options.slice(1).map((item)=>({label:item,value:item}))} placeholder={options[0]}/>
  return <aside aria-label={`${type} filters`} className={`border border-white/10 bg-[#151515]/90 ${compact&&horizontal?'rounded-xl p-1.5':compact?'rounded-[1.4rem] p-3':'rounded-[1.4rem] p-4'} ${className}`}>
    {!(compact&&horizontal)&&<div className={`${compact?'mb-3':'mb-5'} flex items-center justify-between gap-3 border-b border-white/[.07] pb-3`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[.06] text-white/65"><SlidersHorizontal size={compact?13:14}/></span>
        <span>
          <strong className={`block ${compact?'text-xs':'text-sm'}`}>Refine results</strong>
          {!compact&&<small className="text-[10px] text-white/30">{activeCount ? `${activeCount} active` : 'All filters optional'}</small>}
        </span>
      </div>
      {activeCount>0&&<button type="button" onClick={()=>setFilters({})} className="rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-pink transition hover:bg-pink/10">Clear</button>}
    </div>}
    <div className={`${horizontal?(compact?'grid gap-1.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6':'grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6'):'space-y-2.5'} ${compact&&horizontal?'[&_.ui-field]:!min-h-8 [&_.ui-field]:!rounded-lg [&_.ui-field]:!px-2.5 [&_.ui-field]:!py-1.5 [&_.ui-field]:!text-[10px]':'[&_.ui-field]:min-h-9 [&_.ui-field]:rounded-xl [&_.ui-field]:py-2 [&_.ui-field]:text-[11px]'} [&_.ui-label]:mb-1 [&_.ui-label]:text-[9px] [&_.ui-label]:uppercase [&_.ui-label]:tracking-[.08em] [&_.ui-label]:text-white/35`}>
      {primaryFields.map(renderField)}
      {(extraFields.length>0||(!horizontal&&textFields.length>0))&&<button type="button" aria-expanded={moreOpen} onClick={()=>setMoreOpen((value)=>!value)} className="flex min-h-9 w-full items-center justify-between rounded-xl border border-white/[.08] bg-white/[.025] px-3 text-[10px] font-bold text-white/45 transition hover:border-white/20 hover:text-white">
        <span>More filters{extraActiveCount>0?` · ${extraActiveCount} active`:''}</span>
        <ChevronDown size={13} className={`transition ${moreOpen?'rotate-180':''}`}/>
      </button>}
      {moreOpen&&extraFields.map(renderField)}
      {!horizontal&&moreOpen&&textFields.map(([name,label])=><Input key={name} label={compact?undefined:label} aria-label={label} value={filters[name]||''} onChange={update(name)} placeholder={label}/>) }
      {(type==='creator'||type==='business')&&<Switch compact={compact} label="Verified only" checked={Boolean(filters.verified)} onChange={(event)=>setFilters((value)=>({...value,verified:event.target.checked}))}/>}
      {type==='creator'&&<Switch compact={compact} label="Available now" checked={Boolean(filters.available)} onChange={(event)=>setFilters((value)=>({...value,available:event.target.checked}))}/>}
      {type==='campaign'&&<Switch compact={compact} label="Open only" checked={Boolean(filters.open)} onChange={(event)=>setFilters((value)=>({...value,open:event.target.checked}))}/>}
    </div>
  </aside>
}

export function SearchBar({ type, value, onChange, placeholder, count, onMobileFilters, sort, setSort, compact=false, showFilters=true }) {
  const sortOptions=type==='creator'
    ? [{label:'Recommended for you',value:'recommended'},{label:'Trending',value:'trending'},{label:'Most followed',value:'most_followed'},{label:'Highest rated',value:'highest_rated'},{label:'Newest channels',value:'newest'},{label:'Price: low to high',value:'price_low'},{label:'Price: high to low',value:'price_high'},{label:'Alphabetical',value:'alphabetical'}]
    : type==='business'
      ? [{label:'Recommended for you',value:'recommended'},{label:'Trending',value:'trending'},{label:'Highest rated',value:'highest_rated'},{label:'Newest channels',value:'newest'},{label:'Alphabetical',value:'alphabetical'}]
      : [{label:'Recommended for you',value:'recommended'},{label:'Newest campaigns',value:'newest'}]
  return <div className={`${compact?'mb-1 gap-1.5 rounded-xl p-1.5 [&_.ui-field]:!min-h-9 [&_.ui-field]:!rounded-lg [&_.ui-field]:!py-1.5':'mb-4 gap-2 rounded-[1.25rem] p-2.5'} flex flex-col border border-white/10 bg-white/[.035] shadow-[0_16px_45px_rgba(0,0,0,.16)] sm:flex-row sm:items-center`}>
    <div className="relative min-w-0 flex-1">
      <Input aria-label={placeholder} value={value} onChange={(event)=>onChange(event.target.value)} placeholder={placeholder} className="[&_input]:border-transparent [&_input]:bg-black/20 [&_input]:pr-11 [&_input]:text-sm" />
      <Search aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/35" size={16} />
    </div>
    <span aria-live="polite" className="order-3 shrink-0 px-2 text-[9px] font-bold uppercase tracking-[.1em] text-white/35 sm:order-none">{count} results</span>
    <Select aria-label="Sort search results" value={sort} onChange={(event)=>setSort(event.target.value)} options={sortOptions} className={`search-sort w-full [&_.ui-field]:text-xs ${compact?'sm:w-40':'sm:w-48 [&_.ui-field]:min-h-10'}`}/>
    {showFilters&&<Button size="sm" variant="outline" className="lg:hidden" onClick={onMobileFilters}><SlidersHorizontal size={14}/> Filters</Button>}
  </div>
}

export function ActiveFilters({ filters, setFilters }) { const active=Object.entries(filters).filter(([,value])=>value); if(!active.length)return null; return <div className="mb-5 flex flex-wrap gap-2">{active.map(([name,value])=><button key={name} onClick={()=>setFilters((items)=>({...items,[name]:typeof value==='boolean'?false:''}))} className="inline-flex items-center gap-1 rounded-full bg-pink-soft px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#7d1f50]">{typeof value==='boolean'?name:value}<X size={11}/></button>)}</div> }
