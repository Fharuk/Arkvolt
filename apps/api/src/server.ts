import { createApp } from './app';
import { env } from './config';
import { prisma } from './db';
import { logger } from './lib/logger';

const app = createApp();

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info('ARKVOLT API listening', { port: env.PORT, env: env.NODE_ENV });
});

/* ------------------------------------------------------------------ *
 * Graceful shutdown
 *
 * Render sends SIGTERM during a deploy. Finish in-flight requests, close the
 * database pool, then exit — rather than dropping connections mid-checkout.
 * ------------------------------------------------------------------ */

let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Shutting down', { signal });

  const forceExit = setTimeout(() => {
    logger.error('Forced exit after 10s — some connections did not close');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Closed cleanly');
    process.exit(0);
  });
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — exiting', { message: err.message, stack: err.stack });
  process.exit(1);
});
