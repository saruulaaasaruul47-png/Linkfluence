import { prisma } from '../../config/database.js';

export const deliverableRepository = {
  transaction(callback) {
    return prisma.$transaction(callback);
  },
  findCollaboration(id, db = prisma) {
    return db.collaboration.findUnique({
      where: { id },
      include: {
        business: { select: { userId: true } },
        creator: { select: { userId: true } },
        contract: true,
        payments: { orderBy: { createdAt: 'desc' } },
        deliverables: { orderBy: [{ createdAt: 'asc' }, { version: 'asc' }] },
      },
    });
  },
};
