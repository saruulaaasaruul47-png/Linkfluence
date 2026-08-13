import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { BrandLogo } from './BrandLogo'
import { Button } from './ui'
import { reportFrontendError } from '../monitoring'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    reportFrontendError(error, { componentStack: info.componentStack })
    window.dispatchEvent(new CustomEvent('vyra:frontend-error', { detail: { message: error.message, componentStack: info.componentStack } }))
  }

  render() {
    if (!this.state.error) return this.props.children
    return <main data-theme="dark" className="grid min-h-screen place-items-center bg-ink px-5 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[.035] p-8 sm:p-12">
        <BrandLogo className="text-white" />
        <AlertTriangle className="mt-14 text-pink" size={28} />
        <p className="eyebrow mt-5 text-pink">500 · Interface error</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-.055em]">This screen could not load.</h1>
        <p className="mt-4 text-sm leading-6 text-white/45">Your local data is still stored. Reload the page to restore the interface.</p>
        <Button className="mt-7" variant="pink" onClick={() => window.location.reload()}><RefreshCw size={15} />Reload page</Button>
      </section>
    </main>
  }
}
