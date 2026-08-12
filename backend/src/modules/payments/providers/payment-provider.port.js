import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { mockPaymentProvider } from './mock.provider.js';
import { qpayPaymentProvider } from './qpay.provider.js';
import { stripePaymentProvider } from './stripe.provider.js';

export const PAYMENT_CAPABILITIES = Object.freeze({
  FUNDING: 'funding',
  REFUND: 'refund',
  PAYOUT: 'payout',
  WEBHOOK: 'webhook',
});

export function assertPaymentProvider(provider) {
  if (!provider?.name || !provider.capabilities || typeof provider.createFundingIntent !== 'function') {
    throw new TypeError('Payment provider must expose a name, capabilities and createFundingIntent().');
  }
  return provider;
}

export function requirePaymentCapability(provider, capability) {
  assertPaymentProvider(provider);
  if (!provider.capabilities[capability]) {
    throw new AppError(
      `${provider.name} does not support ${capability} operations.`,
      501,
      'PAYMENT_PROVIDER_OPERATION_UNSUPPORTED',
      { provider: provider.name, capability },
    );
  }
  return provider;
}

export const paymentProvider = assertPaymentProvider(
  env.paymentProvider === 'qpay'
    ? qpayPaymentProvider
    : env.paymentProvider === 'stripe'
      ? stripePaymentProvider
      : mockPaymentProvider,
);
