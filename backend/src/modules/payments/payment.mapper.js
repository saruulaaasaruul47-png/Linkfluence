export const toPayment = (payment) => ({
  id: payment.id,
  collaborationId: payment.collaborationId,
  parentId: payment.parentId,
  type: payment.type,
  status: payment.status,
  amount: Number(payment.amount),
  platformFee: Number(payment.platformFee),
  currency: payment.currency,
  provider: payment.provider,
  providerRef: payment.providerRef,
  failureReason: payment.failureReason,
  processedAt: payment.processedAt,
  createdAt: payment.createdAt,
});

export const toMethod = (method) => ({
  id: method.id,
  provider: method.provider,
  brand: method.brand,
  last4: method.last4,
  expMonth: method.expMonth,
  expYear: method.expYear,
  isDefault: method.isDefault,
  createdAt: method.createdAt,
});
