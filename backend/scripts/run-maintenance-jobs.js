import { prisma } from '../src/config/database.js';
import { maintenanceJobs } from '../src/modules/operations/maintenance-jobs.js';

try {
  const result = await maintenanceJobs.all();
  console.log(JSON.stringify({ level: 'info', event: 'maintenance_jobs_completed', result }));
  if (Object.values(result).some((item) => item.status === 'FAILED')) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

