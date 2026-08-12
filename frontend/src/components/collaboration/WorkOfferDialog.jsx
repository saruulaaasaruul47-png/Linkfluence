import { useEffect, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Send } from 'lucide-react'
import { campaignApi } from '../../api/campaign.api'
import { useCollaboration } from '../../context/collaboration-context'
import { useMarketplace } from '../../context/marketplace-context'
import { Button, Dialog, Input, Select, Textarea, useToast } from '../ui'

const emptyForm = {
  campaignId: '',
  title: '',
  contentType: '',
  paymentType: 'PAID',
  budget: '',
  providedItem: '',
  barterDescription: '',
  estimatedValue: '',
  deliveryMethod: '',
  expectedDeliveryDate: '',
  timeline: '',
  message: '',
}

export function WorkOfferDialog() {
  const { offerComposerCreator, closeOfferComposer, sendOffer } = useCollaboration()
  const { account } = useMarketplace()
  const { toast } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [campaigns, setCampaigns] = useState([])

  useEffect(() => {
    if (!offerComposerCreator) return
    campaignApi.listMine({ limit: 50 }).then((result) => setCampaigns(result.items || [])).catch(() => setCampaigns([]))
  }, [offerComposerCreator])

  const campaignOptions = [
    { label: 'No specific campaign (direct offer)', value: '' },
    ...campaigns.map((campaign) => ({ label: campaign.title, value: campaign.id })),
  ]

  const close = () => {
    setForm(emptyForm)
    setErrors({})
    closeOfferComposer()
  }

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = async (event) => {
    event.preventDefault()
    const required = ['title', 'contentType', 'timeline', 'message']
    if (form.paymentType !== 'BARTER') required.push('budget')
    if (form.paymentType !== 'PAID') required.push('providedItem', 'barterDescription', 'estimatedValue', 'deliveryMethod')
    const nextErrors = Object.fromEntries(
      required
        .filter((key) => !form[key]?.trim())
        .map((key) => [key, 'This field is required.']),
    )
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const selectedCampaign = campaigns.find((campaign) => campaign.id === form.campaignId)
    try {
      await sendOffer(offerComposerCreator, {
        ...form,
        budget: form.paymentType === 'BARTER' ? '0' : form.budget,
        ...(['BARTER', 'HYBRID'].includes(form.paymentType) && {
          barterDetails: {
            providedItem: form.providedItem.trim(),
            description: form.barterDescription.trim(),
            estimatedValue: Number(String(form.estimatedValue).replace(/[^0-9.]/g, '')),
            currency: 'MNT',
            deliveryMethod: form.deliveryMethod.trim(),
            expectedDeliveryDate: form.expectedDeliveryDate || undefined,
          },
        }),
        ...(selectedCampaign && { campaign: { id: selectedCampaign.id, title: selectedCampaign.title } }),
      })
      setForm(emptyForm)
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
            <strong className="text-sm">{account.business.name || 'Your business channel'}</strong>
          </span>
        </div>

        <Select
          label="Campaign (optional)"
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
        <Select
          label="Compensation type"
          value={form.paymentType}
          options={[
            { label: 'Paid · cash compensation', value: 'PAID' },
            { label: 'Barter · product or service', value: 'BARTER' },
            { label: 'Hybrid · cash + product/service', value: 'HYBRID' },
          ]}
          onChange={update('paymentType')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {form.paymentType !== 'BARTER' && <Input label="Cash compensation" value={form.budget} error={errors.budget} onChange={update('budget')} placeholder="MNT 1,500,000" />}
          <Input
            label="Expected timeline"
            value={form.timeline}
            error={errors.timeline}
            onChange={update('timeline')}
            placeholder="August 2026"
          />
        </div>
        {form.paymentType !== 'PAID' && <div className="space-y-4 rounded-2xl border border-pink/20 bg-pink/[.045] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-pink">Product / service exchange</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="What will be provided" value={form.providedItem} error={errors.providedItem} onChange={update('providedItem')} placeholder="Skincare package" />
            <Input label="Estimated value" value={form.estimatedValue} error={errors.estimatedValue} onChange={update('estimatedValue')} placeholder="MNT 500,000" />
          </div>
          <Textarea label="Description" rows={3} value={form.barterDescription} error={errors.barterDescription} onChange={update('barterDescription')} placeholder="Products, quantities and included services" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Delivery method" value={form.deliveryMethod} error={errors.deliveryMethod} onChange={update('deliveryMethod')} placeholder="Courier delivery" />
            <Input label="Expected delivery date" type="date" value={form.expectedDeliveryDate} onChange={update('expectedDeliveryDate')} />
          </div>
          <p className="text-[11px] leading-5 text-white/40">Estimated value is informational only. Commission is never calculated from it.</p>
        </div>}
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
