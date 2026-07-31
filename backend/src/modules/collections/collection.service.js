import { randomBytes } from 'node:crypto';
import { AppError } from '../../shared/errors/AppError.js';
import { targetService } from '../targets/public.js';
import { toCollection } from './collection.mapper.js';
import { collectionRepository } from './collection.repository.js';

const shareToken = () => randomBytes(24).toString('base64url');

async function owned(ownerId, id) {
  const collection = await collectionRepository.findOwned(id, ownerId);
  if (!collection) throw new AppError('Collection was not found.', 404, 'COLLECTION_NOT_FOUND');
  return collection;
}

export const collectionService = {
  async list(ownerId) {
    return (await collectionRepository.listOwned(ownerId))
      .map((collection) => toCollection(collection, { includeShareToken: true }));
  },

  async get(userId, id, token) {
    const collection = await collectionRepository.findById(id);
    if (!collection) throw new AppError('Collection was not found.', 404, 'COLLECTION_NOT_FOUND');
    const owner = userId === collection.ownerId;
    const publicAccess = collection.visibility === 'PUBLIC';
    const unlistedAccess = collection.visibility === 'UNLISTED'
      && Boolean(token)
      && token === collection.shareToken;
    if (!owner && !publicAccess && !unlistedAccess) {
      throw new AppError('Collection was not found.', 404, 'COLLECTION_NOT_FOUND');
    }
    return toCollection(collection, { includeShareToken: owner });
  },

  async create(ownerId, payload) {
    if (await collectionRepository.countOwned(ownerId) >= 50) {
      throw new AppError('You can create up to 50 collections.', 409, 'COLLECTION_LIMIT_REACHED');
    }
    if (await collectionRepository.findOwnedByName(ownerId, payload.name)) {
      throw new AppError('A collection with this name already exists.', 409, 'COLLECTION_NAME_EXISTS');
    }
    const collection = await collectionRepository.create({
      ownerId,
      name: payload.name,
      description: payload.description || null,
      coverUrl: payload.coverUrl || null,
      visibility: payload.visibility,
      shareToken: payload.visibility === 'UNLISTED' ? shareToken() : null,
    });
    return toCollection(collection, { includeShareToken: true });
  },

  async update(ownerId, id, payload) {
    const collection = await owned(ownerId, id);
    if (collection.isDefault && payload.name && payload.name !== collection.name) {
      throw new AppError('The default collection cannot be renamed.', 409, 'DEFAULT_COLLECTION_LOCKED');
    }
    if (payload.name && payload.name !== collection.name
      && await collectionRepository.findOwnedByName(ownerId, payload.name)) {
      throw new AppError('A collection with this name already exists.', 409, 'COLLECTION_NAME_EXISTS');
    }
    const data = { ...payload };
    if (payload.visibility) {
      data.shareToken = payload.visibility === 'UNLISTED'
        ? collection.shareToken || shareToken()
        : null;
    }
    return toCollection(
      await collectionRepository.update(id, data),
      { includeShareToken: true },
    );
  },

  async remove(ownerId, id) {
    const collection = await owned(ownerId, id);
    if (collection.isDefault) {
      throw new AppError('The default collection cannot be deleted.', 409, 'DEFAULT_COLLECTION_LOCKED');
    }
    await collectionRepository.remove(id);
    return null;
  },

  async addItem(ownerId, id, type, identifier, note) {
    const collection = await owned(ownerId, id);
    const target = await targetService.resolve(type, identifier);
    const existing = await collectionRepository.findItem(id, target.type, target.id);
    if (!existing && collection.items.length >= 200) {
      throw new AppError('A collection can contain up to 200 items.', 409, 'COLLECTION_ITEM_LIMIT');
    }
    await collectionRepository.addItem(id, target.type, target.id, note);
    return toCollection(
      await collectionRepository.findOwned(id, ownerId),
      { includeShareToken: true },
    );
  },

  async removeItem(ownerId, id, type, identifier) {
    await owned(ownerId, id);
    const target = await targetService.resolve(type, identifier);
    await collectionRepository.removeItem(id, target.type, target.id);
    return toCollection(
      await collectionRepository.findOwned(id, ownerId),
      { includeShareToken: true },
    );
  },
};
