import { Bookmark, CheckCircle2, Star, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMarketplace } from '../../../context/marketplace-context'
import { useAuth } from '../../../context/auth-context'
import { MarketplaceImage } from '../MarketplaceImage'

export function BusinessCard({ business }) {
  const navigate = useNavigate()
  const { saved, following, toggleSaved, toggleFollowing, markViewed, openCollection } = useMarketplace()
  const { isAuthenticated } = useAuth()
  const key = `business:${business.id}`
  const isSaved = saved.includes(key)
  const isFollowing = following.includes(key)
  const number = String((business.name.charCodeAt(0) % 8) + 1).padStart(2, '0')
  const view = () => { markViewed(key); navigate(`/businesses/${business.id}`) }

  return <article className="group relative isolate min-h-[29rem] overflow-hidden rounded-[1.6rem] border border-white/15 bg-[#171717] transition duration-500 hover:-translate-y-1 hover:border-white/30">
    <MarketplaceImage src={business.cover} alt="" className="absolute inset-0 size-full object-cover transition duration-1000 group-hover:scale-[1.045]" />
    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-black/95" />
    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-mint/30 via-mint/5 to-transparent mix-blend-screen" />
    <div className="absolute inset-x-5 top-5 flex items-start justify-between"><span className="grid size-12 place-items-center rounded-full border border-white/35 text-xs tracking-[.1em] backdrop-blur">{number}</span>{isAuthenticated&&<button aria-label={isSaved ? 'Remove business from saved' : 'Save business and choose collection'} onClick={() => { toggleSaved(key); if (!isSaved) openCollection(key) }} className={`grid size-10 place-items-center rounded-full border backdrop-blur transition hover:scale-105 ${isSaved ? 'border-pink bg-pink text-black' : 'border-white/25 bg-black/20'}`}><Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} /></button>}</div>
    <div className="absolute inset-x-6 bottom-6 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/30 bg-black/45 text-lg font-black backdrop-blur-xl">{business.logo}</span><div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-white/70"><span>{business.industry}</span>{business.verifiedPayer && <CheckCircle2 size={13} className="text-mint" />}</div><h3 className="mt-3 line-clamp-2 text-[clamp(2rem,3vw,3.2rem)] font-medium leading-none tracking-[-.055em]">{business.name}</h3><div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-[.12em] text-white/60"><span>{business.campaigns} active campaigns</span><span className="flex items-center gap-1"><Star size={10} fill="currentColor" />{business.rating}</span></div><div className="mt-4 flex gap-2">{isAuthenticated&&<button aria-label={isFollowing ? `Unfollow ${business.name}` : `Follow ${business.name}`} onClick={() => toggleFollowing(key)} className={`grid size-12 shrink-0 place-items-center rounded-full border ${isFollowing ? 'border-mint bg-mint text-black' : 'border-white/35 bg-black/20 backdrop-blur'}`}><UserPlus size={17} /></button>}<button onClick={view} className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-black transition hover:bg-mint">View channel <span className="ml-auto">↗</span></button></div></div>
  </article>
}
