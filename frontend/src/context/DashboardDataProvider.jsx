import { useEffect, useRef, useState } from 'react'
import { campaignApi, proposalApi, sourcingApi } from '../api/campaign.api'
import { useAuth } from './auth-context'
import { DashboardDataContext } from './dashboard-data-context'
import { parseMoneyRange } from '../utils/money'

const statusLabel = (value) => ({
  DRAFT: 'Draft',
  OPEN: 'Active',
  PAUSED: 'Paused',
  IN_PROGRESS: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Closed',
  ARCHIVED: 'Closed',
  SUBMITTED: 'Submitted',
  SHORTLISTED: 'Shortlisted',
  COUNTERED: 'Countered',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
  WITHDRAWN: 'Withdrawn',
  PENDING: 'Pending',
  DECLINED: 'Declined',
})[value] || value

function money(value, currency = 'MNT') {
  if (value == null || !Number.isFinite(Number(value))) return ''
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function budgetLabel(item) {
  if (item.budgetMin == null && item.budgetMax == null) return 'Budget on request'
  if (item.budgetMin == null) return `Up to ${money(item.budgetMax, item.currency)}`
  if (item.budgetMax == null) return `From ${money(item.budgetMin, item.currency)}`
  return `${money(item.budgetMin, item.currency)}–${money(item.budgetMax, item.currency)}`
}

function mapCampaign(item) {
  return {
    ...item,
    business: item.business?.name || 'Business',
    creator: 'Creator not selected',
    status: statusLabel(item.status),
    backendStatus: item.status,
    progress: item.status === 'COMPLETED' ? 100 : 0,
    budget: budgetLabel(item),
    deadline: item.applicationDeadline?.slice(0, 10) || item.deadline?.slice(0, 10) || '',
    platform: item.platforms?.join(' · ') || 'Multi-platform',
    deliverables: typeof item.deliverables === 'string'
      ? item.deliverables
      : Array.isArray(item.deliverables)
        ? item.deliverables.join(' · ')
        : 'View campaign brief',
  }
}

function mapProposal(item) {
  return {
    ...item,
    campaignId: item.campaign.id,
    campaign: item.campaign.title,
    business: item.campaign.business.name,
    creator: item.creator.name,
    amount: money(item.amount, item.currency),
    approach: item.message,
    status: statusLabel(item.status),
    backendStatus: item.status,
    submitted: item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '',
    score: item.status === 'SHORTLISTED' ? 'Shortlisted' : 'Review',
  }
}

function mapInvitation(item) {
  return {
    ...item,
    title: item.campaign.title,
    brand: item.business.name,
    budget: budgetLabel(item.campaign),
    sent: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
    status: statusLabel(item.status),
    backendStatus: item.status,
  }
}

function campaignPayload(data) {
  const budget = parseMoneyRange(data.budget)
  const platform = String(data.platform || '').toUpperCase()
  return {
    title: data.title,
    description: data.summary?.trim() || `${data.title} creator campaign brief.`,
    category: data.niche || data.category || 'Lifestyle',
    goal: data.goal || '',
    platforms: platform === 'MULTI-PLATFORM'
      ? ['INSTAGRAM', 'TIKTOK', 'YOUTUBE']
      : [platform || 'OTHER'],
    ...budget,
    applicationDeadline: data.deadline || undefined,
    deliverables: data.deliverables || undefined,
    requirements: {
      audience: data.audience || '',
      location: data.location || '',
      audienceSize: data.audienceSize || '',
      usage: data.usage || '',
      rounds: data.rounds || '',
      guardrails: data.guardrails || '',
      openApplication: data.open !== false,
    },
  }
}

export function DashboardDataProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [dataOwnerId, setDataOwnerId] = useState(null)
  const hydrateVersion = useRef(0)
  const [campaigns, setCampaigns] = useState([])
  const [creatorProposals, setCreatorProposals] = useState([])
  const [businessProposals, setBusinessProposals] = useState([])
  const [campaignInvitations, setCampaignInvitations] = useState([])
  const [shortlist, setShortlist] = useState([])
  const [compare, setCompare] = useState([])
  const [invited, setInvited] = useState([])
  const campaignVersions = useRef(new Map())
  const campaignMutationQueues = useRef(new Map())

  useEffect(() => {
    const version = ++hydrateVersion.current
    if (!isAuthenticated || !user) {
      campaignVersions.current.clear()
      Promise.resolve().then(() => {
        if (version !== hydrateVersion.current) return
        setCampaigns([])
        setCreatorProposals([])
        setBusinessProposals([])
        setCampaignInvitations([])
        setShortlist([])
        setCompare([])
        setInvited([])
        setDataOwnerId(null)
      })
      return () => {
        if (version === hydrateVersion.current) hydrateVersion.current += 1
      }
    }

    let active = true
    const hasBusiness = user.roles?.includes('business')
    const hasCreator = user.roles?.includes('creator')
    async function hydrate() {
      const businessRequests = hasBusiness
        ? Promise.all([
          campaignApi.listMine({ limit: 50 }),
          proposalApi.listBusiness({ limit: 50 }),
          sourcingApi.shortlist(),
          sourcingApi.compare(),
          sourcingApi.businessInvitations({ limit: 50 }),
        ])
        : null
      const creatorRequests = hasCreator
        ? Promise.all([
          proposalApi.listMine({ limit: 50 }),
          sourcingApi.creatorInvitations({ limit: 50 }),
        ])
        : null
      const [businessData, creatorData] = await Promise.all([
        businessRequests?.catch(() => null),
        creatorRequests?.catch(() => null),
      ])
      if (!active || version !== hydrateVersion.current) return
      if (businessData) {
        const [campaignResult, proposalResult, shortlistResult, compareResult, invitationsResult] = businessData
        const mappedCampaigns = campaignResult.items.map(mapCampaign)
        mappedCampaigns.forEach((campaign) => campaignVersions.current.set(campaign.id, campaign.version))
        setCampaigns(mappedCampaigns)
        setBusinessProposals(proposalResult.items.map(mapProposal))
        setShortlist(shortlistResult.items.map((entry) => entry.creator.slug || entry.creatorId))
        setCompare(compareResult.items.map((entry) => entry.creator.slug || entry.creatorId))
        setInvited(invitationsResult.items.map((entry) => entry.creator.slug || entry.creator.id))
        if (!hasCreator) setCampaignInvitations(invitationsResult.items.map(mapInvitation))
      } else {
        setCampaigns([])
        setBusinessProposals([])
        setShortlist([])
        setCompare([])
        setInvited([])
      }
      if (creatorData) {
        const [proposalResult, invitationResult] = creatorData
        setCreatorProposals(proposalResult.items.map(mapProposal))
        setCampaignInvitations(invitationResult.items.map(mapInvitation))
      } else {
        setCreatorProposals([])
        if (!hasBusiness) setCampaignInvitations([])
      }
      setDataOwnerId(user.id)
    }
    hydrate()
    return () => {
      active = false
      if (version === hydrateVersion.current) hydrateVersion.current += 1
    }
  }, [isAuthenticated, user])

  const addCampaign = async (data) => {
    const result = await campaignApi.create(campaignPayload(data))
    const campaign = mapCampaign(result.campaign)
    campaignVersions.current.set(campaign.id, campaign.version)
    setCampaigns((items) => [campaign, ...items])
    return campaign
  }
  const updateCampaign = (id, details) => {
    const current = campaigns.find((item) => item.id === id)
    if (!current) return Promise.resolve(null)
    if (details.status && details.status !== current.status) {
      const allowed = {
        DRAFT: ['Active', 'Closed'],
        OPEN: ['Paused', 'Closed'],
        PAUSED: ['Active', 'Closed'],
      }[current.backendStatus] || []
      if (!allowed.includes(details.status)) return Promise.resolve(current)
    }
    setCampaigns((items) => items.map((item) => item.id === id ? { ...item, ...details } : item))
    const previous = campaignMutationQueues.current.get(id) || Promise.resolve()
    const operation = previous.catch(() => null).then(async () => {
      let result
      if (details.status && details.status !== current.status) {
        if (details.status === 'Active') result = await campaignApi.publish(id, current.requirements?.openApplication !== false)
        else if (details.status === 'Paused') result = await campaignApi.pause(id)
        else if (details.status === 'Closed') result = await campaignApi.archive(id)
      } else {
        const payload = { version: campaignVersions.current.get(id) || current.version }
        if (details.title !== undefined) payload.title = details.title
        if (details.budget !== undefined) Object.assign(payload, parseMoneyRange(details.budget))
        if (details.deliverables !== undefined) payload.deliverables = details.deliverables
        if (details.deadline !== undefined) payload.applicationDeadline = details.deadline
        if (Object.keys(payload).length === 1) return current
        result = await campaignApi.update(id, payload)
      }
      const updated = mapCampaign(result.campaign)
      campaignVersions.current.set(id, updated.version)
      setCampaigns((items) => items.map((item) => item.id === id ? updated : item))
      return updated
    })
    const mutation = operation.catch(() => {
      if (campaignMutationQueues.current.get(id) === mutation) {
        setCampaigns((items) => items.map((item) => item.id === id ? current : item))
      }
      return current
    }).finally(() => {
      if (campaignMutationQueues.current.get(id) === mutation) campaignMutationQueues.current.delete(id)
    })
    campaignMutationQueues.current.set(id, mutation)
    return mutation
  }
  const deleteCampaign = async (id) => {
    await campaignApi.remove(id)
    campaignVersions.current.delete(id)
    setCampaigns((items) => items.filter((item) => item.id !== id))
  }

  const submitProposal = async (campaign, data) => {
    const existing = creatorProposals.find((item) => item.campaignId === campaign.id)
    const amount = parseMoneyRange(data.amount).budgetMin
    const payload = {
      amount,
      timeline: data.timeline,
      message: data.approach,
      deliverables: data.deliverables || undefined,
      ...(existing && { version: existing.version }),
    }
    const result = existing
      ? await proposalApi.update(existing.id, payload)
      : await proposalApi.submit(campaign.id, payload)
    const proposal = mapProposal(result.proposal)
    setCreatorProposals((items) => existing
      ? items.map((item) => item.id === existing.id ? proposal : item)
      : [proposal, ...items])
    return proposal
  }
  const withdrawProposal = async (id) => {
    const result = await proposalApi.withdraw(id)
    const proposal = mapProposal(result.proposal)
    setCreatorProposals((items) => items.map((item) => item.id === id ? proposal : item))
    return proposal
  }
  const toggleShortlist = async (id) => {
    const exists = shortlist.includes(id)
    if (exists) await sourcingApi.removeShortlist(id)
    else await sourcingApi.addShortlist(id)
    setShortlist((items) => exists ? items.filter((item) => item !== id) : [...items, id])
  }
  const toggleCompare = async (id) => {
    const exists = compare.includes(id)
    if (exists) await sourcingApi.removeCompare(id)
    else await sourcingApi.addCompare(id)
    setCompare((items) => exists ? items.filter((item) => item !== id) : [...items, id])
  }
  const inviteCreator = async (id) => {
    const campaign = campaigns.find((item) => item.backendStatus === 'OPEN')
    if (!campaign) throw new Error('Publish an open campaign before inviting creators.')
    const result = await sourcingApi.invite({ creatorId: id, campaignId: campaign.id })
    const creatorKey = result.invitation.creator.slug || result.invitation.creator.id
    setInvited((items) => items.includes(creatorKey) ? items : [...items, creatorKey])
    setCampaignInvitations((items) => [mapInvitation(result.invitation), ...items])
    return result.invitation
  }
  const decideProposal = async (id, action, details = {}) => {
    const item = businessProposals.find((proposal) => proposal.id === id)
    const result = await proposalApi.decide(id, {
      action,
      version: item?.version,
      ...(action === 'COUNTER' && {
        counterAmount: parseMoneyRange(details.counterAmount).budgetMin,
        counterMessage: details.counterMessage || 'Updated commercial terms.',
      }),
    })
    const proposal = mapProposal(result.proposal)
    setBusinessProposals((items) => items.map((entry) => entry.id === id ? proposal : entry))
    return proposal
  }
  const respondInvitation = async (id, action) => {
    const result = await sourcingApi.respondInvitation(id, action)
    const invitation = mapInvitation(result.invitation)
    setCampaignInvitations((items) => items.map((entry) => entry.id === id ? invitation : entry))
    return invitation
  }
  const ownsCurrentData = Boolean(user?.id && dataOwnerId === user.id)
  const value = {
    campaigns: ownsCurrentData ? campaigns : [],
    addCampaign,
    updateCampaign,
    deleteCampaign,
    creatorProposals: ownsCurrentData ? creatorProposals : [],
    businessProposals: ownsCurrentData ? businessProposals : [],
    campaignInvitations: ownsCurrentData ? campaignInvitations : [],
    submitProposal,
    withdrawProposal,
    decideProposal,
    respondInvitation,
    shortlist: ownsCurrentData ? shortlist : [],
    compare: ownsCurrentData ? compare : [],
    invited: ownsCurrentData ? invited : [],
    toggleShortlist,
    toggleCompare,
    inviteCreator,
  }

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>
}
