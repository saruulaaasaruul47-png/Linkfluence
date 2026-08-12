import 'dotenv/config';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/database.js';
import { marketplaceService } from '../src/modules/marketplace/public.js';

const profileCount = Number.parseInt(process.env.CURSOR_PROFILE_COUNT || '10000', 10);
const batchSize = 500;
const runId = `cursor-stress-${Date.now()}`;

if (!Number.isInteger(profileCount) || profileCount < 100 || profileCount > 50_000) {
  throw new Error('CURSOR_PROFILE_COUNT must be an integer between 100 and 50000.');
}

const creatorFilters = (cursor) => ({
  q: runId,
  sort: 'most_followed',
  page: 1,
  limit: 50,
  cursor,
});

async function seed() {
  for (let offset = 0; offset < profileCount; offset += batchSize) {
    const size = Math.min(batchSize, profileCount - offset);
    const indexes = Array.from({ length: size }, (_, index) => offset + index);
    await prisma.$transaction(async (db) => {
      await db.user.createMany({
        data: indexes.map((index) => ({
          id: `${runId}-user-${index}`,
          email: `${runId}-${index}@example.com`,
          displayName: `Cursor Stress ${index}`,
          roles: ['VIEWER', 'CREATOR'],
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        })),
      });
      await db.creatorProfile.createMany({
        data: indexes.map((index) => ({
          id: `${runId}-profile-${index}`,
          userId: `${runId}-user-${index}`,
          channelName: `${runId} creator ${index}`,
          slug: `${runId}-${index}`,
          categories: [index % 2 ? 'Fashion' : 'Travel'],
          skills: ['Stress test'],
          languages: ['English'],
          availableForWork: true,
          createdAt: new Date(Date.now() - index),
        })),
      });
      await db.socialAccount.createMany({
        data: indexes.map((index) => ({
          id: `${runId}-social-${index}`,
          creatorId: `${runId}-profile-${index}`,
          platform: 'INSTAGRAM',
          handle: `${runId}-${index}`,
          followerCount: (index % 997) * 100,
          engagementRate: (index % 100) / 10,
        })),
      });
    });
  }
}

async function verify() {
  const seen = new Set();
  let cursor;
  let previousFollowers = Number.POSITIVE_INFINITY;
  let pages = 0;
  do {
    const result = await marketplaceService.listCreators(creatorFilters(cursor));
    for (const creator of result.items) {
      assert.equal(seen.has(creator.id), false, `Duplicate cursor item: ${creator.id}`);
      assert.ok(creator.followerCount <= previousFollowers, 'Follower ranking changed between cursor pages.');
      seen.add(creator.id);
      previousFollowers = creator.followerCount;
    }
    cursor = result.nextCursor;
    pages += 1;
  } while (cursor);
  assert.equal(seen.size, profileCount, `Expected ${profileCount} profiles but traversed ${seen.size}.`);
  return pages;
}

try {
  const startedAt = Date.now();
  await seed();
  const pages = await verify();
  console.log(JSON.stringify({
    event: 'marketplace_cursor_stress_passed',
    profiles: profileCount,
    pages,
    duplicateItems: 0,
    missingItems: 0,
    durationMs: Date.now() - startedAt,
  }));
} finally {
  await prisma.user.deleteMany({ where: { email: { startsWith: runId } } });
  await prisma.$disconnect();
}
