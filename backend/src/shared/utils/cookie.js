import { env } from '../../config/env.js';

function durationToMilliseconds(value) {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * units[match[2]];
}

export function refreshCookieOptions({ clear = false, persistent = true } = {}) {
  const options = {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/api/v1/auth',
  };
  if (!clear && persistent) options.maxAge = durationToMilliseconds(env.jwtRefreshExpiresIn);
  return options;
}
