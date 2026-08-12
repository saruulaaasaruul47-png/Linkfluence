import { lifecycleService } from '../collaborations/lifecycle.service.js';
import { socialService } from '../social-sync/social.service.js';
import { jobRepository } from './job.repository.js';
import { runOperationalJob } from './job-runner.js';

const DAY_MS = 86_400_000;

const previousUtcDay = (now = new Date()) => {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { date: new Date(end.getTime() - DAY_MS), start: new Date(end.getTime() - DAY_MS), end };
};

export const maintenanceJobs = {
  cleanup(options = {}) {
    return runOperationalJob({ name: 'cleanup-expired-records', ...options, handler: async () => {
      const now = new Date();
      return jobRepository.cleanupExpired(now, new Date(now.getTime() - 30 * DAY_MS));
    } });
  },
  socialSync(options = {}) {
    return runOperationalJob({ name: 'social-sync-24h', leaseMs: 30 * 60_000, ...options, handler: () => socialService.syncStale({ limit: 100 }) });
  },
  collaborationLifecycle(options = {}) {
    return runOperationalJob({ name: 'collaboration-lifecycle', leaseMs: 30 * 60_000, ...options, handler: () => lifecycleService.run() });
  },
  analyticsDaily(options = {}) {
    return runOperationalJob({ name: 'analytics-daily-rollup', ...options, handler: () => {
      const { date, start, end } = previousUtcDay();
      return jobRepository.aggregateAnalytics(date, start, end);
    } });
  },
  async all() {
    const results = {};
    for (const [name, job] of Object.entries({ cleanup: this.cleanup, socialSync: this.socialSync, collaborationLifecycle: this.collaborationLifecycle, analyticsDaily: this.analyticsDaily })) {
      try { results[name] = await job(); }
      catch (error) { results[name] = { status: 'FAILED', message: String(error?.message || error) }; }
    }
    return results;
  },
};
