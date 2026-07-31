import 'dotenv/config';
import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/shared/utils/password.js';

const password = String(process.env.MARKETPLACE_SEED_PASSWORD || '');
if (password.length < 8) {
  throw new Error('Set MARKETPLACE_SEED_PASSWORD to a strong password with at least 8 characters.');
}

const passwordHash = await hashPassword(password);

const creators = [
  {
    email: 'amara.creator@example.com',
    name: 'Amara Bat',
    slug: 'amara-b',
    bio: 'Fashion storyteller framing modern Mongolia through color, movement and honest personal style.',
    category: 'Fashion',
    location: 'Ulaanbaatar, Mongolia',
    rate: 1800000,
    rating: 4.9,
    followers: 210000,
    engagement: 6.8,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=85',
    cover: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=85',
  },
  {
    email: 'temuulen.creator@example.com',
    name: 'Temuulen Film',
    slug: 'temuulen-film',
    bio: 'Cinematic field notes from remote landscapes, local kitchens and people keeping culture moving.',
    category: 'Travel',
    location: 'Ulaanbaatar, Mongolia',
    rate: 2400000,
    rating: 4.8,
    followers: 118000,
    engagement: 8.2,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=85',
    cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=85',
  },
  {
    email: 'nara.creator@example.com',
    name: 'Nara Eats',
    slug: 'nara-eats',
    bio: 'Warm food stories, useful recipes and beautifully imperfect tables across two cities.',
    category: 'Food',
    location: 'Seoul · Ulaanbaatar',
    rate: 1500000,
    rating: 4.9,
    followers: 275000,
    engagement: 5.9,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=85',
    cover: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=85',
  },
  {
    email: 'enkh.creator@example.com',
    name: 'Enkh Tech',
    slug: 'enkh-tech',
    bio: 'Clear explainers about useful technology, digital craft and building products in Mongolia.',
    category: 'Technology',
    location: 'Ulaanbaatar, Mongolia',
    rate: 1200000,
    rating: 4.7,
    followers: 88000,
    engagement: 9.4,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=85',
    cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=85',
  },
];

const businesses = [
  {
    email: 'aero.business@example.com',
    name: 'Aero Mongolia',
    slug: 'aero-mongolia',
    industry: 'Travel & hospitality',
    description: 'Connecting people, places and stories across Mongolia and beyond.',
    location: 'Ulaanbaatar, Mongolia',
    rating: 4.8,
    cover: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=85',
  },
  {
    email: 'gobi.business@example.com',
    name: 'GOBI Cashmere',
    slug: 'gobi-cashmere',
    industry: 'Fashion & apparel',
    description: 'Contemporary cashmere made with respect for craft, land and lasting quality.',
    location: 'Ulaanbaatar, Mongolia',
    rating: 4.9,
    cover: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1400&q=85',
  },
  {
    email: 'lhamour.business@example.com',
    name: 'Lhamour',
    slug: 'lhamour',
    industry: 'Beauty & wellness',
    description: 'Conscious Mongolian skincare rooted in local ingredients and responsible making.',
    location: 'Ulaanbaatar, Mongolia',
    rating: 4.9,
    cover: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1400&q=85',
  },
];

for (const item of creators) {
  const user = await prisma.user.upsert({
    where: { email: item.email },
    create: {
      email: item.email,
      displayName: item.name,
      passwordHash,
      roles: ['VIEWER', 'CREATOR'],
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    update: {
      displayName: item.name,
      passwordHash,
      roles: ['VIEWER', 'CREATOR'],
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      deletedAt: null,
    },
  });
  const profile = await prisma.creatorProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      channelName: item.name,
      slug: item.slug,
      bio: item.bio,
      categories: [item.category],
      location: item.location,
      startingRate: item.rate,
      avatarUrl: item.avatar,
      coverUrl: item.cover,
      verificationStatus: 'VERIFIED',
      ratingAverage: item.rating,
      ratingCount: 12,
    },
    update: {
      channelName: item.name,
      slug: item.slug,
      bio: item.bio,
      categories: [item.category],
      location: item.location,
      startingRate: item.rate,
      avatarUrl: item.avatar,
      coverUrl: item.cover,
      verificationStatus: 'VERIFIED',
      ratingAverage: item.rating,
      ratingCount: 12,
    },
  });
  await prisma.socialAccount.deleteMany({ where: { creatorId: profile.id } });
  await prisma.socialAccount.create({
    data: {
      creatorId: profile.id,
      platform: 'INSTAGRAM',
      handle: item.slug,
      profileUrl: `https://instagram.com/${item.slug}`,
      followerCount: item.followers,
      engagementRate: item.engagement,
      verificationStatus: 'VERIFIED',
    },
  });
  const portfolioId = `seed-portfolio-${item.slug}`;
  await prisma.portfolioItem.upsert({
    where: { id: portfolioId },
    create: {
      id: portfolioId,
      creatorId: profile.id,
      title: `${item.name} — featured work`,
      description: `A featured ${item.category.toLowerCase()} story from ${item.name}.`,
      category: item.category,
      mediaType: 'IMAGE',
      mediaUrl: item.cover,
      thumbnailUrl: item.cover,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    update: {
      creatorId: profile.id,
      title: `${item.name} — featured work`,
      description: `A featured ${item.category.toLowerCase()} story from ${item.name}.`,
      category: item.category,
      mediaUrl: item.cover,
      thumbnailUrl: item.cover,
      status: 'PUBLISHED',
      deletedAt: null,
      publishedAt: new Date(),
    },
  });
  await prisma.showcasePost.upsert({
    where: { id: `seed-showcase-${item.slug}` },
    create: {
      id: `seed-showcase-${item.slug}`,
      creatorId: profile.id,
      portfolioItemId: portfolioId,
      title: `${item.name} — showcase`,
      description: item.bio,
      category: item.category,
      mediaType: 'IMAGE',
      mediaUrl: item.cover,
      thumbnailUrl: item.cover,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    update: {
      creatorId: profile.id,
      portfolioItemId: portfolioId,
      title: `${item.name} — showcase`,
      description: item.bio,
      category: item.category,
      mediaUrl: item.cover,
      thumbnailUrl: item.cover,
      status: 'PUBLISHED',
      archivedAt: null,
      publishedAt: new Date(),
    },
  });
}

for (const item of businesses) {
  const user = await prisma.user.upsert({
    where: { email: item.email },
    create: {
      email: item.email,
      displayName: item.name,
      passwordHash,
      roles: ['VIEWER', 'BUSINESS'],
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    update: {
      displayName: item.name,
      passwordHash,
      roles: ['VIEWER', 'BUSINESS'],
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      deletedAt: null,
    },
  });
  const profile = await prisma.businessProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      companyName: item.name,
      slug: item.slug,
      industry: item.industry,
      description: item.description,
      location: item.location,
      coverUrl: item.cover,
      verificationStatus: 'VERIFIED',
      ratingAverage: item.rating,
      ratingCount: 18,
    },
    update: {
      companyName: item.name,
      slug: item.slug,
      industry: item.industry,
      description: item.description,
      location: item.location,
      coverUrl: item.cover,
      verificationStatus: 'VERIFIED',
      ratingAverage: item.rating,
      ratingCount: 18,
    },
  });
  const campaignTemplates = {
    'aero-mongolia': {
      slug: 'city-in-motion',
      title: 'City in Motion',
      category: 'Travel',
      goal: 'Show modern travel through a creator-led city story.',
      platforms: ['INSTAGRAM', 'TIKTOK'],
      budgetMin: 9000000,
      budgetMax: 12000000,
      deliverables: ['2 short-form videos', '4 story frames'],
    },
    'gobi-cashmere': {
      slug: 'soft-icons-aw26',
      title: 'Soft Icons AW26',
      category: 'Fashion',
      goal: 'Introduce the AW26 collection through personal style.',
      platforms: ['INSTAGRAM'],
      budgetMin: 15000000,
      budgetMax: 20000000,
      deliverables: ['1 editorial film', '6 edited stills'],
    },
    lhamour: {
      slug: 'skin-honestly',
      title: 'Skin, Honestly',
      category: 'Beauty',
      goal: 'Create useful, transparent skincare education.',
      platforms: ['INSTAGRAM', 'TIKTOK'],
      budgetMin: 5000000,
      budgetMax: 8000000,
      deliverables: ['3 creator videos', 'Usage for 90 days'],
    },
  };
  const campaign = campaignTemplates[item.slug];
  const applicationDeadline = new Date();
  applicationDeadline.setUTCDate(applicationDeadline.getUTCDate() + 45);
  await prisma.campaign.upsert({
    where: { slug: campaign.slug },
    create: {
      businessId: profile.id,
      title: campaign.title,
      slug: campaign.slug,
      description: `${campaign.goal} The brief includes clear deliverables, approval expectations and usage terms.`,
      category: campaign.category,
      goal: campaign.goal,
      platforms: campaign.platforms,
      budgetMin: campaign.budgetMin,
      budgetMax: campaign.budgetMax,
      deliverables: campaign.deliverables,
      requirements: { verifiedCreatorsOnly: true, location: 'Mongolia' },
      status: 'OPEN',
      isPublic: true,
      publishedAt: new Date(),
      applicationDeadline,
    },
    update: {
      businessId: profile.id,
      title: campaign.title,
      description: `${campaign.goal} The brief includes clear deliverables, approval expectations and usage terms.`,
      category: campaign.category,
      goal: campaign.goal,
      platforms: campaign.platforms,
      budgetMin: campaign.budgetMin,
      budgetMax: campaign.budgetMax,
      deliverables: campaign.deliverables,
      requirements: { verifiedCreatorsOnly: true, location: 'Mongolia' },
      status: 'OPEN',
      isPublic: true,
      archivedAt: null,
      publishedAt: new Date(),
      applicationDeadline,
    },
  });
}

console.log(`Seeded ${creators.length} creators, ${creators.length} showcase posts, ${businesses.length} businesses and ${businesses.length} campaigns.`);
await prisma.$disconnect();
