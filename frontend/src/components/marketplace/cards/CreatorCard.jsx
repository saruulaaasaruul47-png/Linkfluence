import { ArrowUpRight, Bookmark, BriefcaseBusiness, CheckCircle2, Star, UserCheck, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMarketplace } from '../../../context/marketplace-context'
import { useCollaboration } from '../../../context/collaboration-context'
import { useAuth } from '../../../context/auth-context'
import { MarketplaceImage } from '../MarketplaceImage'

export function CreatorCard({ creator, compact = false }) {
  const navigate = useNavigate()
  const { saved, following, toggleSaved, toggleFollowing, markViewed, openCollection } = useMarketplace()
  const { openOfferComposer } = useCollaboration()
  const { isAuthenticated, hasRole } = useAuth()
  const key = `creator:${creator.id}`
  const isSaved = saved.includes(key)
  const isFollowing = following.includes(key)
  const number = String((creator.name.charCodeAt(0) % 8) + 1).padStart(2, '0')
  const view = () => { markViewed(key); navigate(`/creators/${creator.id}`) }

  return (
    <article className={`group relative isolate overflow-hidden border border-white/15 bg-[#171717] ${compact ? 'min-h-[22rem] rounded-[1.3rem]' : 'min-h-[30rem] rounded-[1.6rem]'} transition duration-500 hover:-translate-y-1 hover:border-white/30`}>
      <MarketplaceImage src={creator.cover} alt="" className="absolute inset-0 size-full object-cover transition duration-1000 group-hover:scale-[1.045]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/90" />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-pink/45 via-pink/10 to-transparent mix-blend-screen" />

      <div className={`absolute flex items-start justify-between ${compact ? 'inset-x-3 top-3' : 'inset-x-5 top-5'}`}>
        <span className={`grid place-items-center rounded-full border border-white/35 tracking-[.1em] backdrop-blur-md ${compact ? 'size-8 text-[9px]' : 'size-12 text-xs'}`}>{number}</span>
        <div className="flex min-w-0 items-center gap-2">
          <span className="max-w-32 truncate text-[10px] font-bold uppercase tracking-[.13em] text-white/75">{creator.location}</span>
          {isAuthenticated && <button
            aria-label={isSaved ? 'Remove creator from saved' : 'Save creator and choose collection'}
            onClick={() => { toggleSaved(key); if (!isSaved) openCollection(key) }}
            className={`grid shrink-0 place-items-center rounded-full border backdrop-blur-md transition hover:scale-105 ${compact ? 'size-8' : 'size-10'} ${isSaved ? 'border-pink bg-pink text-black' : 'border-white/25 bg-black/20'}`}
          >
            <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
          </button>}
        </div>
      </div>

      <div className={`absolute text-center ${compact ? 'inset-x-3 bottom-3' : 'inset-x-6 bottom-6'}`}>
        <div className={`flex items-center justify-center gap-2 font-bold uppercase text-white/80 ${compact ? 'text-[8px] tracking-[.11em]' : 'text-[10px] tracking-[.14em]'}`}>
          <span>{creator.niche}</span>
          {creator.verified && <CheckCircle2 size={13} className="text-mint" />}
        </div>
        <h3 className={`line-clamp-2 font-medium leading-none tracking-[-.045em] ${compact ? 'mt-1.5 text-[clamp(1.3rem,1.6vw,1.75rem)]' : 'mt-3 text-[clamp(2rem,3.2vw,3.2rem)]'}`}>{creator.name}</h3>
        <div className={`flex items-center justify-center font-bold uppercase text-white/65 ${compact ? 'mt-2 gap-2 text-[8px] tracking-[.08em]' : 'mt-4 gap-4 text-[10px] tracking-[.12em]'}`}>
          <span>{creator.followers} followers</span>
          <span className="flex items-center gap-1"><Star size={10} fill="currentColor" />{creator.rating}</span>
          <span>{creator.engagement} ER</span>
        </div>
        <div className={`flex ${compact ? 'mt-3 gap-1.5' : 'mt-5 gap-2'}`}>
          {isAuthenticated && <button
            onClick={() => toggleFollowing(key)}
            className={`grid shrink-0 place-items-center rounded-full border transition ${compact ? 'size-9' : 'size-11'} ${isFollowing ? 'border-mint bg-mint text-black' : 'border-white/35 bg-black/20 text-white backdrop-blur'}`}
            aria-label={isFollowing ? `Unfollow ${creator.name}` : `Follow ${creator.name}`}
          >
            {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
          </button>}
          {hasRole('business') && <button
            onClick={() => openOfferComposer(creator)}
            className={`grid shrink-0 place-items-center rounded-full border border-mint/60 bg-mint text-black transition hover:scale-105 ${compact ? 'size-9' : 'size-11'}`}
            aria-label={`Send ${creator.name} a work offer`}
            title="Send Work Offer"
          >
            <BriefcaseBusiness size={15} />
          </button>}
          <button onClick={view} className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-bold text-black transition hover:bg-pink ${compact ? 'min-h-9' : 'min-h-11'}`}>
            <span className="truncate">View</span>
            <ArrowUpRight className="shrink-0" size={13} />
          </button>
        </div>
        <p className={`${compact ? 'mt-2 text-[8px]' : 'mt-3 text-[10px]'} uppercase tracking-[.12em] text-white/45`}>Starting at {creator.price}</p>
      </div>
    </article>
  )
}
