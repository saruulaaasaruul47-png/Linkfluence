import { useMemo, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Send } from 'lucide-react'
import { campaigns } from '../../data/marketplace'
import { useCollaboration } from '../../context/collaboration-context'
import { Button, Dialog, Input, Select, Textarea, useToast } from '../ui'

const summerCampaign = { id: 'summer-product-launch', title: 'Summer Product Launch' }
const initialForm = {
  campaignId: summerCampaign.id,
  title: 'Lifestyle Reel Collaboration',
  contentType: 'Instagram Reel',
  budget: 'MNT 1,500,000',
  timeline: 'August 2026',
  message: 'Your content feels like a strong fit for our campaign. We would love to explore a creator-led collaboration together.',
}

export function WorkOfferDialog() {
  const { offerComposerCreator, closeOfferComposer, sendOffer } = useCollaboration()
  const { toast } = useToast()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const campaignOptions = useMemo(
    () => [summerCampaign, ...campaigns].map((campaign) => ({ label: campaign.title, value: campaign.id })),
    [],
  )

  const close = () => {
    setForm(initialForm)
    setErrors({})
    closeOfferComposer()
  }

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = async (event) => {
    event.preventDefault()
    const required = ['campaignId', 'title', 'contentType', 'budget', 'timeline', 'message']
    const nextErrors = Object.fromEntries(
      required
        .filter((key) => !form[key]?.trim())
        .map((key) => [key, 'This field is required.']),
    )
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const selectedCampaign = [summerCampaign, ...campaigns].find((campaign) => campaign.id === form.campaignId)
    try {
      await sendOffer(offerComposerCreator, { ...form, campaign: { id: selectedCampaign.id, title: selectedCampaign.title } })
      setForm(initialForm)
      setErrors({})
      toast(`Work offer sent to ${offerComposerCreator.name}.`, { type: 'success' })
    } catch (error) {
      toast(error?.message || 'The work offer could not be sent.', { type: 'error' })
    }
  }

  return (
    <Dialog
      dark
      open={Boolean(offerComposerCreator)}
      onClose={close}
      title={`Send ${offerComposerCreator?.name || 'creator'} a work offer`}
      description="Start with the essentials. Detailed terms are negotiated only after the creator responds and you approve."
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="flex items-center gap-3 rounded-2xl border border-mint/20 bg-mint/[.06] p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-black">
            <BriefcaseBusiness size={18} />
          </span>
          <span>
            <small className="block text-[10px] uppercase tracking-[.13em] text-white/35">From</small>
            <strong className="text-sm">Northstar Studio</strong>
          </span>
        </div>

        <Select
          label="Campaign"
          name="campaignId"
          value={form.campaignId}
          options={campaignOptions}
          error={errors.campaignId}
          onChange={update('campaignId')}
        />
        <Input
          label="Offer title"
          value={form.title}
          error={errors.title}
          onChange={update('title')}
          placeholder="Lifestyle Reel Collaboration"
        />
        <Input
          label="General content type"
          value={form.contentType}
          error={errors.contentType}
          onChange={update('contentType')}
          placeholder="Instagram Reel"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Proposed budget"
            value={form.budget}
            error={errors.budget}
            onChange={update('budget')}
            placeholder="MNT 1,500,000"
          />
          <Input
            label="Expected timeline"
            value={form.timeline}
            error={errors.timeline}
            onChange={update('timeline')}
            placeholder="August 2026"
          />
        </div>
        <Textarea
          label="Message to creator"
          rows={4}
          value={form.message}
          error={errors.message}
          onChange={update('message')}
          placeholder="Why this creator and campaign are a good fit..."
        />

        <div className="rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs leading-5 text-white/40">
          Sending creates a <strong className="text-white/65">PENDING_CREATOR_RESPONSE</strong> offer. A workspace is not created yet.
        </div>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button type="submit" variant="mint">
            <Send size={15} />
            Send offer
            <ArrowRight size={14} />
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
