import { env } from '../../config/env.js';
import { registerNotificationConsumers } from '../../modules/notifications/notification.consumer.js';
import { MemoryBroker } from './memory-broker.js';
import { OutboxWorker } from './outbox.worker.js';
import { RabbitMqBroker } from './rabbitmq-broker.js';
import { BullMqBroker } from './bullmq-broker.js';

export function createEventing() {
  const broker = env.rabbitMqUrl
    ? new RabbitMqBroker({ url: env.rabbitMqUrl, maxAttempts: env.queueMaxAttempts, baseDelayMs: env.queueRetryBaseMs })
    : env.redisUrl
      ? new BullMqBroker({ url: env.redisUrl, maxAttempts: env.queueMaxAttempts, baseDelayMs: env.queueRetryBaseMs })
      : new MemoryBroker({ maxAttempts: env.queueMaxAttempts });
  registerNotificationConsumers(broker);
  const worker = new OutboxWorker({ broker, maxAttempts: env.queueMaxAttempts, baseDelayMs: env.queueRetryBaseMs });
  return {
    broker,
    worker,
    async start() {
      await broker.connect();
      worker.start(env.outboxPollMs);
    },
    async close() {
      await worker.stop();
      await broker.close();
    },
  };
}
