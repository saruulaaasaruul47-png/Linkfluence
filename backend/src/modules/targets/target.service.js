import { AppError } from '../../shared/errors/AppError.js';
import { targetRepository } from './target.repository.js';

const supported = new Set(['CREATOR', 'BUSINESS', 'CAMPAIGN', 'PORTFOLIO', 'SHOWCASE', 'CONTENT']);

export function normalizeTargetType(value) {
  const type = String(value || '').trim().toUpperCase();
  if (!supported.has(type)) {
    throw new AppError('This library item type is not supported.', 400, 'INVALID_TARGET_TYPE');
  }
  return type;
}

export const targetService = {
  async resolve(typeInput, identifier) {
    const requestedType = normalizeTargetType(typeInput);
    const type = requestedType;
    const finders = {
      CREATOR: targetRepository.findCreator,
      BUSINESS: targetRepository.findBusiness,
      CAMPAIGN: targetRepository.findCampaign,
      PORTFOLIO: targetRepository.findPortfolio,
      SHOWCASE: targetRepository.findShowcase,
      CONTENT: targetRepository.findContent,
    };
    const target = await finders[type](String(identifier || '').trim());
    if (!target) throw new AppError('The selected item was not found.', 404, 'TARGET_NOT_FOUND');
    return {
      type: requestedType,
      canonicalType: type,
      id: target.id,
      ownerUserId: target.userId || target.creator?.userId || target.business?.userId || null,
      data: target,
    };
  },

  async resolveFollowTarget(typeInput, identifier, followerId) {
    const type = normalizeTargetType(typeInput);
    if (!['CREATOR', 'BUSINESS'].includes(type)) {
      throw new AppError('Only creator and business channels can be followed.', 400, 'INVALID_FOLLOW_TARGET');
    }
    const target = await this.resolve(type, identifier);
    if (target.ownerUserId === followerId) {
      throw new AppError('You cannot follow your own channel.', 409, 'SELF_FOLLOW_NOT_ALLOWED');
    }
    return target;
  },
};
