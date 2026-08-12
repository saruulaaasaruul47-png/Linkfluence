import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { shouldUseLocalEmailDelivery } from '../../infrastructure/email/email.policy.js';
import { AUTH_ERROR } from '../../shared/constants/auth.constants.js';
import { AppError } from '../../shared/errors/AppError.js';

const testCodes = new Map();
const testResetCodes = new Map();

function emailTemplate(code) {
  return {
    subject: 'Verify your Influence Hub account',
    text: `Your Influence Hub verification code is ${code}. It expires in ${env.otpExpiresInMinutes} minutes. If you did not request this code, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#151515">
        <p style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#777">Influence Hub</p>
        <h1 style="font-size:28px;margin:18px 0 8px">Verify your account</h1>
        <p style="line-height:1.6;color:#555">Use this six-digit code to finish creating your account.</p>
        <div style="font-size:36px;font-weight:800;letter-spacing:.28em;margin:28px 0;padding:20px;text-align:center;background:#f6f4f1;border-radius:16px">${code}</div>
        <p style="line-height:1.6;color:#777">This code expires in ${env.otpExpiresInMinutes} minutes. If you did not request it, you can safely ignore this email.</p>
      </div>
    `,
  };
}

function passwordResetTemplate(code) {
  return {
    subject: 'Reset your Influence Hub password',
    text: `Your Influence Hub password reset code is ${code}. It expires in ${env.otpExpiresInMinutes} minutes. If you did not request this, ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#151515">
        <p style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#777">Influence Hub</p>
        <h1 style="font-size:28px;margin:18px 0 8px">Reset your password</h1>
        <p style="line-height:1.6;color:#555">Use this six-digit code to continue resetting your password.</p>
        <div style="font-size:36px;font-weight:800;letter-spacing:.28em;margin:28px 0;padding:20px;text-align:center;background:#f6f4f1;border-radius:16px">${code}</div>
        <p style="line-height:1.6;color:#777">This code expires in ${env.otpExpiresInMinutes} minutes. If you did not request it, no action is needed.</p>
      </div>
    `,
  };
}

async function deliverEmail(email, code, template, store) {
  if (shouldUseLocalEmailDelivery(env.nodeEnv, email)) {
    store.set(email, code);
    if (env.nodeEnv === 'development') {
      console.info(JSON.stringify({
        level: 'info',
        event: 'local_email_delivery',
        recipient: email,
        code,
        reason: 'Reserved development recipient; Resend was not called.',
      }));
    }
    return { local: true };
  }
  if (!env.resendApiKey) {
    throw new AppError(
      'The verification email could not be sent. Please try resending the code.',
      502,
      AUTH_ERROR.EMAIL_SEND_FAILED,
    );
  }
  try {
    const resend = new Resend(env.resendApiKey);
    const { error } = await resend.emails.send({
      from: env.resendFromEmail,
      to: [email],
      ...template(code),
    });
    if (error) throw new Error(error.message || 'Resend rejected the email.');
    return { delivered: true };
  } catch (error) {
    console.error({ code: AUTH_ERROR.EMAIL_SEND_FAILED, message: error?.message });
    throw new AppError(
      'The verification email could not be sent. Please try resending the code.',
      502,
      AUTH_ERROR.EMAIL_SEND_FAILED,
    );
  }
}

export async function sendVerificationEmail(email, code) {
  return deliverEmail(email, code, emailTemplate, testCodes);
}

export async function sendPasswordResetEmail(email, code) {
  return deliverEmail(email, code, passwordResetTemplate, testResetCodes);
}

export function getTestVerificationCode(email) {
  return env.nodeEnv === 'test' ? testCodes.get(email) : undefined;
}

export function getTestPasswordResetCode(email) {
  return env.nodeEnv === 'test' ? testResetCodes.get(email) : undefined;
}
