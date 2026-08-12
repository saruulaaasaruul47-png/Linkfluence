import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { AUTH_ERROR } from '../../shared/constants/auth.constants.js';
import { AppError } from '../../shared/errors/AppError.js';

const googleClient = new OAuth2Client();

export async function verifyGoogleCredential(
  credential,
  { client = googleClient, audience = env.googleClientId } = {},
) {
  if (!audience) {
    throw new AppError(
      'Google sign-in is not configured.',
      503,
      AUTH_ERROR.GOOGLE_NOT_CONFIGURED,
    );
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience,
    });
    payload = ticket.getPayload();
  } catch {
    throw new AppError(
      'The Google sign-in credential is invalid or expired.',
      401,
      AUTH_ERROR.INVALID_GOOGLE_CREDENTIAL,
    );
  }

  if (
    !payload
    || typeof payload.sub !== 'string'
    || typeof payload.email !== 'string'
    || payload.email_verified !== true
  ) {
    throw new AppError(
      'Google did not provide a verified email address.',
      401,
      AUTH_ERROR.INVALID_GOOGLE_CREDENTIAL,
    );
  }

  const email = payload.email.trim().toLowerCase();
  return {
    subject: payload.sub,
    email,
    displayName: String(payload.name || email.split('@')[0]).trim().slice(0, 80),
    avatarUrl: typeof payload.picture === 'string' ? payload.picture : null,
  };
}
