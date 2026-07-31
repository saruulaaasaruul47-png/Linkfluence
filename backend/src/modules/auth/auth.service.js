import { env } from '../../config/env.js';
import {
  AUTH_ERROR,
  DEFAULT_USER_ROLE,
  PASSWORD_RESET_PURPOSE,
  PENDING_STATUS,
  VERIFICATION_PURPOSE,
} from '../../shared/constants/auth.constants.js';
import { AppError } from '../../shared/errors/AppError.js';
import {
  signPasswordResetToken,
  verifyAccessToken,
  verifyPasswordResetToken,
} from '../../shared/utils/jwt.js';
import { generateOtp, otpExpiresAt } from '../../shared/utils/otp.js';
import { comparePassword, hashPassword } from '../../shared/utils/password.js';
import { hashToken, safeHashEqual } from '../../shared/utils/tokenHash.js';
import { sendPasswordResetEmail, sendVerificationEmail } from './auth.email.js';
import { toSafeUser } from './auth.mapper.js';
import { assertActiveUser } from './auth.policy.js';
import { authRepository } from './auth.repository.js';
import { createSessionTokens, readRefreshPayload } from './auth.session.js';

const invalidCode = () => new AppError(
  'Invalid or expired verification code.',
  400,
  AUTH_ERROR.INVALID_CODE,
);

const invalidResetToken = () => new AppError(
  'Invalid or expired password reset token.',
  401,
  AUTH_ERROR.INVALID_RESET_TOKEN,
);

function codeData(code, purpose) {
  return {
    codeHash: hashToken(code),
    purpose,
    expiresAt: otpExpiresAt(),
    resendAvailableAt: new Date(Date.now() + env.otpResendCooldownSeconds * 1000),
  };
}

async function verifyCode(user, purpose, otp) {
  const verification = user
    ? await authRepository.findLatestActiveVerificationCode(user.id, purpose)
    : null;
  if (!user || user.deletedAt || !verification) throw invalidCode();
  if (verification.expiresAt <= new Date()) {
    throw new AppError('The verification code has expired.', 400, AUTH_ERROR.CODE_EXPIRED);
  }
  if (verification.attempts >= env.otpMaxAttempts) {
    throw new AppError(
      'Too many incorrect verification attempts. Request a new code.',
      400,
      AUTH_ERROR.ATTEMPTS_EXCEEDED,
    );
  }
  if (!safeHashEqual(hashToken(otp), verification.codeHash)) {
    const updated = await authRepository.incrementVerificationAttempts(verification.id);
    if (updated.attempts >= env.otpMaxAttempts) {
      throw new AppError(
        'Too many incorrect verification attempts. Request a new code.',
        400,
        AUTH_ERROR.ATTEMPTS_EXCEEDED,
      );
    }
    throw invalidCode();
  }
  return verification;
}

function readResetPayload(token) {
  try {
    const payload = verifyPasswordResetToken(token);
    if (
      typeof payload === 'string'
      || payload.type !== 'password-reset'
      || !payload.sub
      || !Number.isInteger(payload.sessionVersion)
    ) {
      throw new Error('Invalid reset payload.');
    }
    return payload;
  } catch {
    throw invalidResetToken();
  }
}

export const authService = {
  async register(payload) {
    if (await authRepository.findUserByEmail(payload.email)) {
      throw new AppError('This email is already registered.', 409, AUTH_ERROR.EMAIL_EXISTS);
    }
    if (payload.username && await authRepository.findUserByUsername(payload.username)) {
      throw new AppError('This username is already in use.', 409, AUTH_ERROR.USERNAME_EXISTS);
    }

    const code = generateOtp();
    const user = await authRepository.createPendingUserWithCode(
      {
        email: payload.email,
        username: payload.username,
        displayName: payload.displayName,
        passwordHash: await hashPassword(payload.password),
        roles: [DEFAULT_USER_ROLE],
        status: PENDING_STATUS,
        emailVerifiedAt: null,
      },
      codeData(code, VERIFICATION_PURPOSE),
    );
    await sendVerificationEmail(user.email, code);
    return {
      email: user.email,
      verificationRequired: true,
      expiresInSeconds: env.otpExpiresInMinutes * 60,
    };
  },

  async verifyEmail(payload, context) {
    const user = await authRepository.findUserByEmail(payload.email);
    if (!user || user.deletedAt || user.emailVerifiedAt) throw invalidCode();
    const verification = await verifyCode(user, VERIFICATION_PURPOSE, payload.otp);
    const session = createSessionTokens(user, context);
    let activeUser;
    try {
      activeUser = await authRepository.activateUserWithSession(
        user.id,
        verification.id,
        session.tokenData,
      );
    } catch (error) {
      if (error?.message === 'VERIFICATION_CODE_ALREADY_USED') throw invalidCode();
      throw error;
    }
    return {
      user: toSafeUser(activeUser),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  },

  async resendOtp(payload) {
    const user = await authRepository.findUserByEmail(payload.email);
    if (!user || user.deletedAt || user.emailVerifiedAt || user.status !== PENDING_STATUS) return null;
    const latest = await authRepository.findLatestVerificationCode(user.id, VERIFICATION_PURPOSE);
    if (latest?.resendAvailableAt > new Date()) {
      const retryAfterSeconds = Math.ceil(
        (latest.resendAvailableAt.getTime() - Date.now()) / 1000,
      );
      throw new AppError(
        `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
        429,
        AUTH_ERROR.RESEND_TOO_SOON,
        { retryAfterSeconds },
      );
    }
    const code = generateOtp();
    await authRepository.replaceVerificationCode(
      user.id,
      codeData(code, VERIFICATION_PURPOSE),
    );
    await sendVerificationEmail(user.email, code);
    return null;
  },

  async login(payload, context) {
    const user = await authRepository.findUserByEmail(payload.email);
    const passwordMatches = user?.passwordHash && !user.deletedAt
      ? await comparePassword(payload.password, user.passwordHash)
      : false;
    if (!user || !passwordMatches) {
      throw new AppError('Invalid email or password.', 401, AUTH_ERROR.INVALID_CREDENTIALS);
    }
    assertActiveUser(user);
    const updatedUser = await authRepository.updateLastSeen(user.id, new Date());
    const session = createSessionTokens(updatedUser, context);
    await authRepository.createAuthToken(session.tokenData);
    return {
      user: toSafeUser(updatedUser),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  },

  async refresh(refreshToken, context) {
    if (!refreshToken) {
      throw new AppError('Invalid or expired refresh token.', 401, AUTH_ERROR.INVALID_REFRESH);
    }
    const payload = readRefreshPayload(refreshToken);
    const record = await authRepository.findAuthTokenByHashAndJti(
      hashToken(refreshToken),
      payload.jti,
    );
    if (!record) {
      throw new AppError('Invalid or expired refresh token.', 401, AUTH_ERROR.INVALID_REFRESH);
    }
    if (record.revokedAt) {
      await authRepository.invalidateCompromisedFamily(record.userId, record.familyId);
      throw new AppError(
        'Refresh token reuse was detected. Sign in again.',
        401,
        AUTH_ERROR.REFRESH_REUSE,
      );
    }
    if (record.expiresAt <= new Date()) {
      throw new AppError('Invalid or expired refresh token.', 401, AUTH_ERROR.INVALID_REFRESH);
    }
    assertActiveUser(record.user);
    const session = createSessionTokens(record.user, context, record.familyId);
    const rotated = await authRepository.rotateAuthToken(record.id, session.tokenData);
    if (!rotated) {
      await authRepository.invalidateCompromisedFamily(record.userId, record.familyId);
      throw new AppError(
        'Refresh token reuse was detected. Sign in again.',
        401,
        AUTH_ERROR.REFRESH_REUSE,
      );
    }
    return { accessToken: session.accessToken, refreshToken: session.refreshToken };
  },

  async logout(refreshToken) {
    if (!refreshToken) return null;
    const record = await authRepository.findAuthTokenByHash(hashToken(refreshToken));
    if (record && !record.revokedAt) await authRepository.revokeAuthToken(record.id);
    return null;
  },

  async logoutAll(userId) {
    await authRepository.logoutAll(userId);
    return null;
  },

  async forgotPassword(payload) {
    const user = await authRepository.findUserByEmail(payload.email);
    if (!user || user.deletedAt || user.status !== 'ACTIVE' || !user.emailVerifiedAt) return null;
    const latest = await authRepository.findLatestVerificationCode(
      user.id,
      PASSWORD_RESET_PURPOSE,
    );
    if (latest?.resendAvailableAt > new Date()) return null;
    const code = generateOtp();
    await authRepository.replaceVerificationCode(
      user.id,
      codeData(code, PASSWORD_RESET_PURPOSE),
    );
    await sendPasswordResetEmail(user.email, code).catch(() => null);
    return null;
  },

  async verifyResetOtp(payload) {
    const user = await authRepository.findUserByEmail(payload.email);
    if (!user || user.deletedAt || user.status !== 'ACTIVE' || !user.emailVerifiedAt) {
      throw invalidCode();
    }
    const verification = await verifyCode(user, PASSWORD_RESET_PURPOSE, payload.otp);
    if (!await authRepository.consumeResetCode(verification.id, user.id)) throw invalidCode();
    return {
      resetToken: signPasswordResetToken(user),
      expiresIn: env.jwtPasswordResetExpiresIn,
    };
  },

  async resetPassword(payload) {
    const reset = readResetPayload(payload.resetToken);
    const user = await authRepository.findUserById(reset.sub);
    if (!user || user.sessionVersion !== reset.sessionVersion) throw invalidResetToken();
    assertActiveUser(user);
    if (user.passwordHash && await comparePassword(payload.newPassword, user.passwordHash)) {
      throw new AppError(
        'Choose a password different from your current password.',
        400,
        AUTH_ERROR.PASSWORD_UNCHANGED,
      );
    }
    const updated = await authRepository.resetPasswordAndRevokeSessions(
      user.id,
      reset.sessionVersion,
      await hashPassword(payload.newPassword),
    );
    if (!updated) throw invalidResetToken();
    return null;
  },

  async getCurrentUser(userId) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new AppError('User was not found.', 404, AUTH_ERROR.USER_NOT_FOUND);
    assertActiveUser(user);
    return toSafeUser(user);
  },

  async authenticateAccessToken(accessToken) {
    let payload;
    try {
      payload = verifyAccessToken(accessToken);
    } catch (error) {
      if (error?.name === 'TokenExpiredError') {
        throw new AppError('The access token has expired.', 401, AUTH_ERROR.TOKEN_EXPIRED);
      }
      throw new AppError('The access token is invalid.', 401, AUTH_ERROR.INVALID_TOKEN);
    }
    if (typeof payload === 'string' || payload.type !== 'access' || !payload.sub) {
      throw new AppError('The access token is invalid.', 401, AUTH_ERROR.INVALID_TOKEN);
    }
    const user = await authRepository.findUserById(payload.sub);
    assertActiveUser(user);
    if ((payload.sessionVersion ?? 0) !== user.sessionVersion) {
      throw new AppError('The access token is no longer active.', 401, AUTH_ERROR.INVALID_TOKEN);
    }
    return { id: user.id, email: user.email, roles: user.roles };
  },
};
