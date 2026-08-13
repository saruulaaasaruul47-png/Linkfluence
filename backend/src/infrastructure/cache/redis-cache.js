import { createClient } from 'redis';
import { env } from '../../config/env.js';

let client;
let connecting;

async function connection() {
  if (!env.redisUrl) return null;
  if (client?.isReady) return client;
  if (!connecting) {
    client = createClient({ url: env.redisUrl });
    client.on('error', (error) => console.error(JSON.stringify({ level: 'error', event: 'redis_cache_error', message: error.message })));
    connecting = client.connect().then(() => client).catch((error) => {
      connecting = null;
      throw error;
    });
  }
  return connecting;
}

export const redisCache = {
  async get(key) {
    try {
      const active = await connection();
      const value = active ? await active.get(key) : null;
      return value == null ? undefined : JSON.parse(value);
    } catch { return undefined; }
  },
  async set(key, value, ttlSeconds = 30) {
    try { await (await connection())?.set(key, JSON.stringify(value), { EX: ttlSeconds }); } catch { /* database remains source of truth */ }
  },
  async del(...keys) {
    if (!keys.length) return;
    try { await (await connection())?.del(keys); } catch { /* cache failure is non-fatal */ }
  },
  async close() {
    if (client?.isOpen) await client.quit();
    client = undefined;
    connecting = undefined;
  },
};
