import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { shouldUseLocalEmailDelivery } from '../../infrastructure/email/email.policy.js';

export async function sendNotificationEmail({ email, name, title, body, href }) {
  if (shouldUseLocalEmailDelivery(env.nodeEnv, email) || !env.resendApiKey) {
    return { skipped: true, reason: 'LOCAL_OR_UNCONFIGURED_EMAIL' };
  }
  const actionUrl = href ? new URL(href, env.clientUrl).toString() : env.clientUrl;
  const resend = new Resend(env.resendApiKey);
  const { error } = await resend.emails.send({
    from: env.resendFromEmail,
    to: [email],
    subject: title,
    text: `${body}\n\nOpen Influence Hub: ${actionUrl}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#151515"><p style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#777">Influence Hub</p><h1 style="font-size:25px;margin:18px 0 8px">${escapeHtml(title)}</h1><p style="line-height:1.65;color:#555">Hi ${escapeHtml(name || 'there')}, ${escapeHtml(body)}</p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;margin-top:20px;padding:12px 18px;border-radius:999px;background:#ff69b4;color:#111;text-decoration:none;font-weight:700">View update</a><p style="margin-top:28px;color:#888;font-size:12px">Email notifications can be changed from My account.</p></div>`,
  });
  if (error) throw new Error(`Notification email was rejected: ${error.message || 'unknown error'}`);
  return { delivered: true };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}
