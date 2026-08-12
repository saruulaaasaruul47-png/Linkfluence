import crypto from 'node:crypto';
import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/AppError.js';

const STRIPE_API = 'https://api.stripe.com/v1';
const WEBHOOK_TOLERANCE_SECONDS = 300;
const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

export const stripeMinorAmount = (amount, currency) => Math.round(Number(amount) * (ZERO_DECIMAL.has(String(currency).toUpperCase()) ? 1 : 100));
export const stripeMajorAmount = (amount, currency) => Number(amount) / (ZERO_DECIMAL.has(String(currency).toUpperCase()) ? 1 : 100);

async function stripeRequest(path, { method = 'POST', body, idempotencyKey, secretKey = env.stripeSecretKey } = {}) {
  if (!secretKey) throw new AppError('Stripe credentials are not configured.', 503, 'STRIPE_NOT_CONFIGURED');
  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    ...(body ? { body: new URLSearchParams(body).toString() } : {}),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppError('Stripe provider request failed.', 502, 'STRIPE_PROVIDER_ERROR', {
      status: response.status,
      providerCode: data.error?.code || data.error?.type || null,
    });
  }
  return data;
}

function signatureParts(header = '') {
  return header.split(',').reduce((result, part) => {
    const [key, value] = part.split('=', 2);
    if (key && value) (result[key] ||= []).push(value);
    return result;
  }, {});
}

export function verifyStripeSignature(rawBody, signatureHeader, now = Date.now(), secret = env.stripeWebhookSecret) {
  if (!rawBody || !secret || !signatureHeader) return false;
  const parts = signatureParts(signatureHeader);
  const timestamp = Number(parts.t?.[0]);
  if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return (parts.v1 || []).some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  });
}

function normalizedStripeEvent(event) {
  const object = event?.data?.object;
  if (!event?.id || !object?.id) throw new AppError('Stripe webhook payload is invalid.', 400, 'INVALID_WEBHOOK_PAYLOAD');
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    if (event.type === 'checkout.session.completed' && object.payment_status !== 'paid') {
      throw new AppError('Stripe Checkout has not confirmed a paid session.', 409, 'STRIPE_PAYMENT_NOT_CONFIRMED');
    }
    return {
      id: event.id,
      type: 'funding.succeeded',
      createdAt: new Date(Number(event.created || Date.now() / 1000) * 1000).toISOString(),
      data: { providerRef: object.id, amount: stripeMajorAmount(object.amount_total, object.currency), currency: String(object.currency).toUpperCase() },
    };
  }
  if (event.type === 'checkout.session.async_payment_failed') {
    return {
      id: event.id,
      type: 'payment.failed',
      createdAt: new Date(Number(event.created || Date.now() / 1000) * 1000).toISOString(),
      data: { providerRef: object.id, amount: stripeMajorAmount(object.amount_total, object.currency), currency: String(object.currency).toUpperCase(), failureReason: 'Stripe reported that the asynchronous payment failed.' },
    };
  }
  if (event.type === 'refund.updated' && object.status === 'succeeded') {
    return {
      id: event.id,
      type: 'refund.succeeded',
      createdAt: new Date(Number(event.created || Date.now() / 1000) * 1000).toISOString(),
      data: { providerRef: object.id, amount: stripeMajorAmount(object.amount, object.currency), currency: String(object.currency).toUpperCase() },
    };
  }
  throw new AppError('Stripe webhook event type is not supported.', 409, 'INVALID_PAYMENT_TRANSITION');
}

export function createStripePaymentProvider({
  secretKey = env.stripeSecretKey,
  webhookSecret = env.stripeWebhookSecret,
  clientUrl = env.clientUrl,
} = {}) {
  return {
    name: 'stripe',
    capabilities: Object.freeze({ funding: true, refund: true, payout: false, webhook: true }),
    async createFundingIntent({ paymentId, amount, currency, description, successUrl, cancelUrl }) {
      const session = await stripeRequest('/checkout/sessions', {
        secretKey,
        idempotencyKey: `funding-${paymentId}`,
        body: {
          mode: 'payment',
          client_reference_id: paymentId,
          'metadata[payment_id]': paymentId,
          'payment_intent_data[metadata][payment_id]': paymentId,
          'line_items[0][quantity]': '1',
          'line_items[0][price_data][currency]': String(currency).toLowerCase(),
          'line_items[0][price_data][unit_amount]': String(stripeMinorAmount(amount, currency)),
          'line_items[0][price_data][product_data][name]': description || 'VYRA collaboration funding',
          success_url: successUrl || `${clientUrl}/business/collaborations?payment=success`,
          cancel_url: cancelUrl || `${clientUrl}/business/collaborations?payment=cancelled`,
        },
      });
      return {
        provider: 'stripe', providerRef: session.id, paymentId, amount: Number(amount), currency,
        checkoutUrl: session.url || null, qrText: null, qrImage: null, deeplinks: [],
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      };
    },
    async createRefund({ paymentId, refundId, providerRef, amount, currency }) {
      const session = await stripeRequest(`/checkout/sessions/${encodeURIComponent(providerRef)}`, { method: 'GET', secretKey });
      if (!session.payment_intent) throw new AppError('Stripe payment intent was not found.', 409, 'STRIPE_PAYMENT_INTENT_NOT_FOUND');
      const refund = await stripeRequest('/refunds', {
        secretKey,
        idempotencyKey: `refund-${refundId || paymentId}`,
        body: { payment_intent: session.payment_intent, amount: String(stripeMinorAmount(amount, currency)), 'metadata[payment_id]': paymentId },
      });
      return { provider: 'stripe', providerRef: refund.id, amount: stripeMajorAmount(refund.amount, refund.currency), currency: String(refund.currency).toUpperCase() };
    },
    verifyWebhook(rawBody, signatureHeader) { return verifyStripeSignature(rawBody, signatureHeader, Date.now(), webhookSecret); },
    normalizeEvent(event) { return normalizedStripeEvent(event); },
  };
}

export const stripePaymentProvider = createStripePaymentProvider();
