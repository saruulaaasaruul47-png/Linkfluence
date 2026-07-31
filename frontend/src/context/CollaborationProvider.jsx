import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  collaborationApi,
  contractApi,
  offerApi,
} from '../api/collaboration.api'
import { mediaApi } from '../api/media.api'
import { useAuth } from './auth-context'
import { CollaborationContext } from './collaboration-context'

const uniqueById = (items) => [...new Map(items.filter(Boolean).map((item) => [item.id, item])).values()]
const unwrapError = (error) => {
  const message = error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'That action could not be completed.'
  if (error instanceof Error) {
    error.message = message
    return error
  }
  return new Error(message)
}
const moneyNumber = (value) => {
  if (typeof value === 'number') return value
  const parsed = Number(String(value || '').replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function CollaborationProvider({ children }) {
  const { user, isAuthenticated, isInitializing } = useAuth()
  const [offers, setOffers] = useState([])
  const [workspaces, setWorkspaces] = useState([])
  const [notifications, setNotifications] = useState([])
  const [offerComposerCreator, setOfferComposerCreator] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const sides = useMemo(() => {
    const roles = user?.roles || []
    return [
      ...(roles.includes('creator') ? ['creator'] : []),
      ...(roles.includes('business') ? ['business'] : []),
    ]
  }, [user?.roles])

  const runApi = useCallback(async (operation) => {
    try {
      return await operation()
    } catch (error) {
      throw unwrapError(error)
    }
  }, [])

  const reload = useCallback(async () => {
    if (!isAuthenticated || sides.length === 0) {
      setOffers([])
      setWorkspaces([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const [offerResults, collaborationResults] = await Promise.all([
        Promise.all(sides.map((side) => offerApi.list(side, { limit: 50 }))),
        Promise.all(sides.map((side) => collaborationApi.list(side, { limit: 50 }))),
      ])
      setOffers(uniqueById(offerResults.flatMap((result) => result?.items || [])))
      setWorkspaces(uniqueById(collaborationResults.flatMap((result) => result?.items || [])))
    } catch (error) {
      // Protected pages surface their own empty/error UI. Keep the last valid snapshot.
      console.error(unwrapError(error))
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, sides])

  useEffect(() => {
    if (isInitializing) return undefined
    let active = true
    queueMicrotask(() => {
      if (active) reload()
    })
    return () => {
      active = false
    }
  }, [isInitializing, reload])

  const refreshWorkspace = useCallback(async (id) => {
    const result = await runApi(() => collaborationApi.get(id))
    const workspace = result?.collaboration
    if (workspace) {
      setWorkspaces((current) => uniqueById([
        workspace,
        ...current.filter((item) => item.id !== workspace.id),
      ]))
    }
    return workspace
  }, [runApi])

  const replaceOffer = useCallback((offer) => {
    if (!offer) return
    setOffers((current) => uniqueById([offer, ...current.filter((item) => item.id !== offer.id)]))
  }, [])

  const sendOffer = async (creator, details) => {
    const campaignId = details.campaign?.id || details.campaignId
    const payload = {
      creatorId: creator.id,
      title: details.title.trim(),
      contentType: details.contentType.trim(),
      budget: moneyNumber(details.budget),
      currency: 'MNT',
      timeline: details.timeline.trim(),
      message: details.message.trim(),
      ...(/^[a-z0-9]{20,}$/i.test(campaignId || '') && { campaignId }),
    }
    const result = await runApi(() => offerApi.create(payload))
    replaceOffer(result?.offer)
    setOfferComposerCreator(null)
    return result?.offer
  }

  const creatorRespondInterested = async (id) => {
    const offer = offers.find((item) => item.id === id)
    const result = await runApi(() => offerApi.creatorRespond(id, { action: 'INTERESTED', version: offer?.version }))
    replaceOffer(result?.offer)
    return result?.offer
  }

  const creatorSendCounter = async (id, details) => {
    const offer = offers.find((item) => item.id === id)
    const result = await runApi(() => offerApi.creatorRespond(id, {
      action: 'COUNTER',
      requestedPayment: moneyNumber(details.requestedPayment),
      availableTimeline: details.availableTimeline,
      idea: details.idea,
      message: details.message || '',
      version: offer?.version,
    }))
    replaceOffer(result?.offer)
    return result?.offer
  }

  const creatorDecline = async (id, reason = '') => {
    const offer = offers.find((item) => item.id === id)
    const result = await runApi(() => offerApi.creatorRespond(id, {
      action: 'DECLINE',
      reason,
      version: offer?.version,
    }))
    replaceOffer(result?.offer)
    return result?.offer
  }

  const businessRequestChanges = async (id, message) => {
    const offer = offers.find((item) => item.id === id)
    const result = await runApi(() => offerApi.businessDecide(id, {
      action: 'REQUEST_CHANGES',
      message,
      version: offer?.version,
    }))
    replaceOffer(result?.offer)
    return result?.offer
  }

  const businessDecline = async (id, message = '') => {
    const offer = offers.find((item) => item.id === id)
    const result = await runApi(() => offerApi.businessDecide(id, {
      action: 'DECLINE',
      message,
      version: offer?.version,
    }))
    replaceOffer(result?.offer)
    return result?.offer
  }

  const businessApprove = async (id, finalDetails = {}) => {
    const offer = offers.find((item) => item.id === id)
    const result = await runApi(() => offerApi.businessDecide(id, {
      action: 'APPROVE',
      finalBudget: moneyNumber(finalDetails.finalBudget),
      finalTimeline: finalDetails.finalTimeline,
      version: offer?.version,
    }))
    replaceOffer(result?.offer)
    const workspaceId = result?.offer?.workspaceId
    return workspaceId ? refreshWorkspace(workspaceId) : null
  }

  const updateTerms = async (id, terms) => {
    const workspace = workspaces.find((item) => item.id === id)
    const result = await runApi(() => collaborationApi.updateTerms(id, {
      terms,
      version: workspace?.version,
    }))
    const next = result?.collaboration
    if (next) setWorkspaces((current) => uniqueById([next, ...current.filter((item) => item.id !== id)]))
    return next
  }

  const lockAgreement = async (id) => {
    const workspace = workspaces.find((item) => item.id === id)
    await runApi(() => collaborationApi.lockAgreement(id, workspace?.version))
    return refreshWorkspace(id)
  }

  const approveAgreement = async (id) => {
    await runApi(() => collaborationApi.agreementAction(id, { action: 'APPROVE' }))
    return refreshWorkspace(id)
  }

  const requestAgreementChanges = async (id, _role, note = '') => {
    await runApi(() => collaborationApi.agreementAction(id, { action: 'REQUEST_CHANGES', note }))
    return refreshWorkspace(id)
  }

  const approveContract = async (id) => {
    const workspace = workspaces.find((item) => item.id === id)
    if (!workspace?.contract?.id) throw new Error('Contract is not ready yet.')
    await runApi(() => contractApi.action(workspace.contract.id, { action: 'APPROVE' }))
    return refreshWorkspace(id)
  }

  const requestContractChanges = async (id, _role, note = '') => {
    const workspace = workspaces.find((item) => item.id === id)
    if (!workspace?.contract?.id) throw new Error('Contract is not ready yet.')
    await runApi(() => contractApi.action(workspace.contract.id, { action: 'REQUEST_CHANGES', note }))
    return refreshWorkspace(id)
  }

  const fundWorkspace = async (id) => {
    await runApi(() => collaborationApi.createFundingIntent(id, { autoConfirm: true }))
    return refreshWorkspace(id)
  }

  const toggleTask = async (id, taskId) => {
    await runApi(() => collaborationApi.toggleTask(id, taskId))
    return refreshWorkspace(id)
  }

  const addFile = async (id, file) => {
    const uploaded = await runApi(() => mediaApi.upload(file, 'COLLABORATION'))
    const asset = uploaded?.asset
    await runApi(() => collaborationApi.addFile(id, {
      mediaAssetId: asset.id,
      name: asset.originalName || file.name,
      url: asset.url,
      mimeType: asset.mimeType || file.type,
      sizeBytes: asset.sizeBytes || file.size,
      kind: 'PROJECT',
    }))
    await refreshWorkspace(id)
    return asset
  }

  const submitDeliverable = async (id, file, _role, note = '') => {
    const uploaded = await runApi(() => mediaApi.upload(file, 'DELIVERABLE'))
    const asset = uploaded?.asset
    const payload = {
      mediaAssetId: asset.id,
      title: file.name || 'Campaign deliverable',
      note,
      fileUrl: asset.url,
      fileType: asset.mimeType || file.type,
    }
    const workspace = workspaces.find((item) => item.id === id)
    const revisionTarget = workspace?.deliverables?.find((entry) => entry.status === 'REVISION_REQUESTED')
    const result = revisionTarget
      ? await runApi(() => collaborationApi.reviseDeliverable(id, revisionTarget.id, payload))
      : await runApi(() => collaborationApi.submitDeliverable(id, payload))
    await refreshWorkspace(id)
    return result?.deliverable
  }

  const reviewDeliverable = async (id, deliverableId, decision, note = '') => {
    const result = await runApi(() => collaborationApi.reviewDeliverable(id, deliverableId, {
      decision,
      note,
      autoConfirmRelease: decision === 'APPROVED',
    }))
    await refreshWorkspace(id)
    return result
  }

  const submitReview = async (id, _role, rating, comment) => {
    const result = await runApi(() => collaborationApi.submitReview(id, { rating, comment }))
    await refreshWorkspace(id)
    return result?.review
  }

  const publishShowcase = async (id) => {
    const result = await runApi(() => collaborationApi.publishShowcase(id))
    await refreshWorkspace(id)
    return result?.showcase
  }

  const addActivity = async (id, text) => {
    if (!text?.trim()) return null
    await runApi(() => collaborationApi.addActivity(id, text.trim()))
    return refreshWorkspace(id)
  }

  const markNotificationRead = (id) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, unread: false } : item))
  }
  const markAllNotificationsRead = (role) => {
    setNotifications((current) => current.map((item) => item.role === role ? { ...item, unread: false } : item))
  }

  const value = {
    offers,
    workspaces,
    notifications,
    publishedShowcases: [],
    isLoading,
    offerComposerCreator,
    openOfferComposer: setOfferComposerCreator,
    closeOfferComposer: () => setOfferComposerCreator(null),
    sendOffer,
    creatorRespondInterested,
    creatorSendCounter,
    creatorDecline,
    businessApprove,
    businessRequestChanges,
    businessDecline,
    getWorkspace: (id) => workspaces.find((workspace) => workspace.id === id),
    refreshWorkspace,
    updateTerms,
    lockAgreement,
    approveAgreement,
    requestAgreementChanges,
    approveContract,
    requestContractChanges,
    fundWorkspace,
    toggleTask,
    addFile,
    submitDeliverable,
    reviewDeliverable,
    submitReview,
    publishShowcase,
    addActivity,
    markNotificationRead,
    markAllNotificationsRead,
    reload,
  }

  return <CollaborationContext.Provider value={value}>{children}</CollaborationContext.Provider>
}
