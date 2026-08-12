import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { env } from '../../config/env.js';
import { authService } from '../../modules/auth/auth.service.js';
import { messagingRepository } from '../../modules/messaging/messaging.repository.js';

let io;
let redisClients = [];

export const realtimeGateway = {
  conversation(conversationId, event, payload) {
    io?.to(`conversation:${conversationId}`).emit(event, payload);
  },
  user(userId, event, payload) {
    io?.to(`user:${userId}`).emit(event, payload);
  },
};

export async function setupRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
    transports: ['websocket', 'polling'],
  });
  if (env.redisUrl) {
    const publisher = createClient({ url: env.redisUrl });
    const subscriber = publisher.duplicate();
    publisher.on('error', logRedisError);
    subscriber.on('error', logRedisError);
    await Promise.all([publisher.connect(), subscriber.connect()]);
    io.adapter(createAdapter(publisher, subscriber));
    redisClients = [publisher, subscriber];
  }
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || /^Bearer\s+(.+)$/i.exec(socket.handshake.headers.authorization || '')?.[1];
      if (!token) return next(new Error('UNAUTHORIZED'));
      socket.data.user = await authService.authenticateAccessToken(token);
      next();
    } catch (_error) {
      next(new Error('UNAUTHORIZED'));
    }
  });
  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    void socket.join(`user:${userId}`);
    socket.on('conversation:join', async ({ conversationId } = {}, acknowledge = () => {}) => {
      try {
        const member = await messagingRepository.findMembership(conversationId, userId);
        if (!member) return acknowledge({ ok: false, code: 'CONVERSATION_NOT_FOUND' });
        await socket.join(`conversation:${conversationId}`);
        acknowledge({ ok: true, conversationId });
      } catch (_error) { acknowledge({ ok: false, code: 'JOIN_FAILED' }); }
    });
    socket.on('conversation:leave', async ({ conversationId } = {}) => {
      await socket.leave(`conversation:${conversationId}`);
    });
    socket.on('message:read', async ({ conversationId } = {}, acknowledge = () => {}) => {
      try {
        const { messagingService } = await import('../../modules/messaging/messaging.service.js');
        await messagingService.read(userId, conversationId);
        acknowledge({ ok: true });
      } catch (_error) { acknowledge({ ok: false, code: 'READ_FAILED' }); }
    });
  });
  return io;
}

export async function closeRealtime() {
  await new Promise((resolve) => io?.close(resolve) || resolve());
  await Promise.all(redisClients.map((client) => client.quit().catch(() => {})));
  redisClients = [];
  io = null;
}

function logRedisError(error) {
  console.error(JSON.stringify({ level: 'error', event: 'redis_adapter_error', message: error.message }));
}
