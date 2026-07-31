import crypto from 'node:crypto';
import { env } from '../../../config/env.js';

const signatureFor = (payload) => crypto
  .createHmac('sha256', env.paymentWebhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

export const mockPaymentProvider = {
  createIntent({ kind, amount, currency, paymentId }) {
    return {
      provider: 'mock',
      providerRef: `mock_${kind}_${crypto.randomUUID()}`,
      paymentId,
      amount,
      currency,
      checkoutUrl: null,
    };
  },
  sign(payload) {
    return signatureFor(payload);
  },
  verify(payload, signature) {
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
    const expected = Buffer.from(signatureFor(payload), 'hex');
    const received = Buffer.from(signature, 'hex');
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  },
  event(type, record) {
    return {
      id: `evt_${crypto.randomUUID()}`,
      type,
      createdAt: new Date().toISOString(),
      data: {
        providerRef: record.providerRef,
        amount: Number(record.amount),
        currency: record.currency,
      },
    };
  },
};
