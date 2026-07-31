import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

export function Dropdown({ label = 'Options', items = [], value, onChange }) {
  const [open,setOpen]=useState(false)
  const ref=useRef(null)
  useEffect(()=>{
    const close=(event)=>!ref.current?.contains(event.target)&&setOpen(false)
    document.addEventListener('pointerdown',close)
    return()=>document.removeEventListener('pointerdown',close)
  },[])
  const choose=(item)=>{onChange?.(item.value);setOpen(false)}
  return <div ref={ref} onPointerEnter={(event)=>{if(event.pointerType==='mouse')setOpen(true)}} onPointerLeave={(event)=>{if(event.pointerType==='mouse')setOpen(false)}} className="relative inline-block">
    <button aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen((current)=>!current)} className={`inline-flex min-h-11 items-center gap-2 rounded-full border bg-[var(--surface)] px-4 text-sm font-semibold transition ${open?'border-pink shadow-[0_0_0_4px_var(--focus)]':'border-[var(--border)] hover:border-pink/50'}`}>{label}<span className={`grid size-7 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--subtle)] transition ${open?'rotate-180 text-[var(--foreground)]':''}`}><ChevronDown size={14}/></span></button>
    <AnimatePresence>{open&&<motion.div role="menu" initial={{opacity:0,y:-6,scale:.98}} animate={{opacity:1,y:6,scale:1}} exit={{opacity:0,y:-4,scale:.985}} transition={{duration:.16}} className="absolute right-0 z-[75] min-w-56 overflow-hidden rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-1.5 text-[var(--foreground)] shadow-[0_22px_60px_rgba(0,0,0,.28)] backdrop-blur-xl">
      {items.map((item)=><button role="menuitemradio" aria-checked={value===item.value} key={item.value} onClick={()=>choose(item)} className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${value===item.value?'bg-pink/10 text-[var(--foreground)]':'text-[var(--subtle)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]'}`}><span className="truncate">{item.label}</span>{value===item.value&&<span className="grid size-6 shrink-0 place-items-center rounded-full bg-pink text-black"><Check size={12}/></span>}</button>)}
    </motion.div>}</AnimatePresence>
  </div>
}
