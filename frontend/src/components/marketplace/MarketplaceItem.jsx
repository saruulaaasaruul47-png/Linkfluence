import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { marketplaceApi } from '../../api/marketplace.api'
import { campaignApi } from '../../api/campaign.api'
import { showcaseApi } from '../../api/showcase.api'
import { toBusinessCard, toCampaignCard, toCreatorCard, toShowcaseCard } from '../../api/marketplace.mapper'
import { BusinessCard, CampaignCard, CreatorCard, ShowcaseCard } from './cards'
import { contentApi } from '../../api/content.api'
import { MarketplaceImage } from './MarketplaceImage'

const loaders = {
  creator: (id) => marketplaceApi.getCreator(id).then(toCreatorCard),
  business: (id) => marketplaceApi.getBusiness(id).then(toBusinessCard),
  showcase: (id) => showcaseApi.get(id).then((result) => toShowcaseCard(result.post)),
  campaign: (id) => campaignApi.get(id).then((result) => toCampaignCard(result.campaign)),
}

function ContentItem({ id, compact = false }) {
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  useEffect(() => {
    let active = true
    contentApi.get(id).then((result) => { if (active) setPost(result.post) }).catch(() => {})
    return () => { active = false }
  }, [id])
  if (!post) return <div className="aspect-[4/3] animate-pulse rounded-[1.25rem] border border-white/10 bg-white/[.035]" aria-label="Loading saved post" />
  const media = post.media?.[0]
  return <button type="button" onClick={() => navigate(`/posts/${post.id}`)} className="group relative block w-full overflow-hidden rounded-[1.1rem] border border-white/10 text-left">
    <MarketplaceImage src={media?.thumbnailUrl || media?.url || post.author.coverUrl} alt={media?.altText || post.title || ''} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
    <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
    <span className={`absolute ${compact ? 'inset-x-3 bottom-3' : 'inset-x-4 bottom-4'}`}><strong className={`block ${compact ? 'text-xs' : 'text-base'}`}>{post.title || post.author.name}</strong><small className={`${compact ? 'mt-0.5 text-[9px]' : 'mt-1 text-xs'} block line-clamp-1 text-white/50`}>{post.caption}</small></span>
  </button>
}

export function MarketplaceItem({ itemKey, compact = false }) {
  const [type, id] = itemKey.split(':')
  const [item, setItem] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (type === 'content') return undefined
    const loader = loaders[type]
    if (!loader) return undefined
    let active = true
    loader(id)
      .then((result) => { if (active) setItem(result) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [type, id])

  if (type === 'content') return <ContentItem id={id} compact={compact} />
  if (!loaders[type]) return null
  if (failed) return null
  if (!item) return <div className="aspect-[4/3] animate-pulse rounded-[1.25rem] border border-white/10 bg-white/[.035]" aria-label="Loading" />
  if (type === 'creator') return <CreatorCard creator={item} compact={compact} />
  if (type === 'business') return <BusinessCard business={item} compact={compact} />
  if (type === 'showcase') return <ShowcaseCard item={item} compact={compact} />
  if (type === 'campaign') return <CampaignCard campaign={item} compact={compact} />
  return null
}
