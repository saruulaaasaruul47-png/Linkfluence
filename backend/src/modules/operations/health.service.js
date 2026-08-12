import { healthRepository } from './health.repository.js';

const dependency = async (name, check) => {
  try {
    return [name, await check()];
  } catch (error) {
    return [name, { status: 'down', required: true, error: String(error?.message || error).slice(0, 200) }];
  }
};

export const healthService = {
  live() {
    return { status: 'up', uptimeSeconds: Math.floor(process.uptime()), timestamp: new Date().toISOString() };
  },
  async ready() {
    const entries = await Promise.all([
      dependency('postgres', () => healthRepository.postgres()),
      dependency('redis', () => healthRepository.redis()),
      dependency('broker', () => healthRepository.broker()),
      dependency('outbox', () => healthRepository.outbox()),
    ]);
    const dependencies = Object.fromEntries(entries);
    const ready = Object.values(dependencies).every((item) => item.required === false || item.status === 'up');
    return { ready, status: ready ? 'up' : 'down', dependencies, timestamp: new Date().toISOString() };
  },
};

