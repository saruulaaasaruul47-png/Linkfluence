import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()

export function initializeMonitoring() {
  if (!dsn) return false
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
  })
  return true
}

export function reportFrontendError(error, context = {}) {
  if (!dsn) return
  Sentry.withScope((scope) => {
    scope.setContext('react', { componentStack: context.componentStack })
    Sentry.captureException(error)
  })
}
