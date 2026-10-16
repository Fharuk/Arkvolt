import { PrismaClient } from '@prisma/client';
import { env, isProd } from './config';

/**
 * A single client for the process lifetime. In development `tsx watch`
 * restarts the module graph constantly, so we cache on globalThis to avoid
 * exhausting the connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['warn', 'error'] : ['warn', 'error'],
    datasources: { db: { url: env.DATABASE_URL } },
  });

if (!isProd) globalForPrisma.prisma = prisma;

export type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
