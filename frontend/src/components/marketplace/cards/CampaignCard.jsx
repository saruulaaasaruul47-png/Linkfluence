import { ArrowUpRight, CalendarDays, Send, Users } from 'lucide-react'
import { Badge } from '../../ui'
import { useNavigate } from 'react-router-dom'
import { MarketplaceImage } from '../MarketplaceImage'

export function CampaignCard({ campaign }) {
  const navigate = useNavigate()
  const number = String((campaign.title.charCodeAt(0) % 8) + 1).padStart(2, '0')

  return (
    <article className="group relative isolate min-h-[29rem] overflow-hidden rounded-[1.6rem] border border-white/15 bg-[#171717] transition duration-500 hover:-translate-y-1 hover:border-white/30">
      <MarketplaceImage
        src={campaign.image}
        alt=""
        className="absolute inset-0 size-full object-cover transition duration-1000 group-hover:scale-[1.045]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/95" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-pink/35 via-pink/5 to-transparent mix-blend-screen" />

      <div className="absolute inset-x-5 top-5 flex items-start justify-between">
        <span className="grid size-11 place-items-center rounded-full border border-white/35 text-[11px] tracking-[.1em] backdrop-blur">
          {number}
        </span>
        <div className="max-w-[65%] text-right">
          <span className="block truncate text-[9px] font-bold uppercase tracking-[.13em]">
            {campaign.business}
          </span>
          <span className="mt-1 block truncate text-[8px] uppercase tracking-[.11em] text-white/45">
            {campaign.platform}
          </span>
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-5 text-center">
        <Badge variant={campaign.mode === 'Open' ? 'mint' : 'dark'}>
          {campaign.mode} campaign
        </Badge>
        <p className="mt-3 truncate text-[9px] font-bold uppercase tracking-[.12em] text-white/70">
          {campaign.goal} · {campaign.niche}
        </p>
        <h3 className="mt-3 line-clamp-2 text-[clamp(1.75rem,2.8vw,3rem)] font-medium leading-[.92] tracking-[-.055em]">
          {campaign.title}
        </h3>
        <p className="mt-3 truncate text-[11px] text-white/65">{campaign.deliverables}</p>

        <div className="mt-3 flex items-center justify-center gap-3 text-[8px] uppercase tracking-[.09em] text-white/50">
          <span className="flex items-center gap-1">
            <CalendarDays size={10} />
            {campaign.deadline}
          </span>
          <span className="flex items-center gap-1">
            <Users size={10} />
            {campaign.applications} applied
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-left backdrop-blur-md">
          <span>
            <small className="block text-[8px] uppercase tracking-[.12em] text-white/35">
              Budget
            </small>
            <strong className="mt-0.5 block text-xs">{campaign.budget}</strong>
          </span>
          <span className="text-[9px] uppercase tracking-[.1em] text-white/35">{campaign.mode}</span>
        </div>

        <button
          onClick={() => navigate(`/campaigns/${campaign.id}`)}
          className="mt-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-black transition hover:-translate-y-0.5 hover:bg-pink"
        >
          <Send size={13} />
          <span>View campaign</span>
          <ArrowUpRight size={13} className="ml-auto" />
        </button>
      </div>
    </article>
  )
}
