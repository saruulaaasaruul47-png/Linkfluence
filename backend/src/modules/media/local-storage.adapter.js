import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const mediaRoot = path.resolve(process.cwd(), 'uploads', 'media');

export const localMediaStorage = {
  async save({ ownerId, extension, buffer }) {
    const directory = path.resolve(mediaRoot, ownerId);
    if (!directory.startsWith(`${mediaRoot}${path.sep}`)) {
      throw new Error('Invalid media owner path.');
    }
    await fs.mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    const absolutePath = path.join(directory, filename);
    await fs.writeFile(absolutePath, buffer, { flag: 'wx' });
    return {
      storageKey: `${ownerId}/${filename}`,
      url: `/uploads/media/${ownerId}/${filename}`,
      absolutePath,
    };
  },

  async remove(storageKey) {
    const target = path.resolve(mediaRoot, storageKey);
    if (!target.startsWith(`${mediaRoot}${path.sep}`)) return;
    await fs.unlink(target).catch(() => {});
  },
};
