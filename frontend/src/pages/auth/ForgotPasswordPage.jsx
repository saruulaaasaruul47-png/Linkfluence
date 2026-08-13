import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth.api'
import { parseAuthError } from '../../api/authError'
import { AuthIntro } from '../../components/auth/AuthIntro'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { Button, Input } from '../../components/ui'

const passwordMessage = (value) => {
  if (value.length < 8) return 'Use at least 8 characters'
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return 'Include upper/lowercase, a number and a symbol'
  }
  return ''
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const navigate = useNavigate()
  const redirectTimer = useRef(null)
  useEffect(() => () => window.clearTimeout(redirectTimer.current), [])
  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = window.setInterval(() => {
      setResendIn((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const errorMessage = (error) => parseAuthError(error).message

  const requestCode = async (event) => {
    event?.preventDefault()
    if (!email.trim().includes('@')) {
      setError('Enter a valid email address')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await authApi.forgotPassword({ email: email.trim().toLowerCase() })
      setResendIn(result?.resendAvailableInSeconds || 60)
      setStep('otp')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (event) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await authApi.verifyResetOtp({ email: email.trim().toLowerCase(), otp })
      setResetToken(result.resetToken)
      setStep('password')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const newPassword = String(form.get('password') || '')
    const confirmPassword = String(form.get('confirmPassword') || '')
    const validation = passwordMessage(newPassword)
    if (validation) {
      setError(validation)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authApi.resetPassword({ resetToken, newPassword })
      setStep('done')
      window.clearTimeout(redirectTimer.current)
      redirectTimer.current = window.setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Secure account recovery"
      title="FIND YOUR"
      scriptWord="way back."
      copy="Reset access with a short-lived email code. Existing sessions are closed after your password changes."
    >
      {step === 'email' && (
        <>
          <AuthIntro kicker="Password recovery" title="Request a reset code" copy="For privacy, the confirmation is the same whether or not an account exists." />
          <form onSubmit={requestCode} className="space-y-4" noValidate>
            <Input name="email" type="email" autoComplete="email" label="Email address" placeholder="you@studio.com" value={email} onChange={(event) => setEmail(event.target.value)} error={error} reserveMessage />
            <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset code</Button>
          </form>
        </>
      )}

      {step === 'otp' && (
        <>
          <span className="mb-6 grid size-14 place-items-center rounded-full bg-mint text-black"><Mail size={22} /></span>
          <AuthIntro kicker="Check your email" title="Enter the six-digit code" copy={`If an eligible account exists for ${email}, a short-lived code has been sent.`} />
          <form onSubmit={verifyCode} className="space-y-4" noValidate>
            <Input name="otp" inputMode="numeric" autoComplete="one-time-code" label="Reset code" placeholder="000000" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} error={error} reserveMessage />
            <Button type="submit" size="lg" className="w-full" loading={loading}>Verify code</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={requestCode} disabled={loading || resendIn > 0}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </Button>
          </form>
        </>
      )}

      {step === 'password' && (
        <>
          <span className="mb-6 grid size-14 place-items-center rounded-full bg-pink text-black"><KeyRound size={22} /></span>
          <AuthIntro kicker="Code verified" title="Choose a new password" copy="Your new password closes all existing sessions on every device." />
          <form onSubmit={savePassword} className="space-y-4" noValidate>
            <Input name="password" type="password" autoComplete="new-password" label="New password" error={error} reserveMessage />
            <Input name="confirmPassword" type="password" autoComplete="new-password" label="Confirm password" />
            <Button type="submit" size="lg" className="w-full" loading={loading}>Reset password</Button>
          </form>
        </>
      )}

      {step === 'done' && (
        <div>
          <span className="mb-6 grid size-14 place-items-center rounded-full bg-mint text-black"><CheckCircle2 size={22} /></span>
          <AuthIntro kicker="Password updated" title="Your account is secure" copy="All previous sessions have been closed. Redirecting you to sign in…" />
        </div>
      )}

      <Link to="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-bold">
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </AuthLayout>
  )
}
