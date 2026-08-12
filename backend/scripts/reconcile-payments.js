import 'dotenv/config';
import { prisma } from '../src/config/database.js';
import { reconciliationService } from '../src/modules/payments/reconciliation.service.js';

const end = new Date();
end.setUTCHours(0, 0, 0, 0);
const start = new Date(end);
start.setUTCDate(start.getUTCDate() - 1);

try {
  const result = await reconciliationService.run({ periodStart: start, periodEnd: end });
  console.log(JSON.stringify({ level: 'info', event: 'payment_reconciliation_completed', id: result.id, status: result.status, discrepancy: Number(result.discrepancy || 0) }));
  if (result.status === 'MISMATCHED') process.exitCode = 2;
} finally {
  await prisma.$disconnect();
}
