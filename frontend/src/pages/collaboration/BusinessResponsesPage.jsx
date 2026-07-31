import { useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  Coins,
  Film,
  Handshake,
  MessageSquare,
  RefreshCcw,
  UserRound,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DashboardHeader, DashboardPage } from '../../components/dashboard/DashboardUI'
import { Avatar, Badge, Button, Dialog, EmptyState, Input, Textarea, useToast } from '../../components/ui'
import { useCollaboration } from '../../context/collaboration-context'

const STATUS = {
  PENDING_CREATOR_RESPONSE: { label: 'Awaiting creator', variant: 'outline' },
  AWAITING_BUSINESS_APPROVAL: { label: 'Ready to review', variant: 'pink' },
  COUNTER_PROPOSAL_SENT: { label: 'Counter proposal', variant: 'pink' },
  BUSINESS_CHANGES_REQUESTED: { label: 'Changes requested', variant: 'outline' },
  APPROVED: { label: 'Approved', variant: 'mint' },
  DECLINED: { label: 'Declined', variant: 'outline' },
  DECLINED_BY_BUSINESS: { label: 'Declined by business', variant: 'outline' },
}

function baseOffer(offer) {
  return offer.originalOffer || offer.offer || offer
}

function entityLabel(value, fallback) {
  if (typeof value === 'string') return value
  return value?.name || value?.title || value?.displayName || fallback
}

function campaignName(offer) {
  const base = baseOffer(offer)
  return offer.campaignTitle || base.campaignTitle || entityLabel(offer.campaign || base.campaign, 'Campaign')
}

function creatorName(offer) {
  const base = baseOffer(offer)
  return offer.creatorName || base.creatorName || entityLabel(offer.creator || base.creator, 'Creator')
}

function offerTitle(offer) {
  const base = baseOffer(offer)
  return base.title || base.offerTitle || `${campaignName(offer)} collaboration`
}

function contentType(offer) {
  const base = baseOffer(offer)
  const content = base.contentType || base.content || base.deliverable || base.deliverables
  if (Array.isArray(content)) return content.map((item) => entityLabel(item, String(item))).join(' · ')
  return entityLabel(content, content || 'To be discussed')
}

function originalBudget(offer) {
  const base = baseOffer(offer)
  return base.budget ?? base.proposedBudget ?? base.amount
}

function originalTimeline(offer) {
  const base = baseOffer(offer)
  return base.timeline || base.expectedTimeline || base.deliveryDate || 'To be discussed'
}

function creatorCounter(offer) {
  const response = offer.creatorResponse
  return offer.counterProposal
    || offer.counter
    || response?.counterProposal
    || (
      offer.status === 'COUNTER_PROPOSAL_SENT'
      || ['COUNTER_PROPOSAL', 'COUNTER', 'counter'].includes(response?.type)
        ? response
        : null
    )
}

function counterBudget(offer) {
  const counter = creatorCounter(offer)
  return counter?.requestedPayment ?? counter?.requestedBudget ?? counter?.budget ?? counter?.amount
}

function counterTimeline(offer) {
  const counter = creatorCounter(offer)
  return counter?.timeline || counter?.availableTimeline || counter?.deliveryDate
}

function counterIdea(offer) {
  const counter = creatorCounter(offer)
  return counter?.idea || counter?.contentIdea || counter?.concept
}

function counterMessage(offer) {
  const counter = creatorCounter(offer)
  return counter?.message || counter?.note
}

function numberFromMoney(value) {
  if (typeof value === 'number') return value
  const parsed = Number(String(value || '').replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? parsed : ''
}

function money(value) {
  if (value === undefined || value === null || value === '') return 'To be discussed'
  if (typeof value === 'number') return `${new Intl.NumberFormat('mn-MN').format(value)}₮`
  return String(value)
}

function initials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function StatusBadge({ status }) {
  const meta = STATUS[status] || { label: String(status || 'Pending').replaceAll('_', ' '), variant: 'outline' }
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

function Term({ icon: Icon, label, value, accent = false }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-mint/20 bg-mint/[.055]' : 'border-white/[.08] bg-black/10'}`}>
      <span className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.13em] ${accent ? 'text-mint/70' : 'text-white/30'}`}>
        <Icon size={13} />
        {label}
      </span>
      <strong className="mt-2 block text-sm leading-5 text-white/85">{value}</strong>
    </div>
  )
}

export function BusinessResponsesPage() {
  const {
    offers = [],
    businessApprove,
    businessRequestChanges,
    businessDecline,
  } = useCollaboration()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [view, setView] = useState('review')
  const [approveOffer, setApproveOffer] = useState(null)
  const [changesOffer, setChangesOffer] = useState(null)
  const [declineOffer, setDeclineOffer] = useState(null)
  const [approval, setApproval] = useState({ budget: '', timeline: '' })
  const [approvalErrors, setApprovalErrors] = useState({})
  const [changeMessage, setChangeMessage] = useState('')
  const [changeError, setChangeError] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [busyAction, setBusyAction] = useState('')

  const responseOffers = useMemo(() => {
    const items = Array.isArray(offers) ? offers : []
    return items.filter((offer) => offer.status !== 'PENDING_CREATOR_RESPONSE')
  }, [offers])
  const reviewableStatuses = ['AWAITING_BUSINESS_APPROVAL', 'COUNTER_PROPOSAL_SENT']
  const visibleOffers = view === 'review'
    ? responseOffers.filter((offer) => reviewableStatuses.includes(offer.status))
    : responseOffers
  const reviewCount = responseOffers.filter((offer) => reviewableStatuses.includes(offer.status)).length

  const runAction = async (key, action, successMessage) => {
    setBusyAction(key)
    try {
      const result = await Promise.resolve(action())
      toast(successMessage, { type: 'success' })
      return result ?? true
    } catch (error) {
      toast(error?.message || 'Something went wrong. Please try again.', { type: 'error' })
      return false
    } finally {
      setBusyAction('')
    }
  }

  const openApproval = (offer) => {
    setApproveOffer(offer)
    setApproval({
      budget: numberFromMoney(counterBudget(offer) ?? originalBudget(offer)),
      timeline: counterTimeline(offer) || originalTimeline(offer),
    })
    setApprovalErrors({})
  }

  const submitApproval = async (event) => {
    event.preventDefault()
    const finalBudget = Number(approval.budget)
    const errors = {}
    if (!Number.isFinite(finalBudget) || finalBudget <= 0) errors.budget = 'Enter a valid final budget.'
    if (!approval.timeline.trim()) errors.timeline = 'Confirm the collaboration timeline.'
    setApprovalErrors(errors)
    if (Object.keys(errors).length) return

    const workspace = await runAction(
      `${approveOffer.id}:approve`,
      () => businessApprove(approveOffer.id, {
        finalBudget,
        finalTimeline: approval.timeline.trim(),
      }),
      'Collaboration approved. Your workspace is ready.',
    )
    if (!workspace) return

    setApproveOffer(null)
    const workspaceId = workspace?.workspaceId
      || workspace?.id
      || workspace?.workspace?.id
      || approveOffer.workspaceId
      || approveOffer.id
    navigate(`/business/collaborations/${workspaceId}`)
  }

  const submitChanges = async (event) => {
    event.preventDefault()
    if (!changeMessage.trim()) {
      setChangeError('Tell the creator what should change.')
      return
    }
    const saved = await runAction(
      `${changesOffer.id}:changes`,
      () => businessRequestChanges(changesOffer.id, changeMessage.trim()),
      'Change request sent to the creator.',
    )
    if (saved) {
      setChangesOffer(null)
      setChangeMessage('')
      setChangeError('')
    }
  }

  const submitDecline = async (event) => {
    event.preventDefault()
    const saved = await runAction(
      `${declineOffer.id}:decline`,
      () => businessDecline(declineOffer.id, declineReason.trim()),
      'Creator response declined.',
    )
    if (saved) {
      setDeclineOffer(null)
      setDeclineReason('')
    }
  }

  return (
    <DashboardPage>
      <DashboardHeader
        eyebrow="Business · Collaboration pipeline"
        title="Incoming responses"
        copy="Compare your original offer with the creator’s response, then decide when the terms are ready."
        action={reviewCount > 0 ? <Badge variant="pink">{reviewCount} to review</Badge> : null}
      />

      <div className="mb-6 inline-flex rounded-xl border border-white/10 bg-white/[.025] p-1">
        <button
          type="button"
          aria-pressed={view === 'review'}
          onClick={() => setView('review')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${view === 'review' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
        >
          Needs review
          {reviewCount > 0 && <span className="ml-2 rounded-full bg-pink px-1.5 py-0.5 text-[9px] text-black">{reviewCount}</span>}
        </button>
        <button
          type="button"
          aria-pressed={view === 'all'}
          onClick={() => setView('all')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${view === 'all' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
        >
          All responses
        </button>
      </div>

      {visibleOffers.length === 0 ? (
        <EmptyState
          title={view === 'review' ? 'You’re all caught up' : 'No creator responses yet'}
          description={view === 'review'
            ? 'New interested responses and counter proposals will appear here.'
            : 'Responses will appear after a creator acts on your work offer.'}
          action={view === 'review' && responseOffers.length ? 'View all responses' : undefined}
          onAction={view === 'review' && responseOffers.length ? () => setView('all') : undefined}
        />
      ) : (
        <div className="space-y-5">
          {visibleOffers.map((offer) => {
            const creator = creatorName(offer)
            const counter = creatorCounter(offer)
            const creatorDeclined = offer.status === 'DECLINED' || offer.creatorResponse?.type === 'DECLINED'
            const canDecide = reviewableStatuses.includes(offer.status)
            return (
              <article
                key={offer.id}
                className="overflow-hidden rounded-[1.55rem] border border-white/10 bg-white/[.028] transition duration-300 hover:border-white/[.18]"
              >
                <div className="flex flex-col gap-5 border-b border-white/[.08] p-5 sm:flex-row sm:items-start sm:justify-between lg:p-6">
                  <div className="flex min-w-0 gap-4">
                    <Avatar
                      src={offer.creator?.avatar || baseOffer(offer).creator?.avatar}
                      alt={creator}
                      fallback={initials(creator)}
                      className="bg-pink"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-white/45">
                          <UserRound size={13} />
                          {creator}
                        </span>
                        <StatusBadge status={offer.status} />
                      </div>
                      <h2 className="mt-2 text-xl font-bold tracking-[-.035em] sm:text-2xl">{offerTitle(offer)}</h2>
                      <p className="mt-2 flex items-center gap-2 text-xs text-white/35">
                        <Handshake size={14} className="text-mint" />
                        {campaignName(offer)}
                      </p>
                    </div>
                  </div>
                  {offer.respondedAt && (
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-white/30">
                      <Clock3 size={13} />
                      Responded {new Date(offer.respondedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="grid lg:grid-cols-2">
                  <section className="border-b border-white/[.08] p-5 lg:border-b-0 lg:border-r lg:p-6">
                    <p className="mb-4 text-[10px] font-bold uppercase tracking-[.15em] text-white/30">Original offer</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Term icon={Coins} label="Proposed budget" value={money(originalBudget(offer))} />
                      <Term icon={CalendarDays} label="Timeline" value={originalTimeline(offer)} />
                      <div className="sm:col-span-2">
                        <Term icon={Film} label="Content" value={contentType(offer)} />
                      </div>
                    </div>
                  </section>

                  <section className="p-5 lg:p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-mint/70">Creator response</p>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-white/50">
                        {counter ? <RefreshCcw size={13} /> : creatorDeclined ? <X size={13} className="text-pink" /> : <CircleCheck size={13} className="text-mint" />}
                        {counter ? 'Counter proposal' : creatorDeclined ? 'Declined' : 'Interested'}
                      </span>
                    </div>
                    {counter ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Term accent icon={Coins} label="Requested payment" value={money(counterBudget(offer))} />
                        <Term accent icon={CalendarDays} label="Available timeline" value={counterTimeline(offer) || 'Not specified'} />
                        <div className="sm:col-span-2">
                          <Term accent icon={Film} label="Creator idea" value={counterIdea(offer) || 'No additional concept provided.'} />
                        </div>
                        {counterMessage(offer) && (
                          <div className="sm:col-span-2">
                            <Term accent icon={MessageSquare} label="Message" value={counterMessage(offer)} />
                          </div>
                        )}
                      </div>
                    ) : creatorDeclined ? (
                      <div className="grid min-h-40 place-items-center rounded-2xl border border-pink/20 bg-pink/[.055] p-6 text-center">
                        <div>
                          <span className="mx-auto grid size-10 place-items-center rounded-full bg-pink text-black">
                            <X size={18} />
                          </span>
                          <strong className="mt-3 block text-sm">Creator declined this offer</strong>
                          <p className="mt-2 text-xs leading-5 text-white/40">
                            {offer.creatorResponse?.reason || 'No reason was provided.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid min-h-40 place-items-center rounded-2xl border border-mint/20 bg-mint/[.055] p-6 text-center">
                        <div>
                          <span className="mx-auto grid size-10 place-items-center rounded-full bg-mint text-black">
                            <Check size={18} />
                          </span>
                          <strong className="mt-3 block text-sm">Interested in your original offer</strong>
                          <p className="mt-2 text-xs leading-5 text-white/40">The creator is ready for your approval.</p>
                        </div>
                      </div>
                    )}
                  </section>
                </div>

                {offer.status === 'BUSINESS_CHANGES_REQUESTED' && offer.businessResponse && (
                  <div className="mx-5 mb-5 rounded-2xl border border-white/10 bg-white/[.025] p-4 lg:mx-6 lg:mb-6">
                    <p className="text-[10px] font-bold uppercase tracking-[.13em] text-white/30">Your latest change request</p>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      {typeof offer.businessResponse === 'string' ? offer.businessResponse : offer.businessResponse.message}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-white/[.08] p-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
                  <p className="text-xs leading-5 text-white/35">
                    {canDecide
                      ? 'Approval creates a dedicated collaboration workspace.'
                      : STATUS[offer.status]?.label || 'This response has been processed.'}
                  </p>
                  {canDecide && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button variant="mint" disabled={Boolean(busyAction)} onClick={() => openApproval(offer)}>
                        <Check size={15} />
                        Approve collaboration
                      </Button>
                      <Button
                        variant="outline"
                        disabled={Boolean(busyAction)}
                        onClick={() => {
                          setChangesOffer(offer)
                          setChangeMessage('')
                          setChangeError('')
                        }}
                      >
                        <RefreshCcw size={14} />
                        Request changes
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-white/45 hover:text-pink"
                        disabled={Boolean(busyAction)}
                        onClick={() => {
                          setDeclineOffer(offer)
                          setDeclineReason('')
                        }}
                      >
                        <X size={15} />
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Dialog
        dark
        open={Boolean(approveOffer)}
        onClose={() => !busyAction && setApproveOffer(null)}
        title="Approve collaboration"
        description="Confirm the final commercial terms. This action creates a shared workspace."
      >
        {approveOffer && (
          <form className="space-y-4" onSubmit={submitApproval}>
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:grid-cols-2">
              <div>
                <span className="text-[10px] uppercase tracking-[.12em] text-white/30">Campaign</span>
                <strong className="mt-1 block text-sm">{campaignName(approveOffer)}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[.12em] text-white/30">Creator</span>
                <strong className="mt-1 block text-sm">{creatorName(approveOffer)}</strong>
              </div>
            </div>
            <Input
              type="number"
              min="1"
              step="1000"
              label="Final budget"
              value={approval.budget}
              error={approvalErrors.budget}
              onChange={(event) => setApproval((current) => ({ ...current, budget: event.target.value }))}
            />
            <Input
              label="Timeline"
              value={approval.timeline}
              error={approvalErrors.timeline}
              onChange={(event) => setApproval((current) => ({ ...current, timeline: event.target.value }))}
            />
            <div className="rounded-2xl border border-mint/20 bg-mint/[.055] p-4">
              <p className="flex items-start gap-2 text-xs leading-5 text-white/55">
                <CircleCheck size={15} className="mt-0.5 shrink-0 text-mint" />
                Both parties will be notified and the workspace will open at the negotiation stage.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button variant="ghost" disabled={Boolean(busyAction)} onClick={() => setApproveOffer(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="mint" loading={Boolean(busyAction)}>
                Confirm & create workspace
                <ArrowRight size={15} />
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <Dialog
        dark
        open={Boolean(changesOffer)}
        onClose={() => !busyAction && setChangesOffer(null)}
        title="Request changes"
        description="Send one clear, actionable note before asking the creator to respond again."
      >
        <form className="space-y-4" onSubmit={submitChanges}>
          <Textarea
            label="Change request"
            value={changeMessage}
            error={changeError}
            onChange={(event) => {
              setChangeMessage(event.target.value)
              if (changeError) setChangeError('')
            }}
            placeholder="Could you adjust the timeline and include one additional Story?"
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" disabled={Boolean(busyAction)} onClick={() => setChangesOffer(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="pink" loading={Boolean(busyAction)}>
              Send request
              <ArrowRight size={15} />
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        dark
        open={Boolean(declineOffer)}
        onClose={() => !busyAction && setDeclineOffer(null)}
        title="Decline this response?"
        description="The offer will close and no collaboration workspace will be created."
      >
        <form className="space-y-4" onSubmit={submitDecline}>
          <Textarea
            label="Reason"
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            placeholder="The revised terms are outside this campaign’s scope..."
            help="Optional"
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" disabled={Boolean(busyAction)} onClick={() => setDeclineOffer(null)}>
              Keep response
            </Button>
            <Button type="submit" variant="danger" loading={Boolean(busyAction)}>
              <X size={15} />
              Decline response
            </Button>
          </div>
        </form>
      </Dialog>
    </DashboardPage>
  )
}

export default BusinessResponsesPage
