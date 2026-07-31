import { ArrowLeft, BriefcaseBusiness, CalendarDays, CheckCircle2, CircleDollarSign, Send, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { campaignApi } from '../../api/campaign.api'
import { toCampaignCard } from '../../api/marketplace.mapper'
import { Badge, Button, EmptyState } from '../../components/ui'
import { CampaignCard } from '../../components/marketplace/cards'
import { SectionHeader } from '../../components/marketplace/MarketplaceLayout'
import { campaigns } from '../../data/marketplace'
import { useMarketplace } from '../../context/marketplace-context'
import { useAuth } from '../../context/auth-context'
import { ProposalDialog } from '../dashboard/CampaignDashboardPages'

export default function MarketplaceCampaignPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { requestChannel, markViewed } = useMarketplace()
  const { hasRole } = useAuth()
  const [campaign, setCampaign] = useState(() => campaigns.find((item) => item.id === id) || null)
  const [loading, setLoading] = useState(!campaign)
  const [proposalOpen, setProposalOpen] = useState(false)

  useEffect(() => {
    let active = true
    campaignApi.get(id)
      .then((result) => {
        if (active) setCampaign(toCampaignCard(result.campaign))
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [id])

  if (loading) return <main className="mx-auto grid min-h-[60vh] max-w-[1500px] place-items-center px-5 py-28"><p className="text-sm text-white/40">Loading campaign…</p></main>
  if (!campaign) return <main className="mx-auto max-w-[1500px] px-5 py-28"><EmptyState title="Campaign not found" /></main>

  const details = [
    [CircleDollarSign, 'Budget', campaign.budget],
    [CalendarDays, 'Deadline', campaign.deadline],
    [BriefcaseBusiness, 'Deliverables', campaign.deliverables],
    [Users, 'Applications', `${campaign.applications} creators`],
  ]

  return <main onMouseEnter={() => markViewed(`campaign:${campaign.id}`)}>
    <section className="relative min-h-[27rem] overflow-hidden border-b border-white/10">
      <img src={campaign.image} alt="" decoding="async" className="absolute inset-0 size-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/25" />
      <div className="relative mx-auto flex min-h-[27rem] max-w-[1500px] flex-col justify-between px-5 py-10 lg:px-8">
        <button type="button" onClick={() => navigate('/search/campaigns')} className="flex w-max items-center gap-2 text-xs text-white/55 hover:text-white"><ArrowLeft size={14} />Back to campaigns</button>
        <div className="max-w-4xl">
          <div className="flex flex-wrap gap-2"><Badge variant={campaign.mode === 'Open' ? 'mint' : 'outline'}>{campaign.mode}</Badge><Badge variant="pink">{campaign.niche}</Badge></div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.14em] text-white/45">{campaign.business} · {campaign.platform}</p>
          <h1 className="mt-4 max-w-5xl break-words text-[clamp(3rem,7vw,6.5rem)] font-black uppercase leading-[.82] tracking-[-.075em]">{campaign.title}</h1>
          <p className="mt-6 max-w-2xl text-sm leading-6 text-white/58">{campaign.goal}. A focused creator brief with clear scope, timeline and collaboration expectations.</p>
        </div>
      </div>
    </section>
    <div className="mx-auto max-w-[1500px] px-5 py-14 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {details.map(([Icon, label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><Icon size={17} className="text-pink" /><p className="mt-5 text-[10px] font-bold uppercase tracking-[.13em] text-white/30">{label}</p><strong className="mt-2 block text-lg">{value}</strong></div>)}
          </div>
          <section className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/[.025] p-6">
            <h2 className="text-2xl font-bold tracking-[-.045em]">What the business is looking for</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {['Clear creative concept', 'Audience and niche fit', 'Reliable delivery plan', 'Transparent usage rights'].map((item) => <p key={item} className="flex items-center gap-3 rounded-xl border border-white/10 p-4 text-sm text-white/60"><CheckCircle2 size={15} className="shrink-0 text-mint" />{item}</p>)}
            </div>
          </section>
        </div>
        <aside className="h-max rounded-[1.6rem] border border-white/12 bg-mint-soft p-6 text-black lg:sticky lg:top-24">
          <p className="text-[10px] font-black uppercase tracking-[.14em] opacity-45">{campaign.mode === 'Open' ? 'Applications open' : 'Invite-only brief'}</p>
          <h2 className="mt-4 text-3xl font-black leading-none tracking-[-.055em]">{campaign.mode === 'Open' ? 'Interested in this work?' : 'Build your channel for future invites.'}</h2>
          <p className="mt-4 text-sm leading-6 opacity-60">A Creator Channel keeps your portfolio, rates and proposal context together.</p>
          <Button className="mt-6 w-full" onClick={() => hasRole('creator') ? setProposalOpen(true) : requestChannel('Applying to campaigns')}><Send size={15} />Apply to campaign</Button>
        </aside>
      </div>
      <section className="mt-20"><SectionHeader eyebrow="More opportunities" title="Similar campaigns" /><div className="grid gap-5 xl:grid-cols-3">{campaigns.filter((item) => item.id !== id).slice(0, 3).map((item) => <CampaignCard key={item.id} campaign={item} />)}</div></section>
    </div>
    <ProposalDialog open={proposalOpen} onClose={() => setProposalOpen(false)} campaign={campaign} />
  </main>
}
