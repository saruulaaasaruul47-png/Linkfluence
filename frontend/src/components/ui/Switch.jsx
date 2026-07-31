export function Switch({ label, description, checked, onChange, disabled = false }) {
  return <label className={`flex items-center justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}>
    <span><span className="block text-sm font-semibold">{label}</span>{description && <span className="mt-0.5 block text-xs text-[var(--subtle)]">{description}</span>}</span>
    <span className="relative shrink-0"><input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} disabled={disabled} /><span className="block h-7 w-12 rounded-full bg-[var(--surface-2)] ring-1 ring-[var(--border)] transition peer-checked:bg-mint peer-focus-visible:ring-2 peer-focus-visible:ring-pink" /><span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" /></span>
  </label>
}
