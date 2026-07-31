import { randomUUID } from 'node:crypto';
import { AUTH_ERROR } from '../../shared/constants/auth.constants.js';
import { AppError } from '../../shared/errors/AppError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt.js';
import { hashToken } from '../../shared/utils/tokenHash.js';

function sessionMetadata(context = {}) {
  return {
    createdByIp: context.ip ? String(context.ip).slice(0, 64) : null,
    userAgent: context.userAgent ? String(context.userAgent).slice(0, 512) : null,
  };
}

export function createSessionTokens(user, context = {}, familyId = randomUUID()) {
  const jti = randomUUID();
  const accessToken = signAccessToken(user);
  const refresh = signRefreshToken(user.id, jti);
  return {
    accessToken,
    refreshToken: refresh.token,
    tokenData: {
      userId: user.id,
      tokenHash: hashToken(refresh.token),
      jti,
      familyId,
      ...sessionMetadata(context),
      expiresAt: refresh.expiresAt,
    },
  };
}

export function readRefreshPayload(refreshToken) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (typeof payload === 'string' || payload.type !== 'refresh' || !payload.sub || !payload.jti) {
      throw new Error('Invalid refresh payload.');
    }
    return payload;
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401, AUTH_ERROR.INVALID_REFRESH);
  }
}
