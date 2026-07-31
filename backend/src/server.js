import { app } from './app.js';
import { prisma } from './config/database.js';
import { env } from './config/env.js';

await prisma.$connect();

const server = app.listen(env.port, () => {
  console.log(`Influence Hub API listening on http://localhost:${env.port}`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Closing the API safely.`);

  server.close(async (error) => {
    await prisma.$disconnect();
    if (error) {
      console.error({ code: 'SERVER_SHUTDOWN_ERROR', message: error.message });
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
