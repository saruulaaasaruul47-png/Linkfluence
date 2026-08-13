import * as Sentry from '@sentry/node';
import { env } from '../../config/env.js';

let initialized = false;

export function initializeErrorReporter() {
  if (!env.sentryDsn || initialized) return false;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    tracesSampleRate: env.sentryTracesSampleRate,
    sendDefaultPii: false,
  });
  initialized = true;
  return true;
}

export function reportError(error, context = {}) {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context.requestId) scope.setTag('request_id', context.requestId);
    if (context.method) scope.setTag('http_method', context.method);
    if (context.path) scope.setContext('request', { path: context.path });
    if (context.userId) scope.setUser({ id: context.userId });
    Sentry.captureException(error);
  });
}

export async function closeErrorReporter() {
  if (initialized) await Sentry.close(2_000);
  initialized = false;
}
