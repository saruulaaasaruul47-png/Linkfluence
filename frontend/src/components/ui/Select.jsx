import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export const Select = forwardRef(function Select({
  label,
  error,
  help,
  options = [],
  placeholder = 'Select an option',
  className,
  id,
  name,
  value,
  defaultValue = '',
  onChange,
  disabled = false,
  required = false,
  'aria-label': ariaLabel,
}, ref) {
  const generatedId = useId()
  const selectId = id || name || generatedId
  const listboxId = `${selectId}-listbox`
  const messageId = `${selectId}-message`
  const rootRef = useRef(null)
  const [open,setOpen]=useState(false)
  const [internalValue,setInternalValue]=useState(defaultValue)
  const normalized=useMemo(()=>options.map((option)=>typeof option==='string'?{label:option,value:option}:option),[options])
  const current=value===undefined?internalValue:value
  const selected=normalized.find((option)=>String(option.value)===String(current))
  const [activeIndex,setActiveIndex]=useState(Math.max(0,normalized.findIndex((option)=>String(option.value)===String(current))))

  useEffect(()=>{
    const close=(event)=>{if(!rootRef.current?.contains(event.target))setOpen(false)}
    document.addEventListener('pointerdown',close)
    return()=>document.removeEventListener('pointerdown',close)
  },[])

  const choose=(option)=>{
    if(option.disabled)return
    if(value===undefined)setInternalValue(option.value)
    onChange?.({target:{value:option.value,name,type:'select-one'}})
    setOpen(false)
  }
  const keydown=(event)=>{
    if(disabled)return
    if(event.key==='Escape'){setOpen(false);return}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault()
      setOpen(true)
      const step=event.key==='ArrowDown'?1:-1
      setActiveIndex((index)=>Math.max(0,Math.min(normalized.length-1,index+step)))
    }
    if((event.key==='Enter'||event.key===' ')&&open){
      event.preventDefault()
      choose(normalized[activeIndex])
    }
  }

  return <div ref={rootRef} onPointerEnter={(event)=>{if(event.pointerType==='mouse'&&!disabled)setOpen(true)}} onPointerLeave={(event)=>{if(event.pointerType==='mouse')setOpen(false)}} className={cn('ui-select-root',className)}>
    {label&&<label className="ui-label" htmlFor={selectId}>{label}</label>}
    <div className="ui-select-wrap">
      <button
        ref={ref}
        id={selectId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-describedby={(error||help)?messageId:undefined}
        disabled={disabled}
        onKeyDown={keydown}
        onClick={()=>setOpen((state)=>!state)}
        className={cn('ui-field ui-select-field text-left',!selected&&'ui-select-placeholder',error&&'ui-field-error')}
      >
        <span className="block truncate">{selected?.label||placeholder}</span>
      </button>
      <span className={cn('ui-select-icon',open&&'is-open')} aria-hidden="true"><ChevronDown size={15}/></span>
      <AnimatePresence>{open&&<motion.div id={listboxId} role="listbox" aria-label={label||ariaLabel||placeholder} className="ui-select-menu" initial={{opacity:0,y:-6,scale:.98}} animate={{opacity:1,y:6,scale:1}} exit={{opacity:0,y:-4,scale:.985}} transition={{duration:.16}}>
        <div className="ui-select-menu-scroll">{normalized.map((option,index)=>{
          const isSelected=String(option.value)===String(current)
          const isActive=index===activeIndex
          return <button type="button" role="option" aria-selected={isSelected} disabled={option.disabled} key={`${option.value}-${index}`} onMouseEnter={()=>setActiveIndex(index)} onClick={()=>choose(option)} className={cn('ui-select-option',isSelected&&'is-selected',isActive&&'is-active')}>
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {isSelected&&<span className="ui-select-check"><Check size={12}/></span>}
          </button>
        })}</div>
      </motion.div>}</AnimatePresence>
    </div>
    {name&&<input type="hidden" name={name} value={current} required={required}/>}
    {error?<p id={messageId} role="alert" className="ui-error">{error}</p>:help&&<p id={messageId} className="ui-help">{help}</p>}
  </div>
})
