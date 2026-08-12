import { AppError } from '../../shared/errors/AppError.js';
import { targetService } from '../targets/public.js';
import { safetyRepository } from './safety.repository.js';

const key = (item) => `${item.targetType.toLowerCase()}:${item.targetId}`;

export const safetyService = {
  async state(userId) {
    const [blocks, mutes] = await safetyRepository.state(userId);
    return { blocked: blocks.map(key), muted: mutes.map(key) };
  },
  async block(userId, type, identifier) {
    const target = await targetService.resolveFollowTarget(type, identifier, userId);
    await safetyRepository.block(userId, target.type, target.id);
    return { key: key({ targetType: target.type, targetId: target.id }), blocked: true };
  },
  async unblock(userId, type, identifier) {
    const target = await targetService.resolveFollowTarget(type, identifier, userId);
    await safetyRepository.unblock(userId, target.type, target.id);
    return { key: key({ targetType: target.type, targetId: target.id }), blocked: false };
  },
  async mute(userId, type, identifier) {
    const target = await targetService.resolveFollowTarget(type, identifier, userId);
    await safetyRepository.mute(userId, target.type, target.id);
    return { key: key({ targetType: target.type, targetId: target.id }), muted: true };
  },
  async unmute(userId, type, identifier) {
    const target = await targetService.resolveFollowTarget(type, identifier, userId);
    await safetyRepository.unmute(userId, target.type, target.id);
    return { key: key({ targetType: target.type, targetId: target.id }), muted: false };
  },
  async report(userId, payload) {
    const target = await targetService.resolve(payload.targetType, payload.targetId);
    if (target.ownerUserId === userId) throw new AppError('You cannot report your own channel or content.', 409, 'SELF_REPORT_NOT_ALLOWED');
    const open = await safetyRepository.findOpenReport(userId, target.type, target.id);
    if (open) throw new AppError('You already have an open report for this item.', 409, 'REPORT_ALREADY_OPEN', { reportId: open.id });
    return safetyRepository.createReport({
      kind: 'REPORT', reporterId: userId, targetType: target.type, targetId: target.id,
      reason: payload.reason, evidence: { details: payload.details || null, assets: payload.evidence },
    });
  },
};
