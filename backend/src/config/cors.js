import { env } from './env.js';

function isDevelopmentLoopback(origin) {
  if (env.nodeEnv !== 'development') return false;
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol)
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || origin === env.clientUrl || isDevelopmentLoopback(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
};
