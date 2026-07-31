import { useId } from 'react'
import { Check } from 'lucide-react'

export function Checkbox({ label, description, checked, onChange, name }) {
  const id = useId()
  return <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
    <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)]">
      <input id={id} name={name} type="checkbox" checked={checked} onChange={onChange} className="peer absolute inset-0 opacity-0 focus-visible:ring-2 focus-visible:ring-pink" />
      <span className="absolute inset-0 rounded-md bg-pink opacity-0 peer-checked:opacity-100" />
      <Check size={13} className="relative z-10 opacity-0 peer-checked:opacity-100" />
    </span>
    <span><span className="block text-sm font-semibold">{label}</span>{description && <span className="mt-0.5 block text-xs leading-5 text-[var(--subtle)]">{description}</span>}</span>
  </label>
}
