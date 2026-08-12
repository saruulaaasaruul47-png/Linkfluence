import { randomUUID } from 'node:crypto';
import { jobRepository } from './job.repository.js';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function runOperationalJob({ name, handler, maxAttempts = 3, retryBaseMs = 250, leaseMs = 15 * 60_000, ownerId = randomUUID() }) {
  const acquired = await jobRepository.acquire(name, ownerId, leaseMs);
  if (!acquired) {
    await jobRepository.skippedRun(name, ownerId);
    console.log(JSON.stringify({ level: 'info', event: 'job_skipped', job: name, ownerId, reason: 'lease_held' }));
    return { status: 'SKIPPED', attempts: 0, metrics: { reason: 'lease_held' } };
  }
  const run = await jobRepository.startRun(name, ownerId);
  let lastError;
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const metrics = await handler({ attempt, ownerId, renew: () => jobRepository.renew(name, ownerId, leaseMs) });
        await jobRepository.finishRun(run.id, 'SUCCEEDED', attempt, metrics || {});
        console.log(JSON.stringify({ level: 'info', event: 'job_succeeded', job: name, runId: run.id, attempt, metrics: metrics || {} }));
        return { status: 'SUCCEEDED', attempts: attempt, metrics: metrics || {} };
      } catch (error) {
        lastError = error;
        console.error(JSON.stringify({ level: 'error', event: 'job_attempt_failed', job: name, runId: run.id, attempt, message: String(error?.message || error) }));
        if (attempt < maxAttempts) await wait(retryBaseMs * (2 ** (attempt - 1)));
      }
    }
    const message = String(lastError?.message || lastError || 'Job failed.').slice(0, 2000);
    await jobRepository.finishRun(run.id, 'FAILED', maxAttempts, { deadLettered: true }, message);
    console.error(JSON.stringify({ level: 'error', event: 'job_dead_lettered', job: name, runId: run.id, attempts: maxAttempts, message }));
    throw lastError;
  } finally {
    await jobRepository.release(name, ownerId);
  }
}

