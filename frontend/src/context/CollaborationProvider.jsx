import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  collaborationApi,
  contractApi,
  offerApi,
} from '../api/collaboration.api'
import { mediaApi } from '../api/media.api'
import { notificationApi } from '../api/dashboard.api'
import { createRealtimeClient } from '../api/realtime'
import { useAuth } from './auth-context'
import { CollaborationContext } from './collaboration-context'

const uniqueById = (items) => [...new Map(items.filter(Boolean).map((item) => [item.id, item])).values()]
const unwrapError = (error) => {
  const backendError = error?.response?.data?.error
  const detail = backendError?.details && Object.values(backendError.details).find(Boolean)
  const baseMessage = backendError?.message
    || error?.response?.data?.message
    || error?.message
    || 'That action could not be completed.'
  const message = detail && detail !== baseMessage ? `${baseMessage} ${detail}` : baseMessage
  if (error instanceof Error) {
    error.message = message
    error.details = backendError?.details || null
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
  const [dataOwnerId, setDataOwnerId] = useState(null)
  const dataOwnerRef = useRef(null)
  const reloadVersion = useRef(0)
  const activeUserIdRef = useRef(user?.id || null)
  useEffect(() => {
    activeUserIdRef.current = user?.id || null
  }, [user?.id])

  const sides = useMemo(() => {
    const roles = user?.roles || []
    return [
      ...(roles.includes('creator') ? ['creator'] : []),
      ...(roles.includes('business') ? ['business'] : []),
    ]
  }, [user?.roles])

  const runApi = useCallback(async (operation) => {
    const requestUserId = activeUserIdRef.current
    try {
      const result = await operation()
      if (requestUserId !== activeUserIdRef.current) {
        throw new Error('Your active account changed before this action completed.')
      }
      return result
    } catch (error) {
      throw unwrapError(error)
    }
  }, [])

  const reload = useCallback(async () => {
    const version = ++reloadVersion.current
    const requestUserId = user?.id || null
    if (!isAuthenticated || sides.length === 0) {
      setOffers([])
      setWorkspaces([])
      setNotifications([])
      dataOwnerRef.current = null
      setDataOwnerId(null)
      setIsLoading(false)
      return
    }
    if (dataOwnerRef.current !== requestUserId) {
      setOffers([])
      setWorkspaces([])
      setNotifications([])
      dataOwnerRef.current = null
      setDataOwnerId(null)
    }
    setIsLoading(true)
    try {
      const [offerResults, collaborationResults, notificationResult] = await Promise.all([
        Promise.all(sides.map((side) => offerApi.list(side, { limit: 50 }))),
        Promise.all(sides.map((side) => collaborationApi.list(side, { limit: 50 }))),
        notificationApi.list({ limit: 100 }),
      ])
      if (version !== reloadVersion.current) return
      setOffers(uniqueById(offerResults.flatMap((result) => result?.items || [])))
      setWorkspaces(uniqueById(collaborationResults.flatMap((result) => result?.items || [])))
      setNotifications(notificationResult?.items || [])
      dataOwnerRef.current = requestUserId
      setDataOwnerId(requestUserId)
    } catch (error) {
      if (version === reloadVersion.current) console.error(unwrapError(error))
    } finally {
      if (version === reloadVersion.current) setIsLoading(false)
    }
  }, [isAuthenticated, sides, user?.id])

  useEffect(() => {
    if (isInitializing) return undefined
    let active = true
    queueMicrotask(() => {
      if (active) reload()
    })
    return () => {
      active = false
      reloadVersion.current += 1
    }
  }, [isInitializing, reload])

  useEffect(() => {
    if (isInitializing || !isAuthenticated) return undefined
    const socketUserId = user?.id
    const socket = createRealtimeClient()
    socket.on('notification:created', (notification) => {
      if (!notification?.id || socketUserId !== activeUserIdRef.current) return
      setNotifications((current) => uniqueById([{ ...notification, unread: true }, ...current]))
    })
    socket.connect()
    return () => socket.disconnect()
  }, [isAuthenticated, isInitializing, user?.id])

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
      paymentType: details.paymentType || 'PAID',
      ...(['BARTER', 'HYBRID'].includes(details.paymentType) && { barterDetails: details.barterDetails }),
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
    const result = await runApi(() => collaborationApi.fundFromWallet(id, {
      paymentMethod: 'WALLET',
      idempotencyKey: globalThis.crypto?.randomUUID?.() || `wallet-${Date.now()}`,
    }))
    await refreshWorkspace(id)
    return result
  }

  const toggleTask = async (id, taskId) => {
    await runApi(() => collaborationApi.toggleTask(id, taskId))
    return refreshWorkspace(id)
  }

  const createTask = async (id, payload) => {
    const result = await runApi(() => collaborationApi.createTask(id, payload))
    if (result?.collaboration) setWorkspaces((current) => uniqueById([result.collaboration, ...current.filter((item) => item.id !== id)]))
    return result?.task
  }

  const updateTask = async (id, taskId, payload) => {
    const result = await runApi(() => collaborationApi.updateTask(id, taskId, payload))
    if (result?.collaboration) setWorkspaces((current) => uniqueById([result.collaboration, ...current.filter((item) => item.id !== id)]))
    return result?.task
  }

  const deleteTask = async (id, taskId, version) => {
    const result = await runApi(() => collaborationApi.deleteTask(id, taskId, version))
    if (result?.collaboration) setWorkspaces((current) => uniqueById([result.collaboration, ...current.filter((item) => item.id !== id)]))
    return result?.taskId
  }

  const addFile = async (id, file) => {
    const uploaded = await runApi(() => mediaApi.upload(file, 'COLLABORATION'))
    const asset = uploaded?.asset
    await runApi(() => collaborationApi.addFile(id, {
      mediaAssetId: asset.id,
      name: asset.originalName || file.name,
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
    return result
  }

  const declineShowcase = async (id) => {
    const result = await runApi(() => collaborationApi.declineShowcase(id))
    await refreshWorkspace(id)
    return result
  }

  const submitPublishProof = async (id, deliverableId, postUrl, platform, screenshotFile, paidPartnership = false) => {
    let screenshotId
    if (screenshotFile) {
      const uploaded = await runApi(() => mediaApi.upload(screenshotFile, 'DELIVERABLE'))
      screenshotId = uploaded?.asset?.id
    }
    const result = await runApi(() => collaborationApi.submitProof(id, { deliverableId, postUrl, platform, paidPartnership, ...(screenshotId && { screenshotId }) }))
    await refreshWorkspace(id)
    return result?.proof
  }

  const addActivity = async (id, text) => {
    if (!text?.trim()) return null
    await runApi(() => collaborationApi.addActivity(id, text.trim()))
    return refreshWorkspace(id)
  }

  const markNotificationRead = async (id) => {
    await runApi(() => notificationApi.read(id))
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, unread: false } : item))
  }
  const markAllNotificationsRead = async () => {
    await runApi(() => notificationApi.readAll())
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })))
  }

  const ownsCurrentData = Boolean(user?.id && dataOwnerId === user.id)
  const value = {
    offers: ownsCurrentData ? offers : [],
    workspaces: ownsCurrentData ? workspaces : [],
    notifications: ownsCurrentData ? notifications : [],
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
    getWorkspace: (id) => ownsCurrentData ? workspaces.find((workspace) => workspace.id === id) : undefined,
    refreshWorkspace,
    updateTerms,
    lockAgreement,
    approveAgreement,
    requestAgreementChanges,
    approveContract,
    requestContractChanges,
    fundWorkspace,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    addFile,
    submitDeliverable,
    reviewDeliverable,
    submitReview,
    publishShowcase,
    declineShowcase,
    submitPublishProof,
    addActivity,
    markNotificationRead,
    markAllNotificationsRead,
    reload,
  }

  return <CollaborationContext.Provider value={value}>{children}</CollaborationContext.Provider>
}
