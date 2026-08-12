import { Bookmark, ExternalLink, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMarketplace } from '../../../context/marketplace-context'
import { useAuth } from '../../../context/auth-context'
import { Badge } from '../../ui'
import { MarketplaceImage } from '../MarketplaceImage'

export function ShowcaseCard({ item, compact = false }) {
  const navigate = useNavigate()
  const { saved, toggleSaved, share, openCollection, markViewed } = useMarketplace()
  const { isAuthenticated } = useAuth()
  const key = `showcase:${item.id}`
  const isSaved = saved.includes(key)

  const openDetail = () => {
    markViewed(key)
    navigate(`/showcase/${item.id}`)
  }

  return <article onMouseEnter={() => markViewed(key)} className={`group break-inside-avoid overflow-hidden border border-white/10 bg-[#141414] ${compact ? 'mb-0 rounded-[1.1rem]' : 'mb-5 rounded-[1.35rem]'}`}>
    <div className={`relative overflow-hidden ${item.ratio === 'tall' ? 'aspect-[3/4]' : item.ratio === 'wide' ? 'aspect-[4/3]' : 'aspect-square'}`}>
      <MarketplaceImage src={item.image} alt={item.title} className="size-full object-cover transition duration-700 group-hover:scale-[1.035]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80" />
      <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
        {isAuthenticated&&<button aria-label="Save" onClick={() => toggleSaved(key)} onDoubleClick={() => openCollection(key)} className={`grid size-9 place-items-center rounded-full backdrop-blur-md ${isSaved ? 'bg-pink text-black' : 'bg-black/45'}`}><Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} /></button>}
        <button aria-label="Share" onClick={() => share(item.title, `${window.location.origin}/showcase/${item.id}`, key)} className="grid size-9 place-items-center rounded-full bg-black/45 backdrop-blur-md"><Share2 size={15} /></button>
      </div>
      <div className={compact ? 'absolute inset-x-3 bottom-3' : 'absolute inset-x-4 bottom-4'}><Badge variant="dark">{item.category}</Badge><h3 className={`${compact ? 'mt-2 text-base' : 'mt-3 text-2xl'} font-bold tracking-[-.045em]`}>{item.title}</h3></div>
    </div>
    <div className="p-4"><p className="text-xs text-white/45">{item.creator} × {item.business}</p><div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3"><strong className="text-xs text-mint">{item.performance}</strong><button aria-label="Open detail" onClick={openDetail} className="text-white/45 hover:text-white"><ExternalLink size={15} /></button></div></div>
  </article>
}
