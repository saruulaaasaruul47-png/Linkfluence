import { useEffect, useState } from 'react'
import { ArrowRight, MailCheck } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthIntro } from '../../components/auth/AuthIntro'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { Button, Input, useToast } from '../../components/ui'
import { useAuth } from '../../context/auth-context'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyEmail, resendOtp, isLoading, clearAuthError } = useAuth()
  const { toast } = useToast()
  const savedEmail = window.sessionStorage.getItem('vyra:pending-verification-email') || ''
  const [email, setEmail] = useState(location.state?.email || savedEmail)
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = window.setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const submit = async (event) => {
    event.preventDefault()
    if (isLoading) return

    clearAuthError()
    setFormError('')
    const normalizedEmail = email.trim().toLowerCase()
    const next = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) next.email = 'Enter a valid email address.'
    if (!/^\d{6}$/.test(code)) next.otp = 'Enter the 6-digit code.'
    setErrors(next)
    if (Object.keys(next).length) return

    try {
      await verifyEmail({ email: normalizedEmail, otp: code })
      window.sessionStorage.removeItem('vyra:pending-verification-email')
      toast('Email verified. Your account is ready.', { type: 'success' })
      navigate('/welcome', { replace: true })
    } catch (error) {
      if (error.details) setErrors((current) => ({ ...current, ...error.details }))
      setFormError(error.message)
    }
  }

  const resend = async () => {
    if (isLoading || cooldown > 0) return
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrors({ email: 'Enter a valid email address.' })
      return
    }

    clearAuthError()
    setFormError('')
    try {
      await resendOtp({ email: normalizedEmail })
      setCooldown(60)
      toast('A new verification code was sent.', { type: 'success' })
    } catch (error) {
      if (error.details?.retryAfterSeconds) setCooldown(error.details.retryAfterSeconds)
      setFormError(error.message)
    }
  }

  return <AuthLayout eyebrow="One last detail" title="VERIFY &" scriptWord="begin." copy="A small step that keeps the network thoughtful, trusted and ready for real collaboration.">
    <span className="mb-6 grid size-14 place-items-center rounded-full bg-pink-soft text-[#7d1f50]"><MailCheck size={22} /></span>
    <AuthIntro kicker="Verify email" title="We sent you a code" copy={location.state?.message || 'Enter the six-digit code sent to your email. It expires in 10 minutes.'} />
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} error={errors.email} autoComplete="email" reserveMessage />
      <Input label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setErrors((current) => ({ ...current, otp: '' })) }} placeholder="000000" error={errors.otp} reserveMessage className="[&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[.55em]" />
      <div aria-live="polite" className="min-h-[3.2rem]">{formError && <p role="alert" className="ui-error rounded-xl border border-red-300/20 bg-red-300/[.06] p-3">{formError}</p>}</div>
      <Button type="submit" variant="pink" size="lg" className="w-full" disabled={isLoading || code.length !== 6}>
        {isLoading ? 'Checking code…' : 'Verify email'} <ArrowRight size={17} />
      </Button>
    </form>
    <div className="mt-6 flex items-center justify-between gap-4 text-sm">
      <button type="button" onClick={resend} disabled={isLoading || cooldown > 0} className="font-bold underline decoration-mint decoration-4 underline-offset-4 disabled:cursor-not-allowed disabled:opacity-45">
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
      </button>
      <Link to="/login" className="font-bold text-[var(--subtle)] hover:text-[var(--foreground)]">Back to login</Link>
    </div>
  </AuthLayout>
}
