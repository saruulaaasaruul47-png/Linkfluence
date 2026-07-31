import { prisma } from '../../config/database.js';

const includeItems = {
  items: { orderBy: { createdAt: 'desc' } },
  _count: { select: { items: true } },
};

export const collectionRepository = {
  listOwned(ownerId) {
    return prisma.collection.findMany({
      where: { ownerId },
      include: includeItems,
      orderBy: { updatedAt: 'desc' },
    });
  },

  findById(id) {
    return prisma.collection.findUnique({
      where: { id },
      include: includeItems,
    });
  },

  findOwned(id, ownerId) {
    return prisma.collection.findFirst({
      where: { id, ownerId },
      include: includeItems,
    });
  },

  findOwnedByName(ownerId, name) {
    return prisma.collection.findUnique({
      where: { ownerId_name: { ownerId, name } },
      select: { id: true },
    });
  },

  countOwned(ownerId) {
    return prisma.collection.count({ where: { ownerId } });
  },

  findItem(collectionId, targetType, targetId) {
    return prisma.collectionItem.findUnique({
      where: {
        collectionId_targetType_targetId: { collectionId, targetType, targetId },
      },
      select: { id: true },
    });
  },

  create(data) {
    return prisma.collection.create({ data, include: includeItems });
  },

  update(id, data) {
    return prisma.collection.update({ where: { id }, data, include: includeItems });
  },

  remove(id) {
    return prisma.collection.delete({ where: { id } });
  },

  addItem(collectionId, targetType, targetId, note) {
    return prisma.collectionItem.upsert({
      where: {
        collectionId_targetType_targetId: { collectionId, targetType, targetId },
      },
      create: { collectionId, targetType, targetId, note: note || null },
      update: note === undefined ? {} : { note: note || null },
    });
  },

  removeItem(collectionId, targetType, targetId) {
    return prisma.collectionItem.deleteMany({
      where: { collectionId, targetType, targetId },
    });
  },
};
