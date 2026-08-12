import amqp from 'amqplib';
import { createClient } from 'redis';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { getSetting } from './platform-config.service.js';

const withTimeout = (promise, milliseconds, name) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} readiness timed out.`)), milliseconds)),
]);

export const healthRepository = {
  async postgres() {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'up' };
  },
  async redis() {
    if (!env.redisUrl) return { status: 'not_configured', required: false };
    const client = createClient({ url: env.redisUrl, socket: { connectTimeout: 1200, reconnectStrategy: false } });
    try {
      await withTimeout(client.connect(), 1500, 'Redis');
      await withTimeout(client.ping(), 1500, 'Redis');
      return { status: 'up', required: true };
    } finally {
      if (client.isOpen) await client.quit().catch(() => client.disconnect());
    }
  },
  async broker() {
    if (!env.rabbitMqUrl) return { status: 'not_configured', required: false };
    let connection;
    try {
      connection = await withTimeout(amqp.connect(env.rabbitMqUrl), 1500, 'RabbitMQ');
      return { status: 'up', required: true };
    } finally {
      await connection?.close().catch(() => {});
    }
  },
  async outbox() {
    const threshold = Number(await getSetting('outboxBacklogThreshold'));
    const backlog = await prisma.outboxEvent.count({ where: { processedAt: null, deadLetteredAt: null } });
    return { status: backlog <= threshold ? 'up' : 'overloaded', backlog, threshold, required: true };
  },
};

