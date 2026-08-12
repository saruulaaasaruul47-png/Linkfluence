import { AppError } from '../../shared/errors/AppError.js';

export const COLLABORATION_TRANSITIONS = Object.freeze({
  NEGOTIATION: Object.freeze(['AGREEMENT_REVIEW', 'CANCELLED']),
  AGREEMENT_REVIEW: Object.freeze(['NEGOTIATION', 'CONTRACT_REVIEW', 'CANCELLED']),
  CONTRACT_REVIEW: Object.freeze(['NEGOTIATION', 'PAYMENT_PENDING', 'CANCELLED']),
  PAYMENT_PENDING: Object.freeze(['IN_PROGRESS', 'DISPUTED', 'CANCELLED']),
  IN_PROGRESS: Object.freeze(['IN_REVIEW', 'PUBLISHED', 'COMPLETED', 'DISPUTED', 'CANCELLED']),
  IN_REVIEW: Object.freeze(['IN_PROGRESS', 'PUBLISHED', 'COMPLETED', 'DISPUTED']),
  PUBLISHED: Object.freeze(['PROVEN', 'IN_REVIEW', 'DISPUTED']),
  PROVEN: Object.freeze(['SETTLEMENT_PENDING', 'DISPUTED']),
  SETTLEMENT_PENDING: Object.freeze(['COMPLETED', 'DISPUTED']),
  DISPUTED: Object.freeze(['IN_PROGRESS', 'SETTLEMENT_PENDING', 'COMPLETED', 'CANCELLED']),
  COMPLETED: Object.freeze([]),
  CANCELLED: Object.freeze([]),
});

export function canTransitionCollaboration(from, to) {
  return Boolean(from && to && COLLABORATION_TRANSITIONS[from]?.includes(to));
}

export function assertCollaborationTransition(from, to) {
  if (!canTransitionCollaboration(from, to)) {
    throw new AppError(
      `Collaboration cannot move from ${from || 'UNKNOWN'} to ${to || 'UNKNOWN'}.`,
      409,
      'INVALID_COLLABORATION_TRANSITION',
      { from: from || null, to: to || null },
    );
  }
}

