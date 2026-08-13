import { Queue, Worker } from 'bullmq';

function connectionFromUrl(redisUrl) {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: parsed.pathname?.length > 1 ? Number(parsed.pathname.slice(1)) : 0,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
}

function matches(pattern, topic) {
  return pattern === '*'
    || pattern === topic
    || (pattern.endsWith('.*') && topic.startsWith(pattern.slice(0, -1)));
}

export class BullMqBroker {
  constructor({ url, maxAttempts = 5, baseDelayMs = 1000 }) {
    this.connection = connectionFromUrl(url);
    this.maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
    this.subscriptions = [];
  }

  subscribe(topic, handler) {
    this.subscriptions.push({ topic, handler });
  }

  async connect() {
    this.queue = new Queue('influence-events', { connection: this.connection });
    this.deadLetterQueue = new Queue('influence-events-dead', { connection: this.connection });
    this.worker = new Worker('influence-events', async (job) => {
      const handlers = this.subscriptions.filter((entry) => matches(entry.topic, job.name));
      for (const subscription of handlers) {
        await subscription.handler({
          ...job.data,
          topic: job.name,
          deliveryAttempt: job.attemptsMade + 1,
        });
      }
    }, { connection: this.connection, concurrency: 8 });
    this.worker.on('failed', (job, error) => {
      if (!job || job.attemptsMade < this.maxAttempts) return;
      void this.deadLetterQueue.add(job.name, {
        ...job.data,
        failedAt: new Date().toISOString(),
        error: String(error?.message || error).slice(0, 500),
      }, { removeOnComplete: 500, removeOnFail: 1000 });
    });
    await Promise.all([
      this.queue.waitUntilReady(),
      this.deadLetterQueue.waitUntilReady(),
      this.worker.waitUntilReady(),
    ]);
  }

  async publish(topic, event) {
    if (!this.queue) throw new Error('BullMQ broker is not connected.');
    await this.queue.add(topic, event, {
      jobId: event.id,
      attempts: this.maxAttempts,
      backoff: { type: 'exponential', delay: this.baseDelayMs },
      removeOnComplete: 1000,
      removeOnFail: false,
    });
  }

  async close() {
    await this.worker?.close();
    await this.queue?.close();
    await this.deadLetterQueue?.close();
  }
}
