import { outboxRepository } from './outbox.repository.js';

export class OutboxWorker {
  constructor({ broker, batchSize = 25, maxAttempts = 5, baseDelayMs = 1000, lockTimeoutMs = 300_000 }) {
    this.broker = broker;
    this.batchSize = batchSize;
    this.maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
    this.lockTimeoutMs = lockTimeoutMs;
    this.running = false;
    this.stopping = false;
    this.currentRun = null;
  }

  async runOnce() {
    const events = await outboxRepository.claim(this.batchSize, this.lockTimeoutMs);
    for (const event of events) {
      try {
        await this.broker.publish(event.topic, {
          id: event.id,
          aggregateId: event.aggregateId,
          payload: event.payload,
          occurredAt: event.createdAt,
        });
        await outboxRepository.processed(event.id);
      } catch (error) {
        const attempts = event.attempts + 1;
        const deadLetteredAt = attempts >= this.maxAttempts ? new Date() : null;
        const nextAttemptAt = new Date(Date.now() + this.baseDelayMs * (2 ** (attempts - 1)));
        await outboxRepository.failed(event.id, attempts, error, nextAttemptAt, deadLetteredAt);
      }
    }
    return events.length;
  }

  start(intervalMs = 1000) {
    if (this.timer) return;
    this.stopping = false;
    const tick = () => {
      if (this.running || this.stopping) return this.currentRun;
      this.running = true;
      this.currentRun = (async () => {
        try {
          await this.runOnce();
        } catch (error) {
          if (!this.stopping) {
            console.error(JSON.stringify({ level: 'error', event: 'outbox_worker_failed', message: error.message }));
          }
        } finally {
          this.running = false;
          this.currentRun = null;
        }
      })();
      return this.currentRun;
    };
    this.timer = setInterval(tick, intervalMs);
    this.timer.unref?.();
    void tick();
  }

  async stop() {
    this.stopping = true;
    clearInterval(this.timer);
    this.timer = null;
    await this.currentRun;
  }
}
