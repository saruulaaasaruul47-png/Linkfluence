import { targetService } from '../targets/public.js';
import { toLibraryState } from './interaction.mapper.js';
import { interactionRepository } from './interaction.repository.js';

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
    await interactionRepository.follow(userId, target.type, target.id);
    return { key: `${target.type.toLowerCase()}:${target.id}`, following: true };
  },

  async unfollow(userId, type, identifier) {
    const target = await targetService.resolveFollowTarget(type, identifier, userId);
    await interactionRepository.unfollow(userId, target.type, target.id);
    return { key: `${target.type.toLowerCase()}:${target.id}`, following: false };
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
};
