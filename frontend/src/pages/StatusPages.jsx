import { ArrowLeft, ShieldX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { Button } from '../components/ui'

export function ForbiddenPage() {
  const navigate = useNavigate()
  return <main data-theme="dark" className="grid min-h-screen place-items-center bg-ink px-5 text-white"><section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[.035] p-8 sm:p-12"><BrandLogo className="text-white" /><ShieldX className="mt-14 text-pink" size={28} /><p className="eyebrow mt-5 text-pink">403 · Access denied</p><h1 className="mt-4 text-4xl font-bold tracking-[-.055em]">This channel is not available to your account.</h1><p className="mt-4 text-sm leading-6 text-white/45">Switch to an account with the required role or return to your available workspace.</p><Button className="mt-7" variant="outline" onClick={() => navigate(-1)}><ArrowLeft size={15} />Go back</Button></section></main>
}
