import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Coins,
  Film,
  Handshake,
  MessageSquare,
  RefreshCcw,
  X,
} from 'lucide-react'
import { DashboardHeader, DashboardPage } from '../../components/dashboard/DashboardUI'
import { Avatar, Badge, Button, Dialog, EmptyState, Input, Textarea, useToast } from '../../components/ui'
import { useCollaboration } from '../../context/collaboration-context'
import { useNavigate } from 'react-router-dom'

const STATUS = {
  PENDING_CREATOR_RESPONSE: { label: 'Response needed', variant: 'pink' },
  AWAITING_BUSINESS_APPROVAL: { label: 'Business reviewing', variant: 'mint' },
  COUNTER_PROPOSAL_SENT: { label: 'Counter sent', variant: 'mint' },
  BUSINESS_CHANGES_REQUESTED: { label: 'Changes requested', variant: 'pink' },
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

function businessName(offer) {
  const base = baseOffer(offer)
  return offer.businessName || base.businessName || entityLabel(offer.business || base.business, 'Business')
}

function campaignName(offer) {
  const base = baseOffer(offer)
  return offer.campaignTitle || base.campaignTitle || entityLabel(offer.campaign || base.campaign, 'Campaign')
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

function offerTitle(offer) {
  const base = baseOffer(offer)
  return base.title || base.offerTitle || `${campaignName(offer)} collaboration`
}

function offerMessage(offer) {
  const base = baseOffer(offer)
  return base.message || base.note || base.description || 'The business has invited you to discuss this collaboration.'
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

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/[.08] bg-black/10 p-4">
      <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.13em] text-white/30">
        <Icon size={13} />
        {label}
      </span>
      <strong className="mt-2 block text-sm leading-5 text-white/85">{value}</strong>
    </div>
  )
}

function StatusBadge({ status }) {
  const meta = STATUS[status] || { label: String(status || 'Pending').replaceAll('_', ' '), variant: 'outline' }
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

export function CreatorWorkRequestsPage() {
  const navigate = useNavigate()
  const {
    offers = [],
    creatorRespondInterested,
    creatorSendCounter,
    creatorDecline,
  } = useCollaboration()
  const { toast } = useToast()
  const [counterOffer, setCounterOffer] = useState(null)
  const [declineOffer, setDeclineOffer] = useState(null)
  const [busyAction, setBusyAction] = useState('')
  const [counter, setCounter] = useState({ requestedPayment: '', timeline: '', idea: '', message: '' })
  const [counterErrors, setCounterErrors] = useState({})
  const [declineReason, setDeclineReason] = useState('')

  const visibleOffers = useMemo(() => {
    const items = Array.isArray(offers) ? offers : []
    const needsResponse = (item) => ['PENDING_CREATOR_RESPONSE', 'BUSINESS_CHANGES_REQUESTED'].includes(item.status)
    return [...items].sort((a, b) => Number(needsResponse(b)) - Number(needsResponse(a)))
  }, [offers])

  const canRespond = (offer) => !offer.status || ['PENDING_CREATOR_RESPONSE', 'BUSINESS_CHANGES_REQUESTED'].includes(offer.status)

  const runAction = async (key, action, successMessage) => {
    setBusyAction(key)
    try {
      await Promise.resolve(action())
      toast(successMessage, { type: 'success' })
      return true
    } catch (error) {
      toast(error?.message || 'Something went wrong. Please try again.', { type: 'error' })
      return false
    } finally {
      setBusyAction('')
    }
  }

  const markInterested = (offer) => runAction(
    `${offer.id}:interested`,
    () => creatorRespondInterested(offer.id),
    'Interest sent. The business can now review your response.',
  )

  const openCounter = (offer) => {
    setCounterOffer(offer)
    setCounter({
      requestedPayment: numberFromMoney(originalBudget(offer)),
      timeline: originalTimeline(offer) === 'To be discussed' ? '' : originalTimeline(offer),
      idea: '',
      message: '',
    })
    setCounterErrors({})
  }

  const submitCounter = async (event) => {
    event.preventDefault()
    const requestedPayment = Number(counter.requestedPayment)
    const errors = {}
    if (!Number.isFinite(requestedPayment) || requestedPayment <= 0) errors.requestedPayment = 'Enter a valid requested payment.'
    if (!counter.timeline.trim()) errors.timeline = 'Add your available timeline.'
    if (!counter.idea.trim()) errors.idea = 'Add a short content idea.'
    setCounterErrors(errors)
    if (Object.keys(errors).length) return

    const saved = await runAction(
      `${counterOffer.id}:counter`,
      () => creatorSendCounter(counterOffer.id, {
        requestedPayment,
        availableTimeline: counter.timeline.trim(),
        idea: counter.idea.trim(),
        message: counter.message.trim(),
      }),
      'Counter proposal sent to the business.',
    )
    if (saved) setCounterOffer(null)
  }

  const submitDecline = async (event) => {
    event.preventDefault()
    const saved = await runAction(
      `${declineOffer.id}:decline`,
      () => creatorDecline(declineOffer.id, declineReason.trim()),
      'Work offer declined.',
    )
    if (saved) {
      setDeclineOffer(null)
      setDeclineReason('')
    }
  }

  return (
    <DashboardPage>
      <DashboardHeader
        eyebrow="Creator · Opportunities"
        title="Work requests"
        copy="Review collaboration offers, signal interest, or suggest terms that work for you."
      />

      {visibleOffers.length === 0 ? (
        <EmptyState
          title="No work requests yet"
          description="New collaboration offers from businesses will appear here."
          action="Discover campaigns"
          onAction={() => navigate('/search/campaigns')}
        />
      ) : (
        <div className="space-y-5">
          {visibleOffers.map((offer) => {
            const business = businessName(offer)
            const responding = canRespond(offer)
            return (
              <article
                key={offer.id}
                className="overflow-hidden rounded-[1.55rem] border border-white/10 bg-white/[.028] transition duration-300 hover:border-white/[.18]"
              >
                <div className="flex flex-col gap-5 border-b border-white/[.08] p-5 sm:flex-row sm:items-start sm:justify-between lg:p-6">
                  <div className="flex min-w-0 gap-4">
                    <Avatar
                      src={offer.business?.avatar || baseOffer(offer).business?.avatar}
                      alt={business}
                      fallback={initials(business)}
                      className="bg-mint"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-white/45">
                          <Building2 size={13} />
                          {business}
                        </span>
                        <StatusBadge status={offer.status} />
                      </div>
                      <h2 className="mt-2 text-xl font-bold tracking-[-.035em] sm:text-2xl">{offerTitle(offer)}</h2>
                      <p className="mt-2 flex items-center gap-2 text-xs text-white/35">
                        <Handshake size={14} className="text-pink" />
                        {campaignName(offer)}
                      </p>
                    </div>
                  </div>
                  {offer.createdAt && (
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-white/30">
                      <Clock3 size={13} />
                      {new Date(offer.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="p-5 lg:p-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Detail icon={Film} label="Content" value={contentType(offer)} />
                    <Detail icon={Coins} label="Proposed budget" value={money(originalBudget(offer))} />
                    <Detail icon={CalendarDays} label="Timeline" value={originalTimeline(offer)} />
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/[.08] bg-white/[.025] p-4 sm:p-5">
                    <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.13em] text-white/30">
                      <MessageSquare size={13} />
                      Message from {business}
                    </p>
                    <p className="mt-3 max-w-4xl text-sm leading-6 text-white/60">{offerMessage(offer)}</p>
                  </div>

                  {offer.status === 'BUSINESS_CHANGES_REQUESTED' && offer.businessResponse && (
                    <div className="mt-4 rounded-2xl border border-pink/25 bg-pink/[.07] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[.13em] text-pink">Business note</p>
                      <p className="mt-2 text-sm leading-6 text-white/65">
                        {typeof offer.businessResponse === 'string' ? offer.businessResponse : offer.businessResponse.message}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-col gap-2 border-t border-white/[.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-white/35">
                      {responding
                        ? 'Responding does not create a workspace until the business approves.'
                        : STATUS[offer.status]?.label || 'Your response has been recorded.'}
                    </p>
                    {responding && (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          variant="mint"
                          loading={busyAction === `${offer.id}:interested`}
                          disabled={Boolean(busyAction)}
                          onClick={() => markInterested(offer)}
                        >
                          <Check size={15} />
                          Interested
                        </Button>
                        <Button variant="outline" disabled={Boolean(busyAction)} onClick={() => openCounter(offer)}>
                          <RefreshCcw size={14} />
                          Counter proposal
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
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Dialog
        dark
        open={Boolean(counterOffer)}
        onClose={() => !busyAction && setCounterOffer(null)}
        title="Send a counter proposal"
        description={counterOffer ? `Suggest new terms for ${offerTitle(counterOffer)}.` : ''}
      >
        <form className="space-y-4" onSubmit={submitCounter}>
          <Input
            type="number"
            min="1"
            step="1000"
            label="Requested payment"
            value={counter.requestedPayment}
            error={counterErrors.requestedPayment}
            onChange={(event) => setCounter((current) => ({ ...current, requestedPayment: event.target.value }))}
            placeholder="1800000"
          />
          <Input
            label="Available timeline"
            value={counter.timeline}
            error={counterErrors.timeline}
            onChange={(event) => setCounter((current) => ({ ...current, timeline: event.target.value }))}
            placeholder="Available from August 20"
          />
          <Textarea
            label="Content idea"
            value={counter.idea}
            error={counterErrors.idea}
            onChange={(event) => setCounter((current) => ({ ...current, idea: event.target.value }))}
            placeholder="Share your creative direction and proposed content format."
          />
          <Textarea
            label="Additional message"
            value={counter.message}
            onChange={(event) => setCounter((current) => ({ ...current, message: event.target.value }))}
            placeholder="Add any scope details or questions for the business."
            help="Optional"
            rows={3}
          />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" disabled={Boolean(busyAction)} onClick={() => setCounterOffer(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="pink" loading={Boolean(busyAction)}>
              Send counter
              <ArrowRight size={15} />
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        dark
        open={Boolean(declineOffer)}
        onClose={() => !busyAction && setDeclineOffer(null)}
        title="Decline this offer?"
        description="No collaboration workspace will be created. You can optionally share a reason with the business."
      >
        <form className="space-y-4" onSubmit={submitDecline}>
          <Textarea
            label="Reason"
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            placeholder="The timing is not a fit right now..."
            help="Optional"
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" disabled={Boolean(busyAction)} onClick={() => setDeclineOffer(null)}>
              Keep offer
            </Button>
            <Button type="submit" variant="danger" loading={Boolean(busyAction)}>
              <X size={15} />
              Decline offer
            </Button>
          </div>
        </form>
      </Dialog>
    </DashboardPage>
  )
}

export default CreatorWorkRequestsPage
