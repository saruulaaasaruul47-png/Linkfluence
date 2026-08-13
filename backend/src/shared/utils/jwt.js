import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

function expiresAtFromToken(token) {
  const payload = jwt.decode(token);
  if (!payload || typeof payload === 'string' || !payload.exp) {
    throw new Error('JWT expiry could not be determined.');
  }
  return new Date(payload.exp * 1000);
}

export function signAccessToken(user) {
  return jwt.sign(
    { type: 'access', roles: user.roles, sessionVersion: user.sessionVersion ?? 0 },
    env.jwtAccessSecret,
    { subject: user.id, expiresIn: env.jwtAccessExpiresIn },
  );
}

export function signRefreshToken(userId, jti, persistent = true) {
  const token = jwt.sign(
    { type: 'refresh', persistent },
    env.jwtRefreshSecret,
    { subject: userId, jwtid: jti, expiresIn: env.jwtRefreshExpiresIn },
  );
  return { token, expiresAt: expiresAtFromToken(token) };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

export function signReauthenticationToken(user) {
  return jwt.sign(
    { type: 'reauth', sessionVersion: user.sessionVersion ?? 0 },
    env.jwtAccessSecret,
    { subject: user.id, expiresIn: '5m' },
  );
}

export function verifyReauthenticationToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

export function signPasswordResetToken(user) {
  return jwt.sign(
    { type: 'password-reset', sessionVersion: user.sessionVersion ?? 0 },
    env.jwtPasswordResetSecret,
    { subject: user.id, expiresIn: env.jwtPasswordResetExpiresIn },
  );
}

export function verifyPasswordResetToken(token) {
  return jwt.verify(token, env.jwtPasswordResetSecret);
}
