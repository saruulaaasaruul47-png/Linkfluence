import { AppError } from '../../shared/errors/AppError.js';

const ACTIVE_DISPUTE_STATUSES = ['OPEN', 'UNDER_REVIEW', 'WAITING_FOR_USER', 'ESCALATED'];

export async function assertPaymentsUnfrozen(db, collaborationId) {
  const [collaboration, dispute] = await Promise.all([
    db.collaboration.findUnique({ where: { id: collaborationId }, select: { status: true } }),
    db.trustCase.findFirst({
      where: {
        kind: 'DISPUTE',
        targetType: 'COLLABORATION',
        targetId: collaborationId,
        status: { in: ACTIVE_DISPUTE_STATUSES },
      },
      select: { id: true },
    }),
  ]);
  if (collaboration?.status === 'DISPUTED' || dispute) {
    throw new AppError(
      'Payment actions are frozen while the dispute is active.',
      409,
      'PAYMENT_FROZEN_BY_DISPUTE',
      { disputeId: dispute?.id || null },
    );
  }
}
