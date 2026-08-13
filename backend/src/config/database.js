import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const runtimeDatabaseUrl = (() => {
  try {
    const url = new URL(env.databaseUrl);
    // Render external PostgreSQL endpoints require TLS. Prisma CLI negotiates it,
    // while node-postgres needs the requirement expressed in its connection URL.
    if (url.hostname.endsWith('.render.com') && !url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'verify-full');
    }
    return url.toString();
  } catch {
    return env.databaseUrl;
  }
})();

const adapter = new PrismaPg({ connectionString: runtimeDatabaseUrl });

export const prisma = new PrismaClient({ adapter });
