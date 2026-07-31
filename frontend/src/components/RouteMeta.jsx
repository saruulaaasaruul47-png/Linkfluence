import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const defaultDescription = 'Discover creators, businesses, campaigns and completed collaborations on VYRA.'

function pageMeta(pathname) {
  if (pathname.startsWith('/creators/')) return ['Creator profile · VYRA', 'Explore creator work, audience signals and collaboration fit.']
  if (pathname.startsWith('/businesses/')) return ['Business profile · VYRA', 'Explore a business profile, active campaigns and partnership history.']
  if (pathname.startsWith('/campaigns/')) return ['Campaign brief · VYRA', 'Review campaign scope, budget, deadline and creator requirements.']
  if (pathname === '/showcase') return ['Showcase · VYRA', 'Watch creator work, campaign moments and posts from channels you follow.']
  if (pathname.startsWith('/showcase/')) return ['Completed collaboration · VYRA', 'Explore creator-led work and its performance results.']
  if (pathname === '/search') return ['Search the marketplace · VYRA', defaultDescription]
  if (pathname.startsWith('/search/creators')) return ['Find creators · VYRA', 'Search and filter creators by niche, platform, audience and rating.']
  if (pathname.startsWith('/search/businesses')) return ['Find businesses · VYRA', 'Discover trusted businesses looking for creator partnerships.']
  if (pathname.startsWith('/search/campaigns')) return ['Find campaigns · VYRA', 'Search live creator campaigns by niche, budget and platform.']
  if (pathname.startsWith('/collections')) return ['Collections · VYRA', 'Organize creators, businesses and campaign inspiration.']
  if (pathname === '/account') return ['My Account · VYRA', 'Manage personal details, channels, saves, follows and collections.']
  if (pathname === '/discover') return ['Discover · VYRA', defaultDescription]
  return ['VYRA Creator Marketplace', defaultDescription]
}

function ensureMeta(property, content) {
  let element = document.head.querySelector(`meta[property="${property}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('property', property)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export function RouteMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const [title, description] = pageMeta(pathname)
    document.title = title
    const descriptionElement = document.head.querySelector('meta[name="description"]') || document.head.appendChild(document.createElement('meta'))
    descriptionElement.setAttribute('name', 'description')
    descriptionElement.setAttribute('content', description)
    ensureMeta('og:title', title)
    ensureMeta('og:description', description)
    ensureMeta('og:type', 'website')
    ensureMeta('og:url', window.location.href)
  }, [pathname])
  return null
}
