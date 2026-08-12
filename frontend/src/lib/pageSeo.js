const structuredDataId = 'vyra-page-structured-data'

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value))
  return element
}

function absoluteUrl(value) {
  if (!value) return undefined
  try { return new URL(value, window.location.origin).toString() } catch { return undefined }
}

export function clearStructuredData() {
  document.getElementById(structuredDataId)?.remove()
}

export function applyPageMeta({ title, description, canonicalPath, image, type = 'website', noIndex = false, jsonLd }) {
  const canonicalUrl = absoluteUrl(canonicalPath || window.location.pathname)
  const imageUrl = absoluteUrl(image)
  document.title = title
  upsertMeta('meta[name="description"]', { name: 'description', content: description })
  upsertMeta('meta[name="robots"]', { name: 'robots', content: noIndex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large' })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type })
  if (canonicalUrl) upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl })
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: imageUrl ? 'summary_large_image' : 'summary' })
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
  if (imageUrl) {
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl })
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl })
  } else {
    document.head.querySelector('meta[property="og:image"]')?.remove()
    document.head.querySelector('meta[name="twitter:image"]')?.remove()
  }

  let canonical = document.head.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.appendChild(canonical)
  }
  if (canonicalUrl) canonical.setAttribute('href', canonicalUrl)

  clearStructuredData()
  if (jsonLd) {
    const script = document.createElement('script')
    script.id = structuredDataId
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(jsonLd).replaceAll('<', '\\u003c')
    document.head.appendChild(script)
  }
}
