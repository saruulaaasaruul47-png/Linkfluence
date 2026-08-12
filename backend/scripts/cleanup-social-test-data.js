import { prisma } from '../src/config/database.js';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Refusing to clean social test data unless NODE_ENV=test.');
}

const users = await prisma.user.findMany({
  where: { email: { startsWith: 'social-content-' } },
  select: { id: true },
});
const ids = users.map((item) => item.id);
if (ids.length) {
  await prisma.trustCase.deleteMany({ where: { reporterId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
await prisma.$disconnect();
console.log(`Cleaned ${ids.length} social-content test users.`);
