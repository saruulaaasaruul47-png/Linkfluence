import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyPageMeta } from '../lib/pageSeo'

const defaultDescription = 'Discover creators, businesses, campaigns and completed collaborations on VYRA.'
const privatePrefixes = ['/account', '/admin', '/business', '/collections', '/creator', '/following', '/forgot-password', '/login', '/onboarding', '/register', '/saved', '/verify-email', '/welcome']

function pageMeta(pathname) {
  if (pathname === '/creator/showcase') return ['Creator Showcase Studio · VYRA', 'Preview and manage what appears on your creator channel.']
  if (pathname === '/business/showcase') return ['Business Showcase Studio · VYRA', 'Preview and manage what appears on your business channel.']
  if (pathname.startsWith('/creators/')) return ['Creator profile · VYRA', 'Explore creator work, audience signals and collaboration fit.']
  if (pathname.startsWith('/businesses/')) return ['Business profile · VYRA', 'Explore a business profile, active campaigns and partnership history.']
  if (pathname.startsWith('/campaigns/')) return ['Campaign brief · VYRA', 'Review campaign scope, budget, deadline and creator requirements.']
  if (pathname === '/showcase') return ['Showcase · VYRA', 'Watch creator work, campaign moments and posts from channels you follow.']
  if (pathname.startsWith('/showcase/')) return ['Completed collaboration · VYRA', 'Explore creator-led work and its performance results.']
  if (pathname === '/search') return ['Search the marketplace · VYRA', defaultDescription]
  if (pathname.startsWith('/search/creators')) return ['Find creators · VYRA', 'Search and filter creators by niche, platform, audience and rating.']
  if (pathname.startsWith('/search/businesses')) return ['Find businesses · VYRA', 'Discover trusted businesses looking for creator partnerships.']
  if (pathname.startsWith('/search/campaigns')) return ['Find campaigns · VYRA', 'Search live creator campaigns by niche, budget and platform.']
  if (pathname === '/discover') return ['Discover · VYRA', defaultDescription]
  return ['VYRA Creator Marketplace', defaultDescription]
}

export function RouteMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const [title, description] = pageMeta(pathname)
    const noIndex = privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    applyPageMeta({ title, description, canonicalPath: pathname, noIndex })
  }, [pathname])
  return null
}
