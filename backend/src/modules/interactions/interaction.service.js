import { targetService } from '../targets/public.js';
import { toLibraryState } from './interaction.mapper.js';
import { interactionRepository } from './interaction.repository.js';
import { AppError } from '../../shared/errors/AppError.js';
import { realtimeGateway } from '../../infrastructure/realtime/realtime.gateway.js';

export const interactionService = {
  async state(userId) {
    return toLibraryState(await interactionRepository.state(userId));
  },

  async save(userId, type, identifier) {
    const target = await targetService.resolve(type, identifier);
    await interactionRepository.save(userId, target.type, target.id);
    return { key: `${target.type.toLowerCase()}:${target.id}`, saved: true };
  },

  async unsave(userId, type, identifier) {
    const target = await targetService.resolve(type, identifier);
    await interactionRepository.unsave(userId, target.type, target.id);
    return { key: `${target.type.toLowerCase()}:${target.id}`, saved: false };
  },

  async follow(userId, type, identifier) {
    const target = await targetService.resolveFollowTarget(type, identifier, userId);
    if (await interactionRepository.isBlocked(userId, target.type, target.id)) {
      throw new AppError('Unblock this channel before following it.', 409, 'CHANNEL_BLOCKED');
    }
    const result = await interactionRepository.follow(userId, target);
    if (result.notification) realtimeGateway.user(result.notification.userId, 'notification:created', result.notification);
    return { key: `${target.type.toLowerCase()}:${target.id}`, following: true, followerCount: result.followerCount };
  },

  async unfollow(userId, type, identifier) {
    const target = await targetService.resolveFollowTarget(type, identifier, userId);
    await interactionRepository.unfollow(userId, target.type, target.id);
    const followerCount = await interactionRepository.followerCount(target.type, target.id);
    return { key: `${target.type.toLowerCase()}:${target.id}`, following: false, followerCount };
  },

  async recent(userId, type, identifier) {
    const target = await targetService.resolve(type, identifier);
    await interactionRepository.recent(userId, target.type, target.id);
    return { key: `${target.type.toLowerCase()}:${target.id}` };
  },

  async share(userId, type, identifier, channel) {
    const target = await targetService.resolve(type, identifier);
    await interactionRepository.share(userId, target.type, target.id, channel);
    return { recorded: true };
  },

  async summary(userId, type, identifier) {
    const target = await targetService.resolveFollowTarget(type, identifier, null);
    const [followerCount, following] = await Promise.all([
      interactionRepository.followerCount(target.type, target.id),
      interactionRepository.isFollowing(userId, target.type, target.id),
    ]);
    return { targetType: target.type, targetId: target.id, followerCount, following: Boolean(following) };
  },

  async followers(type, identifier, filters) {
    const target = await targetService.resolveFollowTarget(type, identifier, null);
    const result = await interactionRepository.followers(target.type, target.id, filters);
    return {
      items: result.items.map((item) => ({
        id: item.follower.id,
        name: item.follower.displayName,
        avatarUrl: item.follower.avatarUrl || '',
        creator: item.follower.creatorProfile,
        business: item.follower.businessProfile,
        followedAt: item.createdAt,
      })),
      nextCursor: result.nextCursor,
    };
  },

  async following(type, identifier, filters) {
    const target = await targetService.resolveFollowTarget(type, identifier, null);
    const result = await interactionRepository.following(target.ownerUserId, filters);
    return { items: result.items, nextCursor: result.nextCursor };
  },
};
