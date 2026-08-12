import 'dotenv/config';
import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/shared/utils/password.js';
import { ledgerRules, postLedgerBatch } from '../src/modules/payments/ledger.service.js';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Demo seed is disabled in production. Set ALLOW_DEMO_SEED=true only for an intentional demo environment.');
}

const CREDENTIALS = {
  admin: { email: 'admin@vyra.example', password: 'VyraAdmin2026!', displayName: 'Vyra Admin', username: 'vyra_admin', roles: ['VIEWER', 'ADMIN'] },
  viewer: { email: 'viewer@vyra.example', password: 'VyraViewer2026!', displayName: 'Saraa Viewer', username: 'saraa_viewer', roles: ['VIEWER'] },
  creators: [
    { key: 'amara', email: 'amara.creator@vyra.example', password: 'VyraCreator2026!', displayName: 'Amara Bat', username: 'amara_bat' },
    { key: 'temuulen', email: 'temuulen.creator@vyra.example', password: 'VyraCreator2026!', displayName: 'Temuulen Film', username: 'temuulen_film' },
    { key: 'nara', email: 'nara.creator@vyra.example', password: 'VyraCreator2026!', displayName: 'Nara Eats', username: 'nara_eats' },
    { key: 'enkh', email: 'enkh.creator@vyra.example', password: 'VyraCreator2026!', displayName: 'Enkh Tech', username: 'enkh_tech' },
  ],
  businesses: [
    { key: 'gobi', email: 'gobi.business@vyra.example', password: 'VyraBusiness2026!', displayName: 'GOBI Cashmere', username: 'gobi_cashmere' },
    { key: 'aero', email: 'aero.business@vyra.example', password: 'VyraBusiness2026!', displayName: 'Aero Mongolia', username: 'aero_mongolia' },
    { key: 'tirtir', email: 'tirtir.business@vyra.example', password: 'VyraBusiness2026!', displayName: 'TIRTIR Mongolia', username: 'tirtir_mongolia' },
  ],
};

const creatorProfiles = {
  amara: {
    channelName: 'Amara Bat', slug: 'amara-bat', bio: 'Fashion editor and short-form creator turning Mongolian design into visual stories.',
    location: 'Ulaanbaatar, Mongolia', categories: ['Fashion', 'Beauty'], skills: ['Editorial styling', 'UGC', 'Short-form video'],
    languages: ['Mongolian', 'English'], audienceDescription: 'Style-conscious women aged 18–34 in Mongolia.', contentFormat: 'Reels, editorial photo and UGC',
    startingRate: 1800000, rates: { reel: 2800000, story: 650000, ugcVideo: 1900000 }, availability: 'Available this month',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=640&q=85',
    coverUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=85',
    verificationStatus: 'VERIFIED', ratingAverage: 4.9, ratingCount: 18,
    social: [
      { platform: 'INSTAGRAM', handle: 'amara.bat', followers: 218400, engagement: 6.8 },
      { platform: 'TIKTOK', handle: 'amarabat', followers: 146800, engagement: 8.1 },
    ],
  },
  temuulen: {
    channelName: 'Temuulen Film', slug: 'temuulen-film', bio: 'Travel filmmaker sharing cinematic journeys, destinations and human stories.',
    location: 'Ulaanbaatar, Mongolia', categories: ['Travel', 'Film'], skills: ['Cinematography', 'Drone video', 'Storytelling'],
    languages: ['Mongolian', 'English'], audienceDescription: 'Travelers and film lovers aged 20–40.', contentFormat: 'Cinematic reels and mini-documentaries',
    startingRate: 2400000, rates: { reel: 3500000, story: 500000, campaignFilm: 8500000 }, availability: 'Open for travel campaigns',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=640&q=85',
    coverUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85',
    verificationStatus: 'VERIFIED', ratingAverage: 4.8, ratingCount: 14,
    social: [
      { platform: 'INSTAGRAM', handle: 'temuulen.film', followers: 118900, engagement: 8.2 },
      { platform: 'YOUTUBE', handle: 'temuulenfilm', followers: 93200, engagement: 5.7 },
    ],
  },
  nara: {
    channelName: 'Nara Eats', slug: 'nara-eats', bio: 'Warm food stories, useful recipes and beautifully imperfect tables shared across two cities.',
    location: 'Seoul · Ulaanbaatar', categories: ['Food', 'Lifestyle'], skills: ['Recipe development', 'Food styling', 'UGC'],
    languages: ['Mongolian', 'Korean', 'English'], audienceDescription: 'Food and lifestyle audience across Mongolia and Korea.', contentFormat: 'Recipe reels, reviews and photo stories',
    startingRate: 1500000, rates: { reel: 2600000, story: 450000, recipeVideo: 3200000 }, availability: 'Available now',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=640&q=85',
    coverUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1800&q=85',
    verificationStatus: 'VERIFIED', ratingAverage: 4.9, ratingCount: 22,
    social: [
      { platform: 'INSTAGRAM', handle: 'nara.eats', followers: 276300, engagement: 5.9 },
      { platform: 'TIKTOK', handle: 'naraeats', followers: 312000, engagement: 7.4 },
    ],
  },
  enkh: {
    channelName: 'Enkh Tech', slug: 'enkh-tech', bio: 'Technology educator making useful apps, devices and digital skills easy to understand.',
    location: 'Ulaanbaatar, Mongolia', categories: ['Technology', 'Education'], skills: ['Product review', 'Tutorial', 'Live demo'],
    languages: ['Mongolian', 'English'], audienceDescription: 'Students, young professionals and early adopters.', contentFormat: 'Tutorials, reviews and explainers',
    startingRate: 1200000, rates: { reel: 2100000, story: 350000, review: 2800000 }, availability: 'Available next week',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=640&q=85',
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=85',
    verificationStatus: 'VERIFIED', ratingAverage: 4.7, ratingCount: 11,
    social: [
      { platform: 'YOUTUBE', handle: 'enkhtech', followers: 88700, engagement: 9.4 },
      { platform: 'FACEBOOK', handle: 'enkh.tech.mn', followers: 65400, engagement: 6.2 },
    ],
  },
};

const businessProfiles = {
  gobi: {
    companyName: 'GOBI Cashmere', slug: 'gobi-cashmere', description: 'Contemporary Mongolian cashmere made for a global audience.', industry: 'Fashion',
    location: 'Ulaanbaatar, Mongolia', website: 'https://www.gobicashmere.com', companySize: '500+',
    logoUrl: 'https://ui-avatars.com/api/?name=GOBI&background=ffd3e8&color=511331&size=512',
    coverUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85', verificationStatus: 'VERIFIED', ratingAverage: 4.9, ratingCount: 16,
  },
  aero: {
    companyName: 'Aero Mongolia', slug: 'aero-mongolia', description: 'Connecting people, places and stories across Mongolia and beyond.', industry: 'Travel & Aviation',
    location: 'Ulaanbaatar, Mongolia', website: 'https://www.aeromongolia.mn', companySize: '201–500',
    logoUrl: 'https://ui-avatars.com/api/?name=Aero+Mongolia&background=b8f7d0&color=073b25&size=512',
    coverUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=85', verificationStatus: 'VERIFIED', ratingAverage: 4.8, ratingCount: 12,
  },
  tirtir: {
    companyName: 'TIRTIR Mongolia', slug: 'tirtir-mongolia', description: 'K-beauty complexion essentials and everyday glow for Mongolian customers.', industry: 'Beauty',
    location: 'Ulaanbaatar, Mongolia', website: 'https://www.tirtir.global', companySize: '51–200',
    logoUrl: 'https://ui-avatars.com/api/?name=TIRTIR&background=ff5fa8&color=ffffff&size=512',
    coverUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1800&q=85', verificationStatus: 'VERIFIED', ratingAverage: 4.7, ratingCount: 9,
  },
};

const mediaByCreator = {
  amara: [
    ['Soft Icons AW26', 'Editorial styling and short-form campaign for a modern cashmere collection.', 'Fashion', 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=85'],
    ['City Layers', 'Street-style visual diary from central Ulaanbaatar.', 'Fashion', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85'],
  ],
  temuulen: [
    ['City in Motion', 'A cinematic destination film connecting city energy with open landscapes.', 'Travel', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85'],
    ['Blue Sky Routes', 'Aerial travel story from the heart of Mongolia.', 'Film', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=85'],
  ],
  nara: [
    ['Skin, Honestly', 'A calm morning routine told through food, skin and daily rituals.', 'Beauty', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85'],
    ['Seoul Table', 'Seasonal recipes and intimate table stories.', 'Food', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85'],
  ],
  enkh: [
    ['Work Smarter', 'A practical device workflow explained in under sixty seconds.', 'Technology', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85'],
    ['Pocket Studio', 'Creator tools and a compact mobile production setup.', 'Education', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=85'],
  ],
};

const creatorVideoPost = {
  creatorKey: 'temuulen',
  title: 'Golden Hour in Motion',
  caption: 'A short cinematic travel moment captured on the road.',
  category: 'Travel',
  url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  durationMs: 30000,
};

const postVideoByCreator = {
  amara: {
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    durationMs: 15000,
  },
  temuulen: {
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    durationMs: 15000,
  },
  nara: {
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    durationMs: 60000,
  },
  enkh: {
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    durationMs: 15000,
  },
};

const campaignData = [
  { key: 'gobi-soft-icons', business: 'gobi', title: 'Soft Icons AW26', slug: 'soft-icons-aw26', category: 'Fashion', platforms: ['INSTAGRAM', 'TIKTOK'], budgetMin: 8000000, budgetMax: 12000000, goal: 'Introduce the AW26 collection through creator-led styling stories.', deliverables: ['2 Reels', '4 Stories', '8 edited photos'] },
  { key: 'gobi-everyday-cashmere', business: 'gobi', title: 'Everyday Cashmere', slug: 'everyday-cashmere', category: 'Lifestyle', platforms: ['INSTAGRAM'], budgetMin: 3500000, budgetMax: 6500000, goal: 'Show how cashmere fits into everyday city life.', deliverables: ['1 Reel', '3 Stories'] },
  { key: 'aero-city-motion', business: 'aero', title: 'City in Motion', slug: 'city-in-motion', category: 'Travel', platforms: ['INSTAGRAM', 'YOUTUBE'], budgetMin: 7000000, budgetMax: 11500000, goal: 'Build destination awareness through cinematic travel content.', deliverables: ['1 hero film', '2 Reels', '6 Stories'] },
  { key: 'aero-weekend-routes', business: 'aero', title: 'Weekend Routes', slug: 'weekend-routes', category: 'Travel', platforms: ['INSTAGRAM', 'TIKTOK'], budgetMin: 3000000, budgetMax: 5500000, goal: 'Promote accessible weekend destinations.', deliverables: ['2 Reels', '4 Stories'] },
  { key: 'tirtir-glow-cushion', business: 'tirtir', title: 'TIRTIR Cushion Glow', slug: 'tirtir-cushion-glow', category: 'Beauty', platforms: ['INSTAGRAM', 'TIKTOK'], budgetMin: 2500000, budgetMax: 6000000, goal: 'Launch the cushion foundation with honest wear tests.', deliverables: ['2 UGC videos', '3 Stories', 'Before/after photos'] },
  { key: 'tirtir-real-skin', business: 'tirtir', title: 'Real Skin Diaries', slug: 'real-skin-diaries', category: 'Beauty', platforms: ['INSTAGRAM'], budgetMin: 1800000, budgetMax: 4000000, goal: 'Share authentic seven-day product experiences.', deliverables: ['1 Reel', 'Daily Stories'] },
];

const daysFromNow = (days, hour = 12) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const daysAgo = (days, hour = 12) => daysFromNow(-days, hour);

async function upsertUser(tx, key, input) {
  const passwordHash = await hashPassword(input.password);
  return tx.user.upsert({
    where: { email: input.email },
    create: {
      id: `seed_user_${key}`, email: input.email, username: input.username, displayName: input.displayName,
      passwordHash, roles: input.roles, status: 'ACTIVE', emailVerifiedAt: daysAgo(60), lastSeenAt: new Date(),
    },
    update: {
      username: input.username, displayName: input.displayName, passwordHash, roles: input.roles,
      status: 'ACTIVE', emailVerifiedAt: daysAgo(60), deletedAt: null,
    },
  });
}

async function seedAccounts() {
  const users = {};
  users.admin = await upsertUser(prisma, 'admin', CREDENTIALS.admin);
  users.viewer = await upsertUser(prisma, 'viewer', CREDENTIALS.viewer);

  for (const input of CREDENTIALS.creators) {
    const user = await upsertUser(prisma, `creator_${input.key}`, { ...input, roles: ['VIEWER', 'CREATOR'] });
    const profile = creatorProfiles[input.key];
    const creatorData = { ...profile };
    delete creatorData.social;
    const creator = await prisma.creatorProfile.upsert({
      where: { userId: user.id },
      create: {
        id: `seed_creator_${input.key}`, userId: user.id, ...creatorData, currency: 'MNT', publicRates: true,
        availableForWork: true, metadata: { seeded: true, responseTime: 'Within 4 hours' },
      },
      update: { ...creatorData, currency: 'MNT', publicRates: true, availableForWork: true, metadata: { seeded: true, responseTime: 'Within 4 hours' } },
    });
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: profile.avatarUrl, location: profile.location, bio: profile.bio } });
    await prisma.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    users[input.key] = { user, creator };
  }

  for (const input of CREDENTIALS.businesses) {
    const user = await upsertUser(prisma, `business_${input.key}`, { ...input, roles: ['VIEWER', 'BUSINESS'] });
    const profile = businessProfiles[input.key];
    const business = await prisma.businessProfile.upsert({
      where: { userId: user.id },
      create: { id: `seed_business_${input.key}`, userId: user.id, ...profile, contactEmail: input.email, preferences: { seeded: true, preferredFormats: ['Reels', 'Stories', 'UGC'] } },
      update: { ...profile, contactEmail: input.email, preferences: { seeded: true, preferredFormats: ['Reels', 'Stories', 'UGC'] } },
    });
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: profile.logoUrl, location: profile.location, bio: profile.description } });
    await prisma.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    users[input.key] = { user, business };
  }

  await prisma.notificationPreference.upsert({ where: { userId: users.viewer.id }, create: { userId: users.viewer.id }, update: {} });
  await prisma.notificationPreference.upsert({ where: { userId: users.admin.id }, create: { userId: users.admin.id }, update: {} });
  return users;
}

async function seedCreatorDiscovery(users) {
  const portfolio = {};
  const showcase = {};
  const content = {};

  for (const input of CREDENTIALS.creators) {
    const key = input.key;
    const { user, creator } = users[key];
    const profile = creatorProfiles[key];
    for (let index = 0; index < profile.social.length; index += 1) {
      const social = profile.social[index];
      await prisma.socialAccount.upsert({
        where: { id: `seed_social_${key}_${social.platform.toLowerCase()}` },
        create: {
          id: `seed_social_${key}_${social.platform.toLowerCase()}`, creatorId: creator.id, platform: social.platform,
          handle: social.handle, profileUrl: `https://example.com/${social.handle}`, followerCount: social.followers,
          engagementRate: social.engagement, verificationStatus: 'VERIFIED', syncStatus: 'MANUAL',
          lastSyncAt: daysAgo(1), metadata: { seeded: true, dataSource: 'demo' },
        },
        update: {
          handle: social.handle, followerCount: social.followers, engagementRate: social.engagement,
          verificationStatus: 'VERIFIED', syncStatus: 'MANUAL', lastSyncAt: daysAgo(1), metadata: { seeded: true, dataSource: 'demo' },
        },
      });
    }

    portfolio[key] = [];
    for (let index = 0; index < mediaByCreator[key].length; index += 1) {
      const [title, description, category, url] = mediaByCreator[key][index];
      const asset = await prisma.mediaAsset.upsert({
        where: { storageKey: `seed/portfolio/${key}/${index + 1}.jpg` },
        create: {
          id: `seed_asset_${key}_${index + 1}`, ownerId: user.id, purpose: 'PORTFOLIO', storageKey: `seed/portfolio/${key}/${index + 1}.jpg`,
          url, originalName: `${key}-${index + 1}.jpg`, mimeType: 'image/jpeg', sizeBytes: 480000 + index * 12000, checksum: `seed-checksum-${key}-${index + 1}`,
        },
        update: { url, deletedAt: null },
      });
      const item = await prisma.portfolioItem.upsert({
        where: { id: `seed_portfolio_${key}_${index + 1}` },
        create: {
          id: `seed_portfolio_${key}_${index + 1}`, creatorId: creator.id, mediaAssetId: asset.id, title, description, category,
          mediaType: 'IMAGE', mediaUrl: url, thumbnailUrl: url, statistics: { views: 48000 + index * 17000, likes: 5200 + index * 900, reach: 86000 + index * 22000 },
          status: 'PUBLISHED', verified: index === 0, sortOrder: index, publishedAt: daysAgo(20 + index * 18),
        },
        update: { title, description, category, mediaAssetId: asset.id, mediaUrl: url, thumbnailUrl: url, status: 'PUBLISHED', verified: index === 0, deletedAt: null },
      });
      portfolio[key].push(item);

      if (index === 0) {
        showcase[key] = await prisma.showcasePost.upsert({
          where: { id: `seed_showcase_${key}` },
          create: {
            id: `seed_showcase_${key}`, creatorId: creator.id, portfolioItemId: item.id, title, description, category,
            mediaType: 'IMAGE', mediaUrl: url, thumbnailUrl: url, status: 'PUBLISHED', publishedAt: daysAgo(8),
          },
          update: { creatorId: creator.id, portfolioItemId: item.id, title, description, category, mediaUrl: url, thumbnailUrl: url, status: 'PUBLISHED', archivedAt: null },
        });
      }
    }

    const seedVideo = postVideoByCreator[key];
    const postAsset = await prisma.mediaAsset.upsert({
      where: { storageKey: `seed/content/${key}/post.mp4` },
      create: {
        id: `seed_asset_${key}_post_video`,
        ownerId: user.id,
        purpose: 'CONTENT',
        storageKey: `seed/content/${key}/post.mp4`,
        url: seedVideo.url,
        originalName: `${key}-post.mp4`,
        mimeType: 'video/mp4',
        sizeBytes: 2500000,
        checksum: `seed-checksum-${key}-post-video`,
      },
      update: {
        ownerId: user.id,
        purpose: 'CONTENT',
        url: seedVideo.url,
        originalName: `${key}-post.mp4`,
        mimeType: 'video/mp4',
        sizeBytes: 2500000,
        deletedAt: null,
      },
    });
    const post = await prisma.contentPost.upsert({
      where: { id: `seed_content_${key}_post` },
      create: {
        id: `seed_content_${key}_post`, authorType: 'CREATOR', creatorId: creator.id, postType: 'ORIGINAL',
        title: mediaByCreator[key][1][0], caption: mediaByCreator[key][1][1], category: profile.categories[0],
        visibility: 'PUBLIC', status: 'PUBLISHED', publishedAt: daysAgo(2),
      },
      update: { creatorId: creator.id, title: mediaByCreator[key][1][0], caption: mediaByCreator[key][1][1], category: profile.categories[0], status: 'PUBLISHED', deletedAt: null, hiddenAt: null },
    });
    await prisma.contentMedia.upsert({
      where: { id: `seed_content_media_${key}` },
      create: {
        id: `seed_content_media_${key}`,
        postId: post.id,
        mediaAssetId: postAsset.id,
        mediaType: 'VIDEO',
        durationMs: seedVideo.durationMs,
        altText: `${profile.channelName} creator video post`,
      },
      update: {
        mediaAssetId: postAsset.id,
        mediaType: 'VIDEO',
        durationMs: seedVideo.durationMs,
        altText: `${profile.channelName} creator video post`,
      },
    });
    content[`${key}Post`] = post;

    if (key === creatorVideoPost.creatorKey) {
      const videoAsset = await prisma.mediaAsset.upsert({
        where: { storageKey: `seed/content/${key}/golden-hour.mp4` },
        create: {
          id: `seed_asset_${key}_video`,
          ownerId: user.id,
          purpose: 'CONTENT',
          storageKey: `seed/content/${key}/golden-hour.mp4`,
          url: creatorVideoPost.url,
          originalName: 'golden-hour.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 1128375,
          checksum: `seed-checksum-${key}-video`,
        },
        update: {
          ownerId: user.id,
          purpose: 'CONTENT',
          url: creatorVideoPost.url,
          originalName: 'golden-hour.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 1128375,
          deletedAt: null,
        },
      });
      const videoPost = await prisma.contentPost.upsert({
        where: { id: `seed_content_${key}_video` },
        create: {
          id: `seed_content_${key}_video`,
          authorType: 'CREATOR',
          creatorId: creator.id,
          postType: 'ORIGINAL',
          title: creatorVideoPost.title,
          caption: creatorVideoPost.caption,
          category: creatorVideoPost.category,
          visibility: 'PUBLIC',
          status: 'PUBLISHED',
          publishedAt: daysAgo(1),
        },
        update: {
          creatorId: creator.id,
          title: creatorVideoPost.title,
          caption: creatorVideoPost.caption,
          category: creatorVideoPost.category,
          visibility: 'PUBLIC',
          status: 'PUBLISHED',
          publishedAt: daysAgo(1),
          deletedAt: null,
          hiddenAt: null,
        },
      });
      await prisma.contentMedia.upsert({
        where: { postId_mediaAssetId: { postId: videoPost.id, mediaAssetId: videoAsset.id } },
        create: {
          id: `seed_content_media_${key}_video`,
          postId: videoPost.id,
          mediaAssetId: videoAsset.id,
          mediaType: 'VIDEO',
          durationMs: creatorVideoPost.durationMs,
          altText: `${profile.channelName} cinematic travel video`,
        },
        update: {
          mediaType: 'VIDEO',
          durationMs: creatorVideoPost.durationMs,
          altText: `${profile.channelName} cinematic travel video`,
        },
      });
      content[`${key}Video`] = videoPost;
    }

    const story = await prisma.contentPost.upsert({
      where: { id: `seed_content_${key}_story` },
      create: {
        id: `seed_content_${key}_story`, authorType: 'CREATOR', creatorId: creator.id, postType: 'STORY',
        caption: `${profile.channelName}-ийн өнөөдрийн шинэ story`, storyStyle: { background: key === 'amara' ? 'pink-orange' : 'blue-purple', textX: 50, textY: 52, textAlign: 'center' },
        category: profile.categories[0], visibility: 'PUBLIC', status: 'PUBLISHED', publishedAt: new Date(), expiresAt: daysFromNow(1),
      },
      update: { caption: `${profile.channelName}-ийн өнөөдрийн шинэ story`, status: 'PUBLISHED', publishedAt: new Date(), expiresAt: daysFromNow(1), archivedAt: null, deletedAt: null },
    });
    content[`${key}Story`] = story;
  }
  return { portfolio, showcase, content };
}

async function seedBusinessesAndCampaigns(users) {
  const campaigns = {};
  for (const item of campaignData) {
    const business = users[item.business].business;
    campaigns[item.key] = await prisma.campaign.upsert({
      where: { slug: item.slug },
      create: {
        id: `seed_campaign_${item.key}`, businessId: business.id, title: item.title, slug: item.slug,
        description: item.goal, category: item.category, platforms: item.platforms, budgetMin: item.budgetMin, budgetMax: item.budgetMax,
        currency: 'MNT', deadline: daysFromNow(35), applicationDeadline: daysFromNow(14), requirements: { minFollowers: 10000, location: 'Mongolia', disclosureRequired: true },
        goal: item.goal, deliverables: item.deliverables, status: 'OPEN', isPublic: true, publishedAt: daysAgo(3), productSupport: { provided: true, details: 'Product and campaign brief are provided after selection.' },
      },
      update: {
        businessId: business.id, title: item.title, description: item.goal, category: item.category, platforms: item.platforms,
        budgetMin: item.budgetMin, budgetMax: item.budgetMax, deadline: daysFromNow(35), applicationDeadline: daysFromNow(14),
        goal: item.goal, deliverables: item.deliverables, status: 'OPEN', isPublic: true, archivedAt: null,
      },
    });
  }

  for (const input of CREDENTIALS.businesses) {
    const key = input.key;
    const { business } = users[key];
    const profile = businessProfiles[key];
    await prisma.socialAccount.upsert({
      where: { id: `seed_social_business_${key}` },
      create: {
        id: `seed_social_business_${key}`, businessId: business.id, platform: 'FACEBOOK', handle: profile.slug,
        profileUrl: profile.website, followerCount: key === 'gobi' ? 384000 : key === 'aero' ? 128000 : 94600,
        engagementRate: key === 'gobi' ? 4.8 : 5.2, verificationStatus: 'VERIFIED', syncStatus: 'MANUAL', lastSyncAt: daysAgo(1), metadata: { seeded: true },
      },
      update: { followerCount: key === 'gobi' ? 384000 : key === 'aero' ? 128000 : 94600, verificationStatus: 'VERIFIED', lastSyncAt: daysAgo(1) },
    });

    const campaign = Object.values(campaigns).find((value) => value.businessId === business.id);
    await prisma.contentPost.upsert({
      where: { id: `seed_content_business_${key}` },
      create: {
        id: `seed_content_business_${key}`, authorType: 'BUSINESS', businessId: business.id, postType: 'BRAND_STORY',
        title: campaign.title, caption: profile.description, category: profile.industry, campaignId: campaign.id,
        visibility: 'PUBLIC', status: 'PUBLISHED', publishedAt: daysAgo(1),
      },
      update: { businessId: business.id, title: campaign.title, caption: profile.description, category: profile.industry, campaignId: campaign.id, status: 'PUBLISHED', deletedAt: null, hiddenAt: null },
    });
  }
  return campaigns;
}

async function seedSocialActions(users, discovery, campaigns) {
  const follows = [
    ['CREATOR', users.amara.creator.id], ['CREATOR', users.nara.creator.id], ['CREATOR', users.temuulen.creator.id],
    ['BUSINESS', users.gobi.business.id], ['BUSINESS', users.tirtir.business.id],
  ];
  for (let index = 0; index < follows.length; index += 1) {
    const [targetType, targetId] = follows[index];
    await prisma.follow.upsert({
      where: { followerId_targetType_targetId: { followerId: users.viewer.id, targetType, targetId } },
      create: { id: `seed_follow_${index + 1}`, followerId: users.viewer.id, targetType, targetId }, update: {},
    });
  }

  const saved = [
    ['CREATOR', users.amara.creator.id], ['CAMPAIGN', campaigns['tirtir-glow-cushion'].id],
    ['SHOWCASE', discovery.showcase.temuulen.id], ['CONTENT', discovery.content.naraPost.id],
  ];
  for (let index = 0; index < saved.length; index += 1) {
    const [targetType, targetId] = saved[index];
    await prisma.savedItem.upsert({
      where: { userId_targetType_targetId: { userId: users.viewer.id, targetType, targetId } },
      create: { id: `seed_saved_${index + 1}`, userId: users.viewer.id, targetType, targetId }, update: {},
    });
  }

  const collection = await prisma.collection.upsert({
    where: { ownerId_name: { ownerId: users.viewer.id, name: 'Campaign inspiration' } },
    create: { id: 'seed_collection_inspiration', ownerId: users.viewer.id, name: 'Campaign inspiration', description: 'Saved creators and work for the next campaign.', isDefault: true },
    update: { description: 'Saved creators and work for the next campaign.', isDefault: true },
  });
  await prisma.collectionItem.upsert({
    where: { collectionId_targetType_targetId: { collectionId: collection.id, targetType: 'SHOWCASE', targetId: discovery.showcase.amara.id } },
    create: { id: 'seed_collection_item_amara', collectionId: collection.id, targetType: 'SHOWCASE', targetId: discovery.showcase.amara.id, note: 'Strong fashion direction.' }, update: { note: 'Strong fashion direction.' },
  });

  for (const key of ['amara', 'temuulen', 'nara']) {
    await prisma.creatorShortlist.upsert({
      where: { businessId_creatorId_contextKey: { businessId: users.gobi.business.id, creatorId: users[key].creator.id, contextKey: 'general' } },
      create: { id: `seed_shortlist_${key}`, businessId: users.gobi.business.id, creatorId: users[key].creator.id, contextKey: 'general', note: 'Demo shortlist candidate' },
      update: { note: 'Demo shortlist candidate' },
    });
  }

  await prisma.proposal.upsert({
    where: { campaignId_creatorId: { campaignId: campaigns['tirtir-glow-cushion'].id, creatorId: users.nara.creator.id } },
    create: { id: 'seed_proposal_nara_tirtir', campaignId: campaigns['tirtir-glow-cushion'].id, creatorId: users.nara.creator.id, amount: 4200000, timeline: '14 days', message: 'I would create an honest wear-test series with natural-light check-ins.', deliverables: ['2 UGC videos', '3 Stories'], status: 'SUBMITTED' },
    update: { amount: 4200000, timeline: '14 days', status: 'SUBMITTED' },
  });
  await prisma.campaignInvitation.upsert({
    where: { campaignId_creatorId: { campaignId: campaigns['aero-weekend-routes'].id, creatorId: users.temuulen.creator.id } },
    create: { id: 'seed_invitation_aero_temuulen', businessId: users.aero.business.id, creatorId: users.temuulen.creator.id, campaignId: campaigns['aero-weekend-routes'].id, message: 'We would love your cinematic approach for this route.', status: 'PENDING' },
    update: { message: 'We would love your cinematic approach for this route.', status: 'PENDING', respondedAt: null },
  });
}

async function seedMessaging(users) {
  const conversation = await prisma.conversation.upsert({
    where: { directKey: `direct:${users.gobi.user.id}:${users.amara.user.id}` },
    create: { id: 'seed_conversation_gobi_amara', directKey: `direct:${users.gobi.user.id}:${users.amara.user.id}`, title: 'GOBI × Amara' },
    update: { title: 'GOBI × Amara' },
  });
  await prisma.messageRequest.upsert({
    where: { id: 'seed_message_request_gobi_amara' },
    create: { id: 'seed_message_request_gobi_amara', senderId: users.gobi.user.id, recipientId: users.amara.user.id, senderRole: 'BUSINESS', recipientRole: 'CREATOR', conversationId: conversation.id, initialMessage: 'Hi Amara, we would love to discuss our new collection.', status: 'ACCEPTED', decidedAt: daysAgo(4), createdAt: daysAgo(5) },
    update: { conversationId: conversation.id, status: 'ACCEPTED', decidedAt: daysAgo(4) },
  });
  for (const userId of [users.gobi.user.id, users.amara.user.id]) {
    await prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: conversation.id, userId } },
      create: { conversationId: conversation.id, userId, lastReadAt: daysAgo(1) }, update: { lastReadAt: daysAgo(1) },
    });
  }
  const messages = [
    ['seed_message_1', users.gobi.user.id, 'Hi Amara, we would love to discuss our new collection.', 5],
    ['seed_message_2', users.amara.user.id, 'Thank you! The visual direction sounds like a strong fit for my audience.', 4],
    ['seed_message_3', users.gobi.user.id, 'Great — I have shared the campaign brief and proposed timeline.', 1],
  ];
  for (const [id, senderId, body, ago] of messages) {
    await prisma.message.upsert({ where: { id }, create: { id, conversationId: conversation.id, senderId, body, status: 'DELIVERED', createdAt: daysAgo(ago) }, update: { body, status: 'DELIVERED' } });
  }
}

async function seedCollaborationAndFinance(users, campaigns) {
  const completedOffer = await prisma.workOffer.upsert({
    where: { id: 'seed_offer_gobi_amara' },
    create: { id: 'seed_offer_gobi_amara', businessId: users.gobi.business.id, creatorId: users.amara.creator.id, campaignId: campaigns['gobi-soft-icons'].id, title: 'Soft Icons creator partnership', contentType: 'Reels + Stories', budget: 12000000, currency: 'MNT', timeline: '21 days', message: 'AW26 styling partnership', status: 'APPROVED', respondedAt: daysAgo(35), finalTerms: { budget: 12000000, currency: 'MNT', deliverables: ['2 Reels', '4 Stories'] } },
    update: { status: 'APPROVED', budget: 12000000, respondedAt: daysAgo(35) },
  });
  const completed = await prisma.collaboration.upsert({
    where: { offerId: completedOffer.id },
    create: {
      id: 'seed_collaboration_gobi_amara', offerId: completedOffer.id, campaignId: campaigns['gobi-soft-icons'].id,
      businessId: users.gobi.business.id, creatorId: users.amara.creator.id, status: 'COMPLETED', progress: 100,
      terms: { title: 'Soft Icons AW26', budget: 12000000, currency: 'MNT', deadline: daysAgo(8).toISOString(), deliverables: ['2 Reels', '4 Stories'] },
      paymentType: 'PAID', cashAmount: 12000000, tasks: [], files: [], timeline: [], activity: [],
      creatorAgreementApprovedAt: daysAgo(34), businessAgreementApprovedAt: daysAgo(34), completedAt: daysAgo(7),
    },
    update: { status: 'COMPLETED', progress: 100, completedAt: daysAgo(7), cashAmount: 12000000 },
  });
  await prisma.contract.upsert({
    where: { collaborationId: completed.id },
    create: { id: 'seed_contract_gobi_amara', collaborationId: completed.id, status: 'ACTIVE', creatorSignedAt: daysAgo(33), businessSignedAt: daysAgo(33), activatedAt: daysAgo(33), publishBy: daysAgo(9) },
    update: { status: 'ACTIVE', creatorSignedAt: daysAgo(33), businessSignedAt: daysAgo(33), activatedAt: daysAgo(33) },
  });
  const deliverable = await prisma.deliverable.upsert({
    where: { id: 'seed_deliverable_gobi_amara' },
    create: { id: 'seed_deliverable_gobi_amara', collaborationId: completed.id, uploadedById: users.amara.user.id, title: 'Soft Icons final campaign package', note: 'Final approved assets and publishing links.', fileUrl: mediaByCreator.amara[0][3], fileType: 'image/jpeg', status: 'APPROVED', reviewedAt: daysAgo(8) },
    update: { status: 'APPROVED', reviewedAt: daysAgo(8), reviewNote: 'Approved for release.' },
  });
  await prisma.review.upsert({
    where: { collaborationId_reviewerId: { collaborationId: completed.id, reviewerId: users.gobi.user.id } },
    create: { id: 'seed_review_gobi_amara', collaborationId: completed.id, reviewerId: users.gobi.user.id, subjectId: users.amara.user.id, rating: 5, comment: 'Excellent creative direction and reliable delivery.', publishedAt: daysAgo(6) },
    update: { rating: 5, comment: 'Excellent creative direction and reliable delivery.', publishedAt: daysAgo(6) },
  });
  await prisma.publishProof.upsert({
    where: { id: 'seed_proof_gobi_amara' },
    create: { id: 'seed_proof_gobi_amara', collaborationId: completed.id, deliverableId: deliverable.id, submittedById: users.amara.user.id, postUrl: 'https://instagram.com/p/vyra-soft-icons-demo', platform: 'INSTAGRAM', status: 'VERIFIED', metrics: { views: 128400, likes: 10400, saves: 1850 }, publishedAt: daysAgo(10), verifiedAt: daysAgo(9), lastCheckedAt: daysAgo(7) },
    update: { status: 'VERIFIED', metrics: { views: 128400, likes: 10400, saves: 1850 }, verifiedAt: daysAgo(9) },
  });

  const activeOffer = await prisma.workOffer.upsert({
    where: { id: 'seed_offer_aero_temuulen' },
    create: { id: 'seed_offer_aero_temuulen', businessId: users.aero.business.id, creatorId: users.temuulen.creator.id, campaignId: campaigns['aero-city-motion'].id, title: 'City in Motion film', contentType: 'Film + Reels', budget: 8000000, currency: 'MNT', timeline: '28 days', status: 'APPROVED', respondedAt: daysAgo(12), finalTerms: { budget: 8000000, currency: 'MNT', deliverables: ['1 hero film', '2 Reels'] } },
    update: { status: 'APPROVED', budget: 8000000 },
  });
  const active = await prisma.collaboration.upsert({
    where: { offerId: activeOffer.id },
    create: {
      id: 'seed_collaboration_aero_temuulen', offerId: activeOffer.id, campaignId: campaigns['aero-city-motion'].id,
      businessId: users.aero.business.id, creatorId: users.temuulen.creator.id, status: 'IN_PROGRESS', progress: 72,
      terms: { title: 'City in Motion', budget: 8000000, currency: 'MNT', deadline: daysFromNow(14).toISOString(), deliverables: ['1 hero film', '2 Reels'] },
      paymentType: 'PAID', cashAmount: 8000000, tasks: [], files: [], timeline: [], activity: [],
      creatorAgreementApprovedAt: daysAgo(11), businessAgreementApprovedAt: daysAgo(11),
    },
    update: { status: 'IN_PROGRESS', progress: 72, cashAmount: 8000000 },
  });
  await prisma.contract.upsert({
    where: { collaborationId: active.id },
    create: { id: 'seed_contract_aero_temuulen', collaborationId: active.id, status: 'ACTIVE', creatorSignedAt: daysAgo(10), businessSignedAt: daysAgo(10), activatedAt: daysAgo(10), publishBy: daysFromNow(14) },
    update: { status: 'ACTIVE', creatorSignedAt: daysAgo(10), businessSignedAt: daysAgo(10), activatedAt: daysAgo(10) },
  });
  const tasks = [
    ['seed_task_aero_1', 'Creative treatment', 'DONE', 'HIGH', daysAgo(7)],
    ['seed_task_aero_2', 'Rough cut review', 'IN_PROGRESS', 'URGENT', daysFromNow(3)],
    ['seed_task_aero_3', 'Final export and captions', 'TODO', 'MEDIUM', daysFromNow(10)],
  ];
  for (let index = 0; index < tasks.length; index += 1) {
    const [id, title, status, priority, dueAt] = tasks[index];
    await prisma.collaborationTask.upsert({
      where: { id },
      create: { id, collaborationId: active.id, createdById: users.aero.user.id, assigneeId: users.temuulen.user.id, title, ownerRole: 'CREATOR', status, priority, sortOrder: index, dueAt, completedAt: status === 'DONE' ? daysAgo(6) : null },
      update: { title, status, priority, dueAt, completedAt: status === 'DONE' ? daysAgo(6) : null },
    });
  }

  const topUps = [
    { id: 'seed_topup_gobi', user: users.gobi.user, amount: 20000000, providerRef: 'seed-topup-gobi-ref' },
    { id: 'seed_topup_aero', user: users.aero.user, amount: 15000000, providerRef: 'seed-topup-aero-ref' },
  ];
  for (const item of topUps) {
    const topUp = await prisma.walletTopUp.upsert({
      where: { id: item.id },
      create: { id: item.id, userId: item.user.id, amount: item.amount, currency: 'MNT', status: 'COMPLETED', provider: 'mock', providerRef: item.providerRef, idempotencyKey: item.id, metadata: { seeded: true }, completedAt: daysAgo(40) },
      update: { status: 'COMPLETED', amount: item.amount, completedAt: daysAgo(40) },
    });
    await prisma.$transaction((tx) => postLedgerBatch(tx, ledgerRules.walletTopUp({ eventId: `${item.id}-event`, topUp })));
  }

  const completedPayment = await prisma.payment.upsert({
    where: { id: 'seed_payment_gobi_amara' },
    create: { id: 'seed_payment_gobi_amara', collaborationId: completed.id, type: 'FUNDING', compensationType: 'PAID', status: 'RELEASED', amount: 12000000, cashAmount: 12000000, commissionRate: 10, commissionAmount: 1200000, creatorAmount: 10800000, platformFee: 1200000, currency: 'MNT', provider: 'internal', providerRef: 'seed-payment-gobi-amara-ref', idempotencyKey: 'seed-payment-gobi-amara', metadata: { source: 'BUSINESS_WALLET', seeded: true }, fundedAt: daysAgo(32), releasedAt: daysAgo(7), processedAt: daysAgo(7) },
    update: { status: 'RELEASED', releasedAt: daysAgo(7), processedAt: daysAgo(7) },
  });
  await prisma.$transaction((tx) => postLedgerBatch(tx, ledgerRules.walletFunding({ payment: completedPayment, businessUserId: users.gobi.user.id, creatorUserId: users.amara.user.id })));
  await prisma.$transaction((tx) => postLedgerBatch(tx, ledgerRules.walletSettlement({ payment: completedPayment, creatorUserId: users.amara.user.id })));
  await prisma.platformRevenue.upsert({
    where: { paymentId: completedPayment.id },
    create: { id: 'seed_revenue_gobi_amara', paymentId: completedPayment.id, collaborationId: completed.id, source: 'PAID_COMMISSION', status: 'EARNED', amount: 1200000, currency: 'MNT', earnedAt: daysAgo(7) },
    update: { status: 'EARNED', amount: 1200000, earnedAt: daysAgo(7), refundedAt: null },
  });

  const activePayment = await prisma.payment.upsert({
    where: { id: 'seed_payment_aero_temuulen' },
    create: { id: 'seed_payment_aero_temuulen', collaborationId: active.id, type: 'FUNDING', compensationType: 'PAID', status: 'FUNDED', amount: 8000000, cashAmount: 8000000, commissionRate: 10, commissionAmount: 800000, creatorAmount: 7200000, platformFee: 800000, currency: 'MNT', provider: 'internal', providerRef: 'seed-payment-aero-temuulen-ref', idempotencyKey: 'seed-payment-aero-temuulen', metadata: { source: 'BUSINESS_WALLET', seeded: true }, fundedAt: daysAgo(9), processedAt: daysAgo(9) },
    update: { status: 'FUNDED', fundedAt: daysAgo(9), processedAt: daysAgo(9) },
  });
  await prisma.$transaction((tx) => postLedgerBatch(tx, ledgerRules.walletFunding({ payment: activePayment, businessUserId: users.aero.user.id, creatorUserId: users.temuulen.user.id })));
  await prisma.platformRevenue.upsert({
    where: { paymentId: activePayment.id },
    create: { id: 'seed_revenue_aero_temuulen', paymentId: activePayment.id, collaborationId: active.id, source: 'PAID_COMMISSION', status: 'PENDING', amount: 800000, currency: 'MNT' },
    update: { status: 'PENDING', amount: 800000, earnedAt: null, refundedAt: null },
  });

  return { completed, active };
}

async function seedNotificationsAndAnalytics(users, collaborations) {
  const notifications = [
    ['seed_notification_amara_payment', users.amara.user.id, 'PAYMENT', 'Payment released', '10,800,000 MNT is now available in your creator wallet.', `/creator/collaborations/${collaborations.completed.id}`],
    ['seed_notification_temuulen_task', users.temuulen.user.id, 'CONTRACT', 'Rough cut review is coming up', 'The City in Motion rough cut is due in three days.', `/creator/collaborations/${collaborations.active.id}`],
    ['seed_notification_gobi_message', users.gobi.user.id, 'MESSAGE', 'New creator message', 'Amara replied to your campaign conversation.', '/business/messages'],
    ['seed_notification_admin_system', users.admin.id, 'SYSTEM', 'Demo marketplace is ready', 'Creators, businesses, campaigns and finance records were seeded.', '/admin'],
    ['seed_notification_viewer_follow', users.viewer.id, 'CONTENT_PUBLISHED', 'New posts from channels you follow', 'Amara Bat and Nara Eats published new content.', '/showcase'],
  ];
  for (const [id, userId, type, title, body, href] of notifications) {
    await prisma.notification.upsert({ where: { id }, create: { id, userId, type, title, body, href, sourceEventId: id, createdAt: daysAgo(1) }, update: { title, body, href, readAt: null } });
  }

  for (let day = 6; day >= 0; day -= 1) {
    const date = daysAgo(day, 0);
    await prisma.analyticsDailyRollup.upsert({
      where: { date },
      create: { date, metrics: { users: 9, creators: 4, businesses: 3, campaigns: 6, activeCollaborations: 1, completedCollaborations: 1, funded: 20000000, released: 12000000, revenue: 1200000, seeded: true } },
      update: { metrics: { users: 9, creators: 4, businesses: 3, campaigns: 6, activeCollaborations: 1, completedCollaborations: 1, funded: 20000000, released: 12000000, revenue: 1200000, seeded: true } },
    });
  }
}

async function main() {
  console.log('Seeding Influence Hub demo marketplace...');
  const users = await seedAccounts();
  const discovery = await seedCreatorDiscovery(users);
  const campaigns = await seedBusinessesAndCampaigns(users);
  await seedSocialActions(users, discovery, campaigns);
  await seedMessaging(users);
  const collaborations = await seedCollaborationAndFinance(users, campaigns);
  await seedNotificationsAndAnalytics(users, collaborations);

  const counts = await Promise.all([
    prisma.user.count({ where: { id: { startsWith: 'seed_user_' } } }),
    prisma.creatorProfile.count({ where: { id: { startsWith: 'seed_creator_' } } }),
    prisma.businessProfile.count({ where: { id: { startsWith: 'seed_business_' } } }),
    prisma.campaign.count({ where: { id: { startsWith: 'seed_campaign_' } } }),
    prisma.contentPost.count({ where: { id: { startsWith: 'seed_content_' } } }),
    prisma.collaboration.count({ where: { id: { startsWith: 'seed_collaboration_' } } }),
  ]);
  console.log(`Seed complete: ${counts[0]} users, ${counts[1]} creators, ${counts[2]} businesses, ${counts[3]} campaigns, ${counts[4]} content posts, ${counts[5]} collaborations.`);
  console.log('Credentials: ../../seed-credentials.md');
}

main()
  .catch((error) => {
    console.error('Marketplace seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
