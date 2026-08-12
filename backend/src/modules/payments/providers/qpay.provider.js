import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/AppError.js';

let cachedToken = null;

async function jsonRequest(path, { method = 'POST', token, body } = {}) {
  const response = await fetch(`${env.qpayBaseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppError('QPay provider request failed.', 502, 'QPAY_PROVIDER_ERROR', {
      status: response.status,
      providerCode: data.code || data.error,
    });
  }
  return data;
}

async function accessToken() {
  if (cachedToken?.expiresAt > Date.now() + 30_000) return cachedToken.value;
  const basic = Buffer.from(`${env.qpayClientId}:${env.qpayClientSecret}`).toString('base64');
  const response = await fetch(`${env.qpayBaseUrl}/v2/auth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new AppError('QPay authentication failed.', 502, 'QPAY_AUTH_FAILED');
  cachedToken = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 300) * 1000 };
  return cachedToken.value;
}

export const qpayPaymentProvider = {
  name: 'qpay',
  capabilities: Object.freeze({ funding: true, refund: false, payout: false, webhook: true }),
  async createFundingIntent({ paymentId, amount, currency, description }) {
    if (!env.qpayClientId || !env.qpayClientSecret || !env.qpayInvoiceCode || env.qpayCallbackToken.length < 32) {
      throw new AppError('QPay credentials are not configured.', 503, 'QPAY_NOT_CONFIGURED');
    }
    if (currency !== 'MNT') throw new AppError('QPay accepts MNT payments only.', 409, 'QPAY_CURRENCY_NOT_SUPPORTED');
    const token = await accessToken();
    const callback = new URL('/api/v1/payments/webhooks/qpay', env.apiPublicUrl);
    callback.searchParams.set('paymentId', paymentId);
    callback.searchParams.set('token', env.qpayCallbackToken);
    const invoice = await jsonRequest('/v2/invoice', {
      token,
      body: {
        invoice_code: env.qpayInvoiceCode,
        sender_invoice_no: paymentId,
        invoice_receiver_code: paymentId,
        invoice_description: description || `Influence Hub collaboration ${paymentId}`,
        amount: Number(amount),
        callback_url: callback.toString(),
      },
    });
    return {
      provider: 'qpay',
      providerRef: invoice.invoice_id,
      paymentId,
      amount: Number(amount),
      currency,
      checkoutUrl: invoice.qPay_shortUrl || null,
      qrText: invoice.qr_text || null,
      qrImage: invoice.qr_image || null,
      deeplinks: invoice.urls || [],
      expiresAt: invoice.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  },
  async checkIntent(providerRef) {
    if (!env.qpayClientId || !env.qpayClientSecret) throw new AppError('QPay credentials are not configured.', 503, 'QPAY_NOT_CONFIGURED');
    const token = await accessToken();
    const result = await jsonRequest('/v2/payment/check', {
      token,
      body: { object_type: 'INVOICE', object_id: providerRef, offset: { page_number: 1, page_limit: 100 } },
    });
    const rows = result.rows || [];
    const paid = rows.filter((entry) => !entry.payment_status || entry.payment_status === 'PAID');
    return {
      paid: paid.length > 0,
      amount: paid.reduce((sum, entry) => sum + Number(entry.payment_amount || 0), 0),
      currency: paid[0]?.payment_currency || 'MNT',
      providerRef,
      providerPaymentId: paid[0]?.payment_id || null,
      raw: result,
    };
  },
};

export function resetQPayTokenForTests() {
  cachedToken = null;
}
