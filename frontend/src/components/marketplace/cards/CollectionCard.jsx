import { ArrowUpRight, Bookmark } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MarketplaceImage } from '../MarketplaceImage'

export function CollectionCard({ collection }) {
  const navigate=useNavigate()
  return <button onClick={()=>navigate(`/collections/${collection.id}`)} className="group relative min-h-80 overflow-hidden rounded-[1.5rem] border border-white/10 text-left"><MarketplaceImage src={collection.cover} alt="" className="absolute inset-0 size-full object-cover opacity-60 transition duration-700 group-hover:scale-105 group-hover:opacity-75"/><div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"/><div className="absolute inset-x-5 bottom-5"><div className="flex items-center justify-between"><Bookmark size={16} className="text-pink"/><span className="flex items-center gap-2 text-[9px] uppercase tracking-[.12em] text-white/40">{collection.visibility}<ArrowUpRight size={17} className="transition group-hover:translate-x-1 group-hover:-translate-y-1"/></span></div><h3 className="mt-10 text-2xl font-bold leading-none tracking-[-.055em]">{collection.name}</h3><p className="mt-3 text-xs leading-5 text-white/45">{collection.description}</p><span className="mt-4 block text-[10px] uppercase tracking-[.15em] text-white/30">{collection.items.length} items</span></div></button>
}
