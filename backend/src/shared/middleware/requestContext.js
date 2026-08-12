import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';

const redactPath = (url) => String(url || '').replace(/([?&](?:token|code|secret|password)=)[^&]+/gi, '$1[REDACTED]');

export function requestContext(req, res, next) {
  const requestId = String(req.get('x-request-id') || randomUUID()).slice(0, 128);
  const startedAt = process.hrtime.bigint();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const event = {
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 || durationMs >= env.slowRequestThresholdMs ? 'warn' : 'info',
      event: 'http_request',
      requestId,
      method: req.method,
      path: redactPath(req.originalUrl),
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      slow: durationMs >= env.slowRequestThresholdMs,
      slowThresholdMs: env.slowRequestThresholdMs,
      userId: req.user?.id || null,
    };
    const output = JSON.stringify(event);
    if (res.statusCode >= 500) console.error(output);
    else if (res.statusCode >= 400 || event.slow) console.warn(output);
    else console.log(output);
  });
  next();
}
