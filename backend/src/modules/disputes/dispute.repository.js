import { prisma } from '../../config/database.js';

const include = {
  reporter: { select: { id: true, displayName: true } },
  assignedAdmin: { select: { id: true, displayName: true } },
};

export const disputeRepository = {
  transaction(callback) { return prisma.$transaction(callback); },
  collaboration(id) {
    return prisma.collaboration.findUnique({
      where: { id },
      select: {
        id: true, status: true,
        business: { select: { userId: true } },
        creator: { select: { userId: true } },
      },
    });
  },
  active(collaborationId) {
    return prisma.trustCase.findFirst({
      where: {
        kind: 'DISPUTE', targetType: 'COLLABORATION', targetId: collaborationId,
        status: { in: ['OPEN', 'UNDER_REVIEW', 'WAITING_FOR_USER', 'ESCALATED'] },
      },
      include,
    });
  },
  list(collaborationId) {
    return prisma.trustCase.findMany({
      where: { kind: 'DISPUTE', targetType: 'COLLABORATION', targetId: collaborationId },
      include,
      orderBy: { createdAt: 'desc' },
    });
  },
};

