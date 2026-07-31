import 'dotenv/config';
import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/shared/utils/password.js';

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');
const displayName = String(process.env.ADMIN_DISPLAY_NAME || 'Influence Hub Admin').trim();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Set ADMIN_EMAIL to a valid email address.');
}

if (password.length < 8) {
  throw new Error('Set ADMIN_PASSWORD to a password with at least 8 characters.');
}

const existing = await prisma.user.findUnique({
  where: { email },
  select: { roles: true },
});
const roles = Array.from(new Set([...(existing?.roles || ['VIEWER']), 'ADMIN']));
const passwordHash = await hashPassword(password);

const admin = await prisma.user.upsert({
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
  select: {
    id: true,
    email: true,
    displayName: true,
    roles: true,
    status: true,
    emailVerifiedAt: true,
  },
});

console.log(`Admin ready: ${admin.email} (${admin.roles.join(', ')})`);
await prisma.$disconnect();
