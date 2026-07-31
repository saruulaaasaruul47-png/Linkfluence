import 'dotenv/config';
import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/shared/utils/password.js';

const creatorCredentials = {
  email: String(process.env.DEMO_CREATOR_EMAIL || '').trim().toLowerCase(),
  password: String(process.env.DEMO_CREATOR_PASSWORD || ''),
};
const businessCredentials = {
  email: String(process.env.DEMO_BUSINESS_EMAIL || '').trim().toLowerCase(),
  password: String(process.env.DEMO_BUSINESS_PASSWORD || ''),
};

function validateCredentials(label, credentials) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
    throw new Error(`Set DEMO_${label}_EMAIL to a valid email address.`);
  }
  if (credentials.password.length < 8) {
    throw new Error(`Set DEMO_${label}_PASSWORD to a password with at least 8 characters.`);
  }
}

validateCredentials('CREATOR', creatorCredentials);
validateCredentials('BUSINESS', businessCredentials);

async function upsertUser({ email, password, displayName, role }) {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { roles: true },
  });
  const roles = Array.from(new Set([...(existing?.roles || ['VIEWER']), role]));
  const passwordHash = await hashPassword(password);

  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      displayName,
      passwordHash,
      roles,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    update: {
      displayName,
      passwordHash,
      roles,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      deletedAt: null,
      sessionVersion: { increment: 1 },
    },
  });
}

const creator = await upsertUser({
  ...creatorCredentials,
  displayName: 'Demo Creator',
  role: 'CREATOR',
});
await prisma.creatorProfile.upsert({
  where: { userId: creator.id },
  create: {
    userId: creator.id,
    channelName: 'Demo Creator',
    slug: 'influencehub_creator',
    bio: 'Lifestyle and short-form content creator based in Ulaanbaatar.',
    location: 'Ulaanbaatar, Mongolia',
    categories: ['Lifestyle'],
    skills: ['Short-form video', 'UGC'],
    languages: ['Mongolian', 'English'],
    contentFormat: 'Short-form video',
    availability: 'Available now',
    availableForWork: true,
  },
  update: {
    channelName: 'Demo Creator',
    slug: 'influencehub_creator',
    bio: 'Lifestyle and short-form content creator based in Ulaanbaatar.',
    location: 'Ulaanbaatar, Mongolia',
    categories: ['Lifestyle'],
    skills: ['Short-form video', 'UGC'],
    languages: ['Mongolian', 'English'],
    contentFormat: 'Short-form video',
    availability: 'Available now',
    availableForWork: true,
  },
});

const business = await upsertUser({
  ...businessCredentials,
  displayName: 'Demo Business',
  role: 'BUSINESS',
});
await prisma.businessProfile.upsert({
  where: { userId: business.id },
  create: {
    userId: business.id,
    companyName: 'Demo Business',
    slug: 'influencehub_business',
    description: 'A demo brand account for testing creator collaborations.',
    industry: 'Agency',
    location: 'Ulaanbaatar, Mongolia',
    website: 'https://example.com',
    companySize: '11–50',
    contactEmail: businessCredentials.email,
  },
  update: {
    companyName: 'Demo Business',
    slug: 'influencehub_business',
    description: 'A demo brand account for testing creator collaborations.',
    industry: 'Agency',
    location: 'Ulaanbaatar, Mongolia',
    website: 'https://example.com',
    companySize: '11–50',
    contactEmail: businessCredentials.email,
  },
});

console.log(`Creator ready: ${creator.email}`);
console.log(`Business ready: ${business.email}`);
await prisma.$disconnect();
