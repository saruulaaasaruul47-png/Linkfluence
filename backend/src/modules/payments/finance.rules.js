import { AppError } from '../../shared/errors/AppError.js';

export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export function normalizeBarterDetails(value = null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    providedItem: String(value.providedItem || value.description || '').trim(),
    description: String(value.description || '').trim(),
    estimatedValue: roundMoney(value.estimatedValue || 0),
    currency: String(value.currency || 'MNT').toUpperCase(),
    deliveryMethod: String(value.deliveryMethod || '').trim(),
    expectedDeliveryDate: value.expectedDeliveryDate || null,
    notes: String(value.notes || '').trim(),
  };
}

export function calculateCollaborationFinance(collaboration, { commissionPercent = 10, barterPlatformFee = 30000 } = {}) {
  const paymentType = collaboration.paymentType || collaboration.terms?.paymentType || 'PAID';
  const barterDetails = normalizeBarterDetails(collaboration.barterDetails || collaboration.terms?.barterDetails);
  const explicitCash = collaboration.cashAmount ?? collaboration.terms?.cashAmount;
  const cashAmount = roundMoney(
    paymentType !== 'BARTER' && Number(explicitCash || 0) === 0 && Number(collaboration.terms?.budget || 0) > 0
      ? collaboration.terms.budget
      : explicitCash ?? collaboration.terms?.budget ?? 0,
  );
  const barterEstimatedValue = roundMoney(
    collaboration.barterEstimatedValue
      ?? barterDetails?.estimatedValue
      ?? collaboration.terms?.barterEstimatedValue
      ?? 0,
  );
  if (!['PAID', 'BARTER', 'HYBRID'].includes(paymentType)) {
    throw new AppError('The collaboration compensation type is invalid.', 409, 'INVALID_COMPENSATION_TYPE');
  }
  if (paymentType === 'PAID' && !positive(cashAmount)) {
    throw new AppError('Paid collaborations require a positive cash amount.', 409, 'CASH_AMOUNT_REQUIRED');
  }
  if (paymentType === 'BARTER' && cashAmount !== 0) {
    throw new AppError('Barter collaborations cannot contain a creator cash payment.', 409, 'BARTER_CASH_NOT_ALLOWED');
  }
  if (['BARTER', 'HYBRID'].includes(paymentType) && (!barterDetails?.providedItem || !positive(barterEstimatedValue))) {
    throw new AppError('Barter terms and a positive estimated value are required.', 409, 'BARTER_DETAILS_REQUIRED');
  }
  if (paymentType === 'HYBRID' && !positive(cashAmount)) {
    throw new AppError('Hybrid collaborations require a positive cash amount.', 409, 'CASH_AMOUNT_REQUIRED');
  }

  const commissionRate = paymentType === 'BARTER' ? 0 : roundMoney(commissionPercent);
  const commissionAmount = paymentType === 'BARTER' ? 0 : roundMoney(cashAmount * commissionRate / 100);
  const platformFee = paymentType === 'BARTER' ? roundMoney(barterPlatformFee) : commissionAmount;
  const creatorAmount = paymentType === 'BARTER' ? 0 : roundMoney(cashAmount - commissionAmount);
  const payableAmount = paymentType === 'BARTER' ? platformFee : cashAmount;
  const revenueSource = paymentType === 'BARTER'
    ? 'BARTER_SERVICE_FEE'
    : paymentType === 'HYBRID' ? 'HYBRID_COMMISSION' : 'PAID_COMMISSION';
  return {
    paymentType,
    cashAmount,
    barterEstimatedValue: paymentType === 'PAID' ? null : barterEstimatedValue,
    barterDetails: paymentType === 'PAID' ? null : { ...barterDetails, estimatedValue: barterEstimatedValue },
    commissionRate,
    commissionAmount,
    creatorAmount,
    platformFee,
    payableAmount,
    revenueSource,
    currency: String(collaboration.terms?.currency || barterDetails?.currency || 'MNT').toUpperCase(),
  };
}

export function walletAvailability(storedBalance = 0) {
  // Business wallet is a liability account. Credits grow the user's available funds,
  // therefore its debit-normal stored balance is negative.
  return roundMoney(Math.max(0, -Number(storedBalance || 0)));
}
