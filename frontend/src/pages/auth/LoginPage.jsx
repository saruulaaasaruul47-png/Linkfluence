import { useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthIntro } from '../../components/auth/AuthIntro'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { Button, Checkbox, Input, useToast } from '../../components/ui'
import { useAuth } from '../../context/auth-context'

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4"><path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.74 2.98-4.31 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.05A10 10 0 0 0 2 12c0 1.64.39 3.19 1.05 4.55l3.34-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.78.5 3.82 1.49l2.88-2.88A9.67 9.67 0 0 0 12 2a10 10 0 0 0-8.95 5.45l3.34 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>
}

function getPostLoginPath(user, requestedPath) {
  const onboardingPaths = ['/welcome', '/verify-email', '/onboarding/creator', '/onboarding/business']
  if (requestedPath && !onboardingPaths.includes(requestedPath)) return requestedPath
  if (user.roles.includes('admin')) return '/admin/dashboard'

  const preferredRole = window.localStorage.getItem('vyra:last-dashboard-role')
  if (preferredRole && user.roles.includes(preferredRole)) return `/${preferredRole}/dashboard`
  if (user.roles.includes('creator')) return '/creator/dashboard'
  if (user.roles.includes('business')) return '/business/dashboard'
  return '/discover'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, clearAuthError } = useAuth()
  const { toast } = useToast()
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (isLoading) return

    clearAuthError()
    setFormError('')
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim().toLowerCase()
    const password = String(data.get('password') || '')
    const next = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    if (Object.keys(next).length) return

    try {
      const user = await login({ email, password })
      toast('Welcome back.', { type: 'success' })
      navigate(getPostLoginPath(user, location.state?.from), { replace: true })
    } catch (error) {
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        window.sessionStorage.setItem('vyra:pending-verification-email', email)
        navigate('/verify-email', {
          state: {
            email,
            message: error.message,
          },
        })
        return
      }
      if (error.details) setErrors((current) => ({ ...current, ...error.details }))
      setFormError(error.message)
    }
  }

  return <AuthLayout eyebrow="Creator marketplace · Sign in" title="MAKE WORK" scriptWord="matter." copy="One place for creators and brands to discover the right fit, shape sharper campaigns and move culture together.">
    <AuthIntro kicker="Welcome back" title="Sign in to Influence Hub" copy="Continue where your next collaboration left off." />
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input name="email" type="email" label="Email address" placeholder="you@studio.com" error={errors.email} autoComplete="email" reserveMessage />
      <div className="relative">
        <Input name="password" type={show ? 'text' : 'password'} label="Password" placeholder="Enter your password" error={errors.password} autoComplete="current-password" reserveMessage />
        <button type="button" onClick={() => setShow(!show)} aria-label="Toggle password" className="absolute right-4 top-[2.65rem] text-[var(--subtle)]">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </div>
      <div className="flex items-center justify-between gap-4">
        <Checkbox label="Keep me signed in" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
        <Link to="/forgot-password" className="text-xs font-bold underline decoration-pink decoration-2 underline-offset-4">Forgot password?</Link>
      </div>
      <div aria-live="polite" className="min-h-[3.2rem]">{formError && <p role="alert" className="ui-error rounded-xl border border-red-300/20 bg-red-300/[.06] p-3">{formError}</p>}</div>
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
        {isLoading ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} />
      </Button>
    </form>
    <div className="auth-divider"><span>or</span></div>
    <button type="button" className="auth-google-button" onClick={() => toast('Google OAuth is not connected yet.', { type: 'info' })}><GoogleMark/><span>Continue with Google</span></button>
    <p className="mt-6 text-center text-sm text-[var(--subtle)]">New to the Hub? <Link to="/register" className="font-bold text-[var(--foreground)] transition hover:text-pink">Create an account</Link></p>
  </AuthLayout>
}
