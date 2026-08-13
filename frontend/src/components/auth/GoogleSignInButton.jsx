import { useEffect, useRef, useState } from 'react'

const GOOGLE_SCRIPT_ID = 'google-identity-services'
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
let googleScriptPromise

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4"><path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.74 2.98-4.31 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.05A10 10 0 0 0 2 12c0 1.64.39 3.19 1.05 4.55l3.34-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.78.5 3.82 1.49l2.88-2.88A9.67 9.67 0 0 0 12 2a10 10 0 0 0-8.95 5.45l3.34 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID)
    const script = existing || document.createElement('script')
    const loaded = () => window.google?.accounts?.id
      ? resolve(window.google)
      : reject(new Error('Google Identity Services did not initialize.'))

    script.addEventListener('load', loaded, { once: true })
    script.addEventListener('error', () => reject(new Error('Google Identity Services could not be loaded.')), { once: true })
    if (!existing) {
      script.id = GOOGLE_SCRIPT_ID
      script.src = GOOGLE_SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  }).catch((error) => {
    googleScriptPromise = null
    throw error
  })

  return googleScriptPromise
}

export function GoogleSignInButton({ disabled = false, label = 'Continue with Google', onCredential, onError }) {
  const buttonRef = useRef(null)
  const callbackRef = useRef(onCredential)
  const errorRef = useRef(onError)
  const [loadError, setLoadError] = useState('')
  const [ready, setReady] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

  useEffect(() => { callbackRef.current = onCredential }, [onCredential])
  useEffect(() => { errorRef.current = onError }, [onError])

  useEffect(() => {
    let active = true
    if (!clientId) return undefined

    loadGoogleIdentityServices()
      .then((google) => {
        if (!active || !buttonRef.current) return
        setLoadError('')
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) callbackRef.current?.(response.credential)
            else errorRef.current?.(new Error('Google did not return a sign-in credential.'))
          },
          cancel_on_tap_outside: true,
        })
        buttonRef.current.replaceChildren()
        google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width: Math.min(400, Math.max(240, Math.floor(buttonRef.current.clientWidth))),
        })
        setReady(true)
      })
      .catch((error) => {
        if (!active) return
        setReady(false)
        setLoadError(error.message)
        errorRef.current?.(error)
      })

    return () => { active = false }
  }, [clientId])

  if (!clientId) {
    return <button
      type="button"
      className="auth-google-button"
      disabled={disabled}
      title="Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in."
      onClick={() => errorRef.current?.(new Error('Google sign-in needs a Google Web Client ID in the environment settings.'))}
    >
      <GoogleMark/><span>{label}</span>
    </button>
  }

  return <div className={`google-signin-shell ${disabled ? 'is-disabled' : ''}`} aria-busy={disabled}>
    {!ready && !loadError && <div className="auth-google-button google-signin-placeholder" aria-hidden="true">
      <GoogleMark/><span>{label}</span>
    </div>}
    <div ref={buttonRef} className={`google-signin-render ${ready ? 'is-ready' : ''}`} />
    {loadError && <p role="alert" className="mt-2 text-center text-xs text-red-200">{loadError}</p>}
  </div>
}
