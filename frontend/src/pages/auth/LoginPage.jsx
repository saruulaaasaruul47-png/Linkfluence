import { useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthIntro } from '../../components/auth/AuthIntro'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton'
import { Button, Checkbox, Input, useToast } from '../../components/ui'
import { useAuth } from '../../context/auth-context'
import { useLanguage } from '../../context/language-context'

function getPostLoginPath(user, requestedPath) {
  const blockedReturnPaths = ['/login', '/register', '/welcome', '/verify-email', '/403', '/401', '/500', '/onboarding/creator', '/onboarding/business']
  const safeRequestedPath = typeof requestedPath === 'string' && requestedPath.startsWith('/') ? requestedPath : ''
  const requestedRole = safeRequestedPath.match(/^\/(creator|business|admin)(?:\/|$)/)?.[1]
  if (safeRequestedPath && !blockedReturnPaths.includes(safeRequestedPath) && (!requestedRole || user.roles.includes(requestedRole))) return safeRequestedPath
  if (user.roles.includes('admin')) return '/admin/dashboard'

  let preferredRole = ''
  try { preferredRole = window.localStorage.getItem('vyra:last-dashboard-role') || '' } catch { /* Role priority below is still safe. */ }
  if (preferredRole && user.roles.includes(preferredRole)) return `/${preferredRole}/dashboard`
  if (user.roles.includes('creator')) return '/creator/dashboard'
  if (user.roles.includes('business')) return '/business/dashboard'
  return '/showcase'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle, isLoading, clearAuthError } = useAuth()
  const { toast } = useToast()
  const { t } = useLanguage()
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
      const user = await login({ email, password, remember })
      toast('Welcome back.', { type: 'success' })
      navigate(getPostLoginPath(user, location.state?.from), { replace: true })
    } catch (error) {
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        try { window.sessionStorage.setItem('vyra:pending-verification-email', email) } catch { /* Session storage is optional. */ }
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

  const signInWithGoogle = async (credential) => {
    if (isLoading) return
    clearAuthError()
    setFormError('')
    try {
      const user = await loginWithGoogle(credential)
      toast('Welcome.', { type: 'success' })
      navigate(getPostLoginPath(user, location.state?.from), { replace: true })
    } catch (error) {
      setFormError(error.message)
    }
  }

  return <AuthLayout eyebrow={t('auth.loginEyebrow')} title={t('auth.loginTitle')} scriptWord={t('auth.loginScript')} copy={t('auth.loginCopy')}>
    <AuthIntro kicker={t('auth.welcomeBack')} title={t('auth.signInTitle')} copy={t('auth.signInCopy')} />
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input name="email" type="email" label={t('auth.email')} placeholder="you@studio.com" error={errors.email} autoComplete="email" reserveMessage />
      <div className="relative">
        <Input name="password" type={show ? 'text' : 'password'} label={t('auth.password')} placeholder={t('auth.enterPassword')} error={errors.password} autoComplete="current-password" reserveMessage />
        <button type="button" onClick={() => setShow(!show)} aria-label={t('auth.togglePassword')} className="absolute right-4 top-[2.65rem] text-[var(--subtle)]">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </div>
      <div className="flex items-center justify-between gap-4">
        <Checkbox label={t('auth.keepSignedIn')} checked={remember} onChange={(event) => setRemember(event.target.checked)} />
        <Link to="/forgot-password" className="text-xs font-bold underline decoration-pink decoration-2 underline-offset-4">{t('auth.forgotPassword')}</Link>
      </div>
      <div aria-live="polite" className="min-h-[3.2rem]">{formError && <p role="alert" className="ui-error rounded-xl border border-red-300/20 bg-red-300/[.06] p-3">{formError}</p>}</div>
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
        {isLoading ? t('auth.signingIn') : t('common.signIn')} <ArrowRight size={17} />
      </Button>
    </form>
    <div className="auth-divider"><span>{t('auth.or')}</span></div>
    <GoogleSignInButton
      disabled={isLoading}
      label={t('auth.continueGoogle')}
      onCredential={signInWithGoogle}
      onError={(error) => setFormError(error.message)}
    />
    <p className="mt-6 text-center text-sm text-[var(--subtle)]">{t('auth.newHere')} <Link to="/register" className="font-bold text-[var(--foreground)] transition hover:text-pink">{t('auth.createAccount')}</Link></p>
  </AuthLayout>
}
