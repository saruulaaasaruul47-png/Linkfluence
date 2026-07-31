export function Tooltip({ content, children }) {
  return <span className="group relative inline-flex">{children}<span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-56 -translate-x-1/2 translate-y-1 rounded-lg bg-ink px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">{content}</span></span>
}
