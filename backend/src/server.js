import { createServer } from 'node:http';
import { app } from './app.js';
import { prisma } from './config/database.js';
import { env } from './config/env.js';
import { createEventing } from './infrastructure/eventing/index.js';
import { closeRealtime, setupRealtime } from './infrastructure/realtime/realtime.gateway.js';
import { redisCache } from './infrastructure/cache/redis-cache.js';
import { closeErrorReporter, initializeErrorReporter } from './infrastructure/monitoring/error-reporter.js';

const server = createServer(app);
const eventing = createEventing();
let databaseConnected = false;
let realtimeStarted = false;
let eventingStarted = false;
let shuttingDown = false;
initializeErrorReporter();

// On Windows, watch mode can release the previous child process a little later than the file change.
const DEVELOPMENT_PORT_RETRY_INTERVAL_MS = 250;
const DEVELOPMENT_PORT_RETRY_TIMEOUT_MS = 10_000;

const delay = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

function listenOnce() {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    // Omitting a hostname binds to the unspecified address (0.0.0.0/::), which
    // lets Render's proxy reach the process on its injected PORT.
    server.listen(env.port);
  });
}

async function listenWithDevelopmentRetry() {
  const attempts = env.nodeEnv === 'development'
    ? Math.floor(DEVELOPMENT_PORT_RETRY_TIMEOUT_MS / DEVELOPMENT_PORT_RETRY_INTERVAL_MS) + 1
    : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await listenOnce();
      return;
    } catch (error) {
      if (error?.code !== 'EADDRINUSE' || attempt === attempts) throw error;
      if (attempt === 1) {
        console.warn(JSON.stringify({
          level: 'warn',
          event: 'port_retry',
          port: env.port,
          retryTimeoutMs: DEVELOPMENT_PORT_RETRY_TIMEOUT_MS,
          message: 'Port is temporarily busy; waiting for the previous watch process to release it.',
        }));
      }
      await delay(DEVELOPMENT_PORT_RETRY_INTERVAL_MS);
    }
  }
}

async function closeHttpServer() {
  if (!server.listening) return;
  server.closeIdleConnections?.();
  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(forceTimer);
      if (error) reject(error);
      else resolve();
    };
    const forceTimer = setTimeout(() => {
      server.closeAllConnections?.();
      finish();
    }, 3_000);
    forceTimer.unref?.();
    server.close(finish);
  });
}

async function closeRuntime() {
  const failures = [];
  if (eventingStarted) {
    try { await eventing.close(); } catch (error) { failures.push(error); }
    eventingStarted = false;
  }
  if (realtimeStarted) {
    try { await closeRealtime(); } catch (error) { failures.push(error); }
    realtimeStarted = false;
  }
  try { await closeHttpServer(); } catch (error) { failures.push(error); }
  try { await redisCache.close(); } catch (error) { failures.push(error); }
  try { await closeErrorReporter(); } catch (error) { failures.push(error); }
  if (databaseConnected) {
    try { await prisma.$disconnect(); } catch (error) { failures.push(error); }
    databaseConnected = false;
  }
  if (failures.length) throw new AggregateError(failures, 'One or more backend resources could not close cleanly.');
}

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Closing the API safely.`);
  try {
    await closeRuntime();
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'server_shutdown_error',
      message: error.message,
    }));
    exitCode = 1;
  }
  process.exit(exitCode);
}

process.once('SIGINT', () => { void shutdown('SIGINT'); });
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });

try {
  await prisma.$connect();
  databaseConnected = true;
  await listenWithDevelopmentRetry();
  realtimeStarted = true;
  await setupRealtime(server);
  eventingStarted = true;
  await eventing.start();
  const publicUrl = env.nodeEnv === 'production'
    ? env.apiPublicUrl.replace(/\/$/, '')
    : `http://localhost:${env.port}`;
  console.log(`Influence Hub API listening on ${publicUrl}`);
} catch (error) {
  if (error?.code === 'EADDRINUSE') {
    console.error(
      `Backend could not start because port ${env.port} is already in use after waiting `
      + `${DEVELOPMENT_PORT_RETRY_TIMEOUT_MS / 1_000} seconds. `
      + 'Only one backend dev process should run on this port.',
    );
  } else {
    console.error(JSON.stringify({
      level: 'error',
      event: 'server_startup_error',
      code: error?.code || 'STARTUP_FAILED',
      message: error?.message || 'Unknown startup error',
    }));
  }
  await shutdown('STARTUP_FAILURE', 1);
}
