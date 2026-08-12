import { ArrowLeft, Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  const navigate=useNavigate()
  return <main data-theme="dark" className="grid min-h-screen place-items-center bg-ink px-5 text-white"><section className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/[.035] p-7 sm:p-12"><BrandLogo className="text-white"/><p className="eyebrow mt-16 text-pink">404 · Route not found</p><h1 className="mt-4 text-5xl font-bold tracking-[-.065em] sm:text-7xl">This page moved or never existed.</h1><p className="mt-5 max-w-lg text-sm leading-6 text-white/45">Return to the marketplace or use the previous page. Your saved account data is still safe.</p><div className="mt-8 flex flex-wrap gap-2"><Button variant="pink" onClick={()=>navigate('/discover')}><Compass size={15}/>Go to Discover</Button><Button variant="outline" onClick={()=>navigate(-1)}><ArrowLeft size={15}/>Go back</Button></div></section></main>
}
