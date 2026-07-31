import { useEffect, useRef, useState } from 'react'
import { campaignApi, proposalApi, sourcingApi } from '../api/campaign.api'
import { dashboardCampaigns, portfolioItems as initialPortfolio } from '../data/dashboard'
import { useAuth } from './auth-context'
import { DashboardDataContext } from './dashboard-data-context'

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

function parseMoneyRange(value) {
  const matches = String(value || '').toUpperCase().matchAll(/(\d+(?:\.\d+)?)\s*([KMB])?/g)
  const numbers = [...matches].map((match) => {
    const scale = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }[match[2]] || 1
    return Number(match[1]) * scale
  }).filter(Number.isFinite)
  return { budgetMin: numbers[0], budgetMax: numbers[1] ?? numbers[0] }
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

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* Keep the current tab usable. */ }
  }, [key, value])
  return [value, setValue]
}

export function DashboardDataProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [portfolio, setPortfolio] = usePersistentState('vyra:dashboard:portfolio', initialPortfolio)
  const [campaigns, setCampaigns] = useState(dashboardCampaigns)
  const [creatorProposals, setCreatorProposals] = useState([])
  const [businessProposals, setBusinessProposals] = useState([])
  const [campaignInvitations, setCampaignInvitations] = useState([])
  const [decisions, setDecisions] = usePersistentState('vyra:dashboard:decisions', {})
  const [shortlist, setShortlist] = useState([])
  const [compare, setCompare] = useState([])
  const [invited, setInvited] = useState([])
  const [preferences, setPreferences] = usePersistentState('vyra:dashboard:preferences', {
    creator: { email: true, campaign: true, marketing: false },
    business: { email: true, campaign: true, marketing: false },
  })
  const [paymentMethods, setPaymentMethods] = usePersistentState('vyra:dashboard:payment-methods', [])
  const [payoutRequests, setPayoutRequests] = usePersistentState('vyra:dashboard:payout-requests', [])
  const [refundCases, setRefundCases] = usePersistentState('vyra:dashboard:refund-cases', [])
  const [analyticsEvents, setAnalyticsEvents] = usePersistentState('vyra:dashboard:analytics-events', [])
  const [conversations, setConversations] = usePersistentState('vyra:dashboard:conversations', [
    {
      id: 'm1',
      name: 'Sarnai · GOBI',
      avatar: 'SG',
      campaignId: 'soft-icons',
      contractId: 'ctr-8821',
      online: true,
      unread: 2,
      messages: [
        { id: 'msg-1', sender: 'them', text: 'The revised treatment looks excellent. Can we lock Friday?', createdAt: '2026-07-27T02:42:00.000Z', status: 'read' },
        { id: 'msg-2', sender: 'me', text: 'This direction feels right. Let’s lock Friday and keep the softer final frame.', createdAt: '2026-07-27T02:48:00.000Z', status: 'read' },
      ],
    },
    {
      id: 'm2',
      name: 'Temuulen Film',
      avatar: 'TF',
      campaignId: 'city-in-motion',
      contractId: 'ctr-8794',
      online: false,
      unread: 0,
      messages: [{ id: 'msg-3', sender: 'them', text: 'I uploaded the location recce and first selects.', createdAt: '2026-07-26T05:10:00.000Z', status: 'read' }],
    },
    {
      id: 'm3',
      name: 'Lhamour Team',
      avatar: 'LT',
      campaignId: 'skin-honestly',
      contractId: 'ctr-8712',
      online: true,
      unread: 1,
      messages: [{ id: 'msg-4', sender: 'them', text: 'Finance has approved the milestone.', createdAt: '2026-07-25T08:30:00.000Z', status: 'delivered' }],
    },
  ])
  const [notificationReadIds, setNotificationReadIds] = usePersistentState('vyra:dashboard:notification-read', [])
  const campaignVersions = useRef(new Map())
  const campaignMutationQueues = useRef(new Map())

  useEffect(() => {
    setPortfolio((items) => {
      const legacyIds = new Set(['p1', 'p2', 'p3'])
      if (!items.some((item) => legacyIds.has(item.id))) return items
      const creatorAddedItems = items.filter((item) => !legacyIds.has(item.id))
      return [...creatorAddedItems, ...initialPortfolio]
    })
  }, [setPortfolio])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return undefined
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
      if (!active) return
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
      }
      if (creatorData) {
        const [proposalResult, invitationResult] = creatorData
        setCreatorProposals(proposalResult.items.map(mapProposal))
        setCampaignInvitations(invitationResult.items.map(mapInvitation))
      }
    }
    hydrate()
    return () => { active = false }
  }, [isAuthenticated, user])

  const addPortfolioItem = (item) => setPortfolio((items) => [{ ...item, id: `portfolio-${Date.now()}`, views: '0', saves: '0' }, ...items])
  const updatePortfolioItem = (id, details) => setPortfolio((items) => items.map((item) => item.id === id ? { ...item, ...details } : item))
  const deletePortfolioItem = (id) => setPortfolio((items) => items.filter((item) => item.id !== id))

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
    const mutation = previous.catch(() => null).then(async () => {
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
    }).finally(() => {
      if (campaignMutationQueues.current.get(id) === mutation) campaignMutationQueues.current.delete(id)
    })
    campaignMutationQueues.current.set(id, mutation)
    return mutation.catch(() => current)
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
  const setDecision = (id, decision) => setDecisions((items) => ({ ...items, [id]: decision }))

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
  const updatePreferences = (role, details) => setPreferences((items) => ({ ...items, [role]: { ...items[role], ...details } }))
  const addPaymentMethod = (details) => setPaymentMethods((items) => [{
    id: `method-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...details,
  }, ...items])
  const removePaymentMethod = (id) => setPaymentMethods((items) => items.filter((item) => item.id !== id))
  const requestPayout = (amount) => setPayoutRequests((items) => [{
    id: `payout-${Date.now()}`,
    amount,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  }, ...items])
  const createRefundCase = (transactionId, reason) => setRefundCases((items) => [{
    id: `refund-${Date.now()}`,
    transactionId,
    reason,
    status: 'Open',
    createdAt: new Date().toISOString(),
  }, ...items])
  const reconcileRefundCase = (id) => setRefundCases((items) => items.map((item) => item.id === id ? { ...item, status: 'Reconciled', reconciledAt: new Date().toISOString() } : item))
  const trackAnalyticsEvent = (type, details = {}) => setAnalyticsEvents((items) => [{
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    createdAt: new Date().toISOString(),
    ...details,
  }, ...items].slice(0, 250))
  const markConversationRead = (id) => setConversations((items) => items.map((item) => item.id === id ? { ...item, unread: 0 } : item))
  const sendMessage = (conversationId, data) => setConversations((items) => items.map((item) => item.id === conversationId ? {
    ...item,
    messages: [...item.messages, {
      id: `message-${Date.now()}`,
      sender: 'me',
      text: data.text?.trim() || '',
      attachment: data.attachment || null,
      createdAt: new Date().toISOString(),
      status: 'delivered',
    }],
  } : item))
  const editMessage = (conversationId, messageId, text) => setConversations((items) => items.map((item) => item.id === conversationId ? {
    ...item,
    messages: item.messages.map((message) => message.id === messageId && message.sender === 'me' ? { ...message, text: text.trim(), editedAt: new Date().toISOString() } : message),
  } : item))
  const deleteMessage = (conversationId, messageId) => setConversations((items) => items.map((item) => item.id === conversationId ? {
    ...item,
    messages: item.messages.filter((message) => message.id !== messageId || message.sender !== 'me'),
  } : item))
  const markStaticNotificationRead = (id) => setNotificationReadIds((items) => [...new Set([...items, id])])
  const markAllStaticNotificationsRead = (ids) => setNotificationReadIds((items) => [...new Set([...items, ...ids])])

  const value = {
    portfolio,
    addPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    campaigns,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    creatorProposals,
    businessProposals,
    campaignInvitations,
    submitProposal,
    withdrawProposal,
    decideProposal,
    respondInvitation,
    decisions,
    setDecision,
    shortlist,
    compare,
    invited,
    toggleShortlist,
    toggleCompare,
    inviteCreator,
    preferences,
    updatePreferences,
    paymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    payoutRequests,
    requestPayout,
    refundCases,
    createRefundCase,
    reconcileRefundCase,
    analyticsEvents,
    trackAnalyticsEvent,
    conversations,
    markConversationRead,
    sendMessage,
    editMessage,
    deleteMessage,
    notificationReadIds,
    markStaticNotificationRead,
    markAllStaticNotificationsRead,
  }

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>
}
