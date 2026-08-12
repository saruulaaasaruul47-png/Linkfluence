import fs from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../../shared/errors/AppError.js';
import { detectMedia } from '../media/media.magic.js';
import { avatarDirectory } from '../../shared/middleware/avatarUpload.js';
import { comparePassword, hashPassword } from '../../shared/utils/password.js';
import { toUserProfile } from './user.mapper.js';
import { userRepository } from './user.repository.js';

function requireUser(user) {
  if (!user || user.deletedAt) {
    throw new AppError('User was not found.', 404, 'USER_NOT_FOUND');
  }
  return user;
}

async function removePreviousAvatar(avatarUrl) {
  if (!avatarUrl?.startsWith('/uploads/avatars/')) return;
  const filename = path.basename(avatarUrl);
  const target = path.resolve(avatarDirectory, filename);
  if (!target.startsWith(`${avatarDirectory}${path.sep}`)) return;
  await fs.unlink(target).catch(() => {});
}

export const userService = {
  async getMe(userId) {
    return toUserProfile(requireUser(await userRepository.findById(userId)));
  },

  async updateMe(userId, payload) {
    const current = requireUser(await userRepository.findById(userId));
    if (payload.username && payload.username !== current.username) {
      const existing = await userRepository.findByUsername(payload.username);
      if (existing && existing.id !== userId) {
        throw new AppError('This username is already in use.', 409, 'USERNAME_ALREADY_EXISTS');
      }
    }
    const user = await userRepository.update(userId, payload);
    return toUserProfile(user);
  },

  async updateAvatar(userId, file) {
    if (!file) {
      throw new AppError('Choose an avatar image to upload.', 400, 'AVATAR_REQUIRED');
    }
    let detected;
    try {
      detected = detectMedia(await fs.readFile(file.path));
    } catch (error) {
      await fs.unlink(file.path).catch(() => {});
      throw error;
    }
    if (!detected || detected.kind !== 'IMAGE' || detected.mimeType !== file.mimetype) {
      await fs.unlink(file.path).catch(() => {});
      throw new AppError('The uploaded avatar is not a valid image.', 400, 'INVALID_AVATAR_FILE');
    }
    const current = requireUser(await userRepository.findById(userId));
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    try {
      const user = await userRepository.update(userId, { avatarUrl });
      await removePreviousAvatar(current.avatarUrl);
      return toUserProfile(user);
    } catch (error) {
      await fs.unlink(file.path).catch(() => {});
      throw error;
    }
  },

  async changePassword(userId, payload) {
    const user = requireUser(await userRepository.findById(userId));
    if (!user.passwordHash || !(await comparePassword(payload.currentPassword, user.passwordHash))) {
      throw new AppError('Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
    }
    const passwordHash = await hashPassword(payload.newPassword);
    await userRepository.updatePasswordAndRevokeSessions(userId, passwordHash);
    return { reauthenticationRequired: true };
  },

  async deleteMe(userId) {
    requireUser(await userRepository.findById(userId));
    await userRepository.softDeleteAndRevokeSessions(userId);
    return null;
  },
};
