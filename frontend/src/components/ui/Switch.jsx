export function Switch({ label, description, checked, onChange, disabled = false, compact = false }) {
  return <label className={`flex items-center justify-between ${compact ? 'min-h-8 gap-2 rounded-lg border border-white/[.08] bg-white/[.025] px-2.5' : 'gap-4'} ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}>
    <span><span className={`block font-semibold ${compact ? 'text-[10px]' : 'text-sm'}`}>{label}</span>{description && <span className={`${compact ? 'text-[9px]' : 'mt-0.5 text-xs'} block text-[var(--subtle)]`}>{description}</span>}</span>
    <span className="relative shrink-0"><input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} disabled={disabled} /><span className={`block rounded-full bg-[var(--surface-2)] ring-1 ring-[var(--border)] transition peer-checked:bg-mint peer-focus-visible:ring-2 peer-focus-visible:ring-pink ${compact ? 'h-5 w-9' : 'h-7 w-12'}`} /><span className={`absolute rounded-full bg-white shadow-sm transition ${compact ? 'left-0.5 top-0.5 size-4 peer-checked:translate-x-4' : 'left-1 top-1 size-5 peer-checked:translate-x-5'}`} /></span>
  </label>
}
