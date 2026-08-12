import { prisma } from '../src/config/database.js';
import { maintenanceJobs } from '../src/modules/operations/maintenance-jobs.js';

try {
  const result = await maintenanceJobs.socialSync();
  console.log(JSON.stringify({ level: 'info', event: 'social_sync_completed', ...result }));
} catch (error) {
  console.error(JSON.stringify({
    level: 'error',
    event: 'social_sync_failed',
    message: error.message,
  }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
