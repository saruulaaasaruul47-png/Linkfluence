const eligibleFundingStatuses = new Set(['FUNDED', 'RELEASED']);
const disqualifyingCollaborationStatuses = new Set(['DISPUTED', 'CANCELLED']);
const activeRefundStatuses = new Set(['PENDING', 'PROCESSING', 'FUNDED', 'RELEASED', 'PAID', 'REFUNDED']);

export const payerTrustSelect = {
  status: true,
  payments: {
    select: {
      status: true,
      type: true,
      processedAt: true,
      createdAt: true,
      refundRequests: { select: { status: true } },
    },
  },
};

export function verifiedPayerTruth(collaborations = []) {
  const hasActiveDispute = collaborations.some((collaboration) => collaboration.status === 'DISPUTED');
  const hasActiveRefund = collaborations.some((collaboration) => (collaboration.payments || [])
    .some((payment) => (payment.refundRequests || [])
      .some((refund) => activeRefundStatuses.has(refund.status))));
  const eligible = collaborations.flatMap((collaboration) => {
    if (disqualifyingCollaborationStatuses.has(collaboration.status)) return [];
    return (collaboration.payments || []).filter((payment) => (
      payment.type === 'FUNDING'
      && eligibleFundingStatuses.has(payment.status)
      && !(payment.refundRequests || []).some((refund) => activeRefundStatuses.has(refund.status))
    ));
  });
  const first = eligible
    .map((payment) => payment.processedAt || payment.createdAt)
    .filter(Boolean)
    .sort((left, right) => new Date(left) - new Date(right))[0] || null;
  if (hasActiveDispute || hasActiveRefund) {
    return {
      verifiedPayer: false,
      verifiedPayerSince: null,
      verifiedPaymentCount: 0,
    };
  }
  return {
    verifiedPayer: eligible.length > 0,
    verifiedPayerSince: first,
    verifiedPaymentCount: eligible.length,
  };
}
