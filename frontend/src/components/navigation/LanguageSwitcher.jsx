import { useLanguage } from '../../context/language-context'

function EnglishFlag() {
  return <svg viewBox="0 0 60 36" className="h-full w-full" aria-hidden="true">
    <rect width="60" height="36" fill="#012169" />
    <path d="M0 0 60 36M60 0 0 36" stroke="#fff" strokeWidth="8" />
    <path d="M0 0 60 36M60 0 0 36" stroke="#c8102e" strokeWidth="4" />
    <path d="M30 0v36M0 18h60" stroke="#fff" strokeWidth="12" />
    <path d="M30 0v36M0 18h60" stroke="#c8102e" strokeWidth="7" />
  </svg>
}

function MongolianFlag() {
  return <svg viewBox="0 0 60 36" className="h-full w-full" aria-hidden="true">
    <rect width="20" height="36" fill="#da2032" />
    <rect x="20" width="20" height="36" fill="#0066b3" />
    <rect x="40" width="20" height="36" fill="#da2032" />
    <circle cx="10" cy="9" r="3" fill="#f9cf02" />
    <path d="M7 15h6M7 19h6M7 23h6M10 13v13" stroke="#f9cf02" strokeWidth="1.8" />
  </svg>
}

export function LanguageSwitcher({ className = '', compact = false }) {
  const { language, setLanguage, t } = useLanguage()
  const nextLanguage = language === 'en' ? 'mn' : 'en'
  const nextLabel = nextLanguage === 'en' ? t('language.english') : t('language.mongolian')

  return (
    <button
      type="button"
      aria-label={nextLabel}
      aria-pressed={language === 'mn'}
      title={nextLabel}
      onClick={() => setLanguage(nextLanguage)}
      className={`relative inline-flex shrink-0 items-center overflow-hidden rounded-full border border-black/15 bg-[#e5e5e5] p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,.16),0_2px_7px_rgba(0,0,0,.2)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/70 ${compact ? 'h-6 w-11' : 'h-7 w-12'} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`relative z-10 grid shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-[0_1px_5px_rgba(0,0,0,.28)] transition-transform duration-200 ease-out ${compact ? 'size-5' : 'size-6'} ${language === 'mn' ? 'translate-x-5' : 'translate-x-0'}`}
      >
        {language === 'en' ? <EnglishFlag /> : <MongolianFlag />}
      </span>
    </button>
  )
}
