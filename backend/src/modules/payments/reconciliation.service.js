import { env } from '../../config/env.js';
import { reconciliationRepository } from './reconciliation.repository.js';

const cents = (value) => Math.round(Number(value || 0) * 100);

export const reconciliationService = {
  async run({ periodStart, periodEnd, actorId = null }) {
    const provider = env.paymentProvider;
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const existing = await reconciliationRepository.find(provider, start, end);
    if (existing?.completedAt) return existing;
    return reconciliationRepository.transaction(async (tx) => {
      const run = existing || await tx.reconciliationRun.create({ data: { provider, periodStart: start, periodEnd: end, status: 'RUNNING' } });
      try {
        const [events, entries] = await Promise.all([
          tx.paymentProviderEvent.findMany({ where: { provider, eventType: 'funding.succeeded', processedAt: { gte: start, lt: end } }, select: { id: true, payload: true } }),
          tx.ledgerEntry.findMany({ where: { type: 'ESCROW_FUNDED', occurredAt: { gte: start, lt: end } }, select: { id: true, amount: true } }),
        ]);
        const providerTotalCents = events.reduce((sum, event) => sum + cents(event.payload?.data?.amount), 0);
        const ledgerTotalCents = entries.reduce((sum, entry) => sum + cents(entry.amount), 0);
        const discrepancyCents = providerTotalCents - ledgerTotalCents;
        const status = discrepancyCents === 0 && events.length === entries.length ? 'MATCHED' : 'MISMATCHED';
        const result = await tx.reconciliationRun.update({ where: { id: run.id }, data: {
          status,
          providerTotal: providerTotalCents / 100,
          ledgerTotal: ledgerTotalCents / 100,
          discrepancy: discrepancyCents / 100,
          checkedRecords: Math.max(events.length, entries.length),
          mismatchCount: status === 'MATCHED' ? 0 : Math.abs(events.length - entries.length) || 1,
          details: { providerEventIds: events.map((event) => event.id), ledgerEntryIds: entries.map((entry) => entry.id) },
          completedAt: new Date(),
        } });
        if (actorId) await tx.adminAction.create({ data: { actorId, action: 'PAYMENT_RECONCILIATION_RUN', targetType: 'RECONCILIATION', targetId: result.id, reason: 'Manual finance reconciliation run.', after: { status, discrepancy: discrepancyCents / 100 } } });
        return result;
      } catch (error) {
        await tx.reconciliationRun.update({ where: { id: run.id }, data: { status: 'FAILED', details: { message: error.message }, completedAt: new Date() } });
        throw error;
      }
    });
  },
};
