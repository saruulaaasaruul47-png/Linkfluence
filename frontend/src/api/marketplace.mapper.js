import { resolveMediaUrl } from './mediaUrl'

const compact = (value) => Number.isFinite(Number(value))
  ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value))
  : '—'
const money = (value, currency = 'MNT') => Number.isFinite(Number(value))
  ? new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'MNT', maximumFractionDigits: 0 }).format(Number(value))
  : 'Contact for rate'
const date = (value) => value
  ? new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit' }).format(new Date(value))
  : 'Not set'

export const toCreatorCard = (item) => ({
  ...item,
  avatar: resolveMediaUrl(item.avatar || item.avatarUrl),
  cover: resolveMediaUrl(item.cover || item.coverUrl),
  followers: compact(item.followerCount),
  engagement: item.engagementRate == null ? '—' : `${Number(item.engagementRate).toFixed(1)}%`,
  price: money(item.startingRate, item.currency),
  platforms: item.socialAccounts?.map((account) => account.platform) || item.platforms || [],
})

export const toBusinessCard = (item) => ({
  ...item,
  logo: resolveMediaUrl(item.logo || item.logoUrl)
    || item.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    || 'B',
  cover: resolveMediaUrl(item.cover || item.coverUrl),
  verifiedPayer: Boolean(item.verifiedPayer),
  verifiedPayerSince: item.verifiedPayerSince || null,
  campaigns: item.campaignCount ?? item.campaigns ?? 0,
})

export const toCampaignCard = (item) => ({
  ...item,
  businessId: item.business?.id,
  business: item.business?.name || item.business,
  image: resolveMediaUrl(item.business?.cover) || '',
  goal: item.goal || item.category || 'Not specified',
  niche: item.category,
  platform: item.platforms?.join(' · ') || 'Not specified',
  mode: item.isPublic ? 'Open' : 'Invite',
  applications: item.proposalCount || 0,
  budget: item.budgetMin == null && item.budgetMax == null
    ? 'Budget on request'
    : `${money(item.budgetMin, item.currency)}–${money(item.budgetMax, item.currency)}`,
  deadline: date(item.applicationDeadline || item.deadline),
  deliverables: typeof item.deliverables === 'string'
    ? item.deliverables
    : Array.isArray(item.deliverables)
      ? item.deliverables.join(' · ')
      : 'Not specified',
})

export const toShowcaseCard = (item) => ({
  ...item,
  creatorId: item.creator?.id || item.creatorId,
  creator: item.creator?.name || item.creator,
  image: resolveMediaUrl(item.image || item.thumbnailUrl || item.mediaUrl),
  performance: `${item.reactionCount || 0} reactions`,
})
