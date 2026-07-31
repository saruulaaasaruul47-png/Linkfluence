import { useState } from 'react'

const fallbackImage = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#20161d"/><stop offset="1" stop-color="#14201b"/></linearGradient></defs>
    <rect width="1200" height="800" fill="url(#g)"/>
    <circle cx="600" cy="360" r="74" fill="none" stroke="#ff76bd" stroke-width="8" opacity=".7"/>
    <path d="M548 390l52-58 56 72 34-38 64 88H450z" fill="#b8f5d1" opacity=".55"/>
    <text x="600" y="540" text-anchor="middle" fill="#fff" opacity=".48" font-family="Arial" font-size="28" letter-spacing="7">VYRA MEDIA</text>
  </svg>
`)}`

export function MarketplaceImage({ src, alt = '', loading = 'lazy', onError, ...props }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const failed = Boolean(src && failedSrc === src)
  return <img src={failed || !src ? fallbackImage : src} alt={alt} loading={loading} decoding="async" onError={(event) => { setFailedSrc(src); onError?.(event) }} {...props} />
}
