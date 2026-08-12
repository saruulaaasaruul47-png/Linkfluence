import 'dotenv/config';
import { prisma } from '../src/config/database.js';
import { maintenanceJobs } from '../src/modules/operations/maintenance-jobs.js';

try {
  const result = await maintenanceJobs.collaborationLifecycle();
  console.log(JSON.stringify({ level: 'info', event: 'collaboration_lifecycle_processed', ...result }));
} finally {
  await prisma.$disconnect();
}
