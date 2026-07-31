export function Tabs({ tabs, value, onChange }) {
  return <div><div role="tablist" className="inline-flex rounded-full bg-[var(--surface-2)] p-1">{tabs.map((tab) => <button role="tab" aria-selected={value === tab.value} key={tab.value} onClick={() => onChange(tab.value)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${value === tab.value ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--subtle)]'}`}>{tab.label}</button>)}</div><div className="mt-5">{tabs.find((tab) => tab.value === value)?.content}</div></div>
}
