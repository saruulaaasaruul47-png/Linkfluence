import { Bookmark, Share2 } from 'lucide-react'
import { useMarketplace } from '../../../context/marketplace-context'
import { useAuth } from '../../../context/auth-context'
import { MarketplaceImage } from '../MarketplaceImage'

export function ContentCard({ id, image, title, meta, tall = false }) {
  const { saved, toggleSaved, share }=useMarketplace(); const key=`content:${id}`; const isSaved=saved.includes(key)
  const { isAuthenticated }=useAuth()
  return <article className="group relative mb-5 break-inside-avoid overflow-hidden rounded-[1.25rem] border border-white/10"><MarketplaceImage src={image} alt={title} className={`w-full object-cover transition duration-700 group-hover:scale-105 ${tall?'aspect-[3/4]':'aspect-[4/3]'}`}/><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"/><div className="absolute right-3 top-3 flex gap-2">{isAuthenticated&&<button onClick={()=>toggleSaved(key)} className={`grid size-9 place-items-center rounded-full backdrop-blur ${isSaved?'bg-pink text-black':'bg-black/40'}`}><Bookmark size={15}/></button>}<button onClick={()=>share(title,window.location.href,key)} className="grid size-9 place-items-center rounded-full bg-black/40 backdrop-blur"><Share2 size={15}/></button></div><div className="absolute inset-x-4 bottom-4"><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-xs text-white/45">{meta}</p></div></article>
}
