import { useCallback, useEffect, useMemo, useState } from 'react'
import { translations } from '../i18n/translations'
import { LanguageContext } from './language-context'

const STORAGE_KEY = 'vyra:language'
const supported = new Set(['en', 'mn'])

function initialLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (supported.has(stored)) return stored
  } catch { /* The UI still works if storage is disabled. */ }
  return window.navigator?.language?.toLowerCase().startsWith('mn') ? 'mn' : 'en'
}

function interpolate(value, params) {
  return Object.entries(params).reduce(
    (result, [key, replacement]) => result.replaceAll(`{{${key}}}`, String(replacement)),
    value,
  )
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(initialLanguage)

  const setLanguage = useCallback((nextLanguage) => {
    if (!supported.has(nextLanguage)) return
    setLanguageState(nextLanguage)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    try { window.localStorage.setItem(STORAGE_KEY, language) } catch { /* Storage is optional. */ }
  }, [language])

  const t = useCallback((key, params = {}) => {
    const value = translations[language]?.[key] ?? translations.en[key] ?? key
    return interpolate(value, params)
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage(language === 'en' ? 'mn' : 'en'),
    t,
  }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
