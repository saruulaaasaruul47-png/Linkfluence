import 'dotenv/config';
import { prisma } from '../src/config/database.js';

const requiredEmails = [
  'saaaa0189@gmail.com',
  'business@influencehub.mn',
  'creator@influencehub.mn',
];

try {
  const [accounts, users, creators, businesses, campaigns, posts, videoMedia, nonVideoMedia] = await Promise.all([
    prisma.user.findMany({
      where: { email: { in: requiredEmails } },
      select: { email: true, roles: true, status: true, emailVerifiedAt: true },
      orderBy: { email: 'asc' },
    }),
    prisma.user.count({ where: { id: { startsWith: 'seed_user_' } } }),
    prisma.creatorProfile.count({ where: { id: { startsWith: 'seed_creator_' } } }),
    prisma.businessProfile.count({ where: { id: { startsWith: 'seed_business_' } } }),
    prisma.campaign.count({ where: { id: { startsWith: 'seed_campaign_' } } }),
    prisma.contentPost.count({ where: { id: { startsWith: 'seed_content_' }, status: 'PUBLISHED' } }),
    prisma.contentMedia.count({ where: { id: { startsWith: 'seed_content_media_' }, mediaType: 'VIDEO' } }),
    prisma.contentMedia.count({ where: { id: { startsWith: 'seed_content_media_' }, mediaType: { not: 'VIDEO' } } }),
  ]);

  console.log(JSON.stringify({ accounts, counts: { users, creators, businesses, campaigns, publishedPosts: posts, videoMedia, nonVideoMedia } }, null, 2));
} finally {
  await prisma.$disconnect();
}
