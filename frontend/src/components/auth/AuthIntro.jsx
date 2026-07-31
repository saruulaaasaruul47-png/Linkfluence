export function AuthIntro({ kicker, title, copy }) {
  return <div className="mb-8"><p className="eyebrow text-[var(--subtle)]">{kicker}</p><h2 className="heading-lg mt-3">{title}</h2>{copy && <p className="body-muted mt-3 max-w-md text-sm">{copy}</p>}</div>
}
