import { useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthIntro } from '../../components/auth/AuthIntro'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { Button, Checkbox, Input, useToast } from '../../components/ui'
import { useAuth } from '../../context/auth-context'

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading, clearAuthError } = useAuth()
  const { toast } = useToast()
  const [show, setShow] = useState(false)
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (isLoading) return

    clearAuthError()
    setFormError('')
    const data = new FormData(event.currentTarget)
    const values = {
      displayName: String(data.get('displayName') || '').trim(),
      username: String(data.get('username') || '').trim(),
      email: String(data.get('email') || '').trim(),
      password: String(data.get('password') || ''),
      confirmPassword: String(data.get('confirmPassword') || ''),
    }
    const next = {}
    if (values.displayName.length < 2) next.displayName = 'Enter at least 2 characters.'
    if (values.username && !/^[a-zA-Z0-9_]{3,30}$/.test(values.username)) next.username = 'Use 3–30 letters, numbers or underscores.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = 'Enter a valid email address.'
    if (!passwordPattern.test(values.password)) next.password = 'Use 8+ characters with upper, lower, number and symbol.'
    if (values.password !== values.confirmPassword) next.confirmPassword = 'Passwords do not match.'
    if (!terms) next.terms = 'Accept the terms to continue.'
    setErrors(next)
    if (Object.keys(next).length) return

    try {
      const payload = {
        email: values.email,
        displayName: values.displayName,
        password: values.password,
        ...(values.username ? { username: values.username } : {}),
      }
      await register(payload)
      window.sessionStorage.setItem('vyra:pending-verification-email', values.email.toLowerCase())
      toast('Verification code sent to your email.', { type: 'success' })
      navigate('/verify-email', {
        state: {
          email: values.email.toLowerCase(),
          message: 'Enter the code we sent to finish creating your account.',
        },
      })
    } catch (error) {
      if (error.details) setErrors((current) => ({ ...current, ...error.details }))
      setFormError(error.message)
    }
  }

  return <AuthLayout eyebrow="A better creative network" title="START WITH" scriptWord="possibility." copy="Join without labels. Choose how you want to use Influence Hub after your account is ready.">
    <AuthIntro kicker="Create account" title="Your next match starts here" copy="Create one account first. Your Creator or Business channel comes after email verification." />
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input name="displayName" label="Full name" placeholder="Your name" error={errors.displayName} autoComplete="name" reserveMessage />
      <Input name="username" label="Username (optional)" placeholder="your_name" error={errors.username} autoComplete="username" reserveMessage />
      <Input name="email" type="email" label="Email address" placeholder="you@studio.com" error={errors.email} autoComplete="email" reserveMessage />
      <div className="relative">
        <Input name="password" type={show ? 'text' : 'password'} label="Password" placeholder="8+ strong characters" error={errors.password} autoComplete="new-password" reserveMessage />
        <button type="button" onClick={() => setShow(!show)} aria-label="Toggle password" className="absolute right-4 top-[2.65rem] text-[var(--subtle)]">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </div>
      <Input name="confirmPassword" type={show ? 'text' : 'password'} label="Confirm password" placeholder="Repeat your password" error={errors.confirmPassword} autoComplete="new-password" reserveMessage />
      <div>
        <Checkbox label="I agree to the Terms and Privacy Policy" checked={terms} onChange={(event) => setTerms(event.target.checked)} />
        <div className="min-h-6">{errors.terms && <p className="ui-error">{errors.terms}</p>}</div>
      </div>
      <div aria-live="polite" className="min-h-[3.2rem]">{formError && <p role="alert" className="ui-error rounded-xl border border-red-300/20 bg-red-300/[.06] p-3">{formError}</p>}</div>
      <Button type="submit" variant="pink" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating account…' : 'Create account'} <ArrowRight size={17} />
      </Button>
    </form>
    <p className="mt-7 text-center text-sm text-[var(--subtle)]">Already have an account? <Link to="/login" className="font-bold text-[var(--foreground)]">Sign in</Link></p>
  </AuthLayout>
}
