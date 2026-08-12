import { useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthIntro } from '../../components/auth/AuthIntro'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { Button, Checkbox, Input, useToast } from '../../components/ui'
import { useAuth } from '../../context/auth-context'
import { useLanguage } from '../../context/language-context'

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading, clearAuthError } = useAuth()
  const { toast } = useToast()
  const { t } = useLanguage()
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
      try { window.sessionStorage.setItem('vyra:pending-verification-email', values.email.toLowerCase()) } catch { /* Session storage is optional. */ }
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

  return <AuthLayout eyebrow={t('auth.registerEyebrow')} title={t('auth.registerTitle')} scriptWord={t('auth.registerScript')} copy={t('auth.registerCopy')}>
    <AuthIntro kicker={t('auth.createKicker')} title={t('auth.registerIntroTitle')} copy={t('auth.registerIntroCopy')} />
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input name="displayName" label={t('auth.fullName')} placeholder={t('auth.yourName')} error={errors.displayName} autoComplete="name" reserveMessage />
      <Input name="username" label={t('auth.usernameOptional')} placeholder="your_name" error={errors.username} autoComplete="username" reserveMessage />
      <Input name="email" type="email" label={t('auth.email')} placeholder="you@studio.com" error={errors.email} autoComplete="email" reserveMessage />
      <div className="relative">
        <Input name="password" type={show ? 'text' : 'password'} label={t('auth.password')} placeholder={t('auth.strongPassword')} error={errors.password} autoComplete="new-password" reserveMessage />
        <button type="button" onClick={() => setShow(!show)} aria-label={t('auth.togglePassword')} className="absolute right-4 top-[2.65rem] text-[var(--subtle)]">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </div>
      <Input name="confirmPassword" type={show ? 'text' : 'password'} label={t('auth.confirmPassword')} placeholder={t('auth.repeatPassword')} error={errors.confirmPassword} autoComplete="new-password" reserveMessage />
      <div>
        <Checkbox label={t('auth.agreeTerms')} checked={terms} onChange={(event) => setTerms(event.target.checked)} />
        <div className="min-h-6">{errors.terms && <p className="ui-error">{errors.terms}</p>}</div>
      </div>
      <div aria-live="polite" className="min-h-[3.2rem]">{formError && <p role="alert" className="ui-error rounded-xl border border-red-300/20 bg-red-300/[.06] p-3">{formError}</p>}</div>
      <Button type="submit" variant="pink" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')} <ArrowRight size={17} />
      </Button>
    </form>
    <p className="mt-7 text-center text-sm text-[var(--subtle)]">{t('auth.alreadyAccount')} <Link to="/login" className="font-bold text-[var(--foreground)]">{t('common.signIn')}</Link></p>
  </AuthLayout>
}
