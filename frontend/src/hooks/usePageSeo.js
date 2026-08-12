import { useEffect } from 'react'
import { applyPageMeta, clearStructuredData } from '../lib/pageSeo'

export function usePageSeo({ enabled = true, title, description, canonicalPath, image, type, noIndex, jsonLd }) {
  useEffect(() => {
    if (!enabled) return undefined
    applyPageMeta({ title, description, canonicalPath, image, type, noIndex, jsonLd })
    return clearStructuredData
  }, [canonicalPath, description, enabled, image, jsonLd, noIndex, title, type])
}
