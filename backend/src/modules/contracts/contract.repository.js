import { prisma } from '../../config/database.js';

export const contractRepository = {
  transaction(callback) {
    return prisma.$transaction(callback);
  },
  findById(id, db = prisma) {
    return db.contract.findUnique({
      where: { id },
      include: {
        collaboration: {
          include: {
            business: { select: { userId: true, companyName: true } },
            creator: { select: { userId: true, channelName: true } },
          },
        },
        versions: { orderBy: { version: 'desc' } },
      },
    });
  },
};
