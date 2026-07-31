import { ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MarketplaceImage } from '../MarketplaceImage'

export function CategoryCard({ category, large=false }) {
  const navigate=useNavigate()
  return <button onClick={()=>navigate(`/search/creators?category=${category.id}`)} className={`category-card group relative overflow-hidden rounded-[1.2rem] border border-white/10 text-left ${large?'min-h-[28rem]':'min-h-52'}`}><MarketplaceImage src={category.image} alt="" className="absolute inset-0 size-full object-cover opacity-55 grayscale transition duration-700 group-hover:scale-105 group-hover:opacity-80 group-hover:grayscale-0"/><div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"/><div className="absolute inset-x-4 bottom-4"><div className="flex items-end justify-between"><div><span className="text-[9px] uppercase tracking-[.14em] text-white/40">{category.count} creators</span><h3 className="mt-2 text-2xl font-bold tracking-[-.055em]">{category.name}</h3></div><ArrowUpRight size={17}/></div></div></button>
}
