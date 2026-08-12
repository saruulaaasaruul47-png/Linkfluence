import { prisma } from '../config/database.js';
import { createEventing } from '../infrastructure/eventing/index.js';

await prisma.$connect();
const eventing = createEventing();
await eventing.start();
console.log(JSON.stringify({ level: 'info', event: 'outbox_worker_started' }));

async function shutdown() {
  await eventing.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
