import { env } from '../../config/env.js';
import { localMediaStorage } from './local-storage.adapter.js';
import { s3MediaStorage } from './s3-storage.adapter.js';

export const mediaStorage = env.mediaStorageDriver === 's3' ? s3MediaStorage : localMediaStorage;
export const mediaStorageIsRemote = env.mediaStorageDriver === 's3';
