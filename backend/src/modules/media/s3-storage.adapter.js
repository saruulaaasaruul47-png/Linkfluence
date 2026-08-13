import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';

const client = env.mediaStorageDriver === 's3' ? new S3Client({
  region: env.s3Region,
  endpoint: env.s3Endpoint,
  forcePathStyle: env.s3ForcePathStyle,
  credentials: { accessKeyId: env.s3AccessKeyId, secretAccessKey: env.s3SecretAccessKey },
}) : null;

export const s3MediaStorage = {
  async save({ ownerId, extension, buffer, mimeType }) {
    const storageKey = `media/${ownerId}/${randomUUID()}.${extension}`;
    await client.send(new PutObjectCommand({ Bucket: env.s3Bucket, Key: storageKey, Body: buffer, ContentType: mimeType }));
    return { storageKey, url: `s3://${env.s3Bucket}/${storageKey}` };
  },
  async remove(storageKey) {
    await client.send(new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: storageKey }));
  },
  async signedReadUrl(storageKey, expiresIn = env.mediaSignedUrlTtlSeconds) {
    return getSignedUrl(client, new GetObjectCommand({ Bucket: env.s3Bucket, Key: storageKey }), { expiresIn });
  },
};
