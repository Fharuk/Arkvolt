import express, { type RequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { corsOrigins, isProd } from './config';
import { errorHandler, notFoundHandler, requestContext } from './lib/http';
import { logger } from './lib/logger';
import { requireAuth, requireSameOrigin } from './middleware/auth';
import { catalogRouter } from './routes/catalog';
import { ordersRouter } from './routes/orders';
import { frontDeskRouter } from './routes/frontdesk';
import { adminAuthRouter } from './routes/admin/auth';
import { adminCatalogRouter } from './routes/admin/products';
import { adminOpsRouter } from './routes/admin/ops';
import { adminSystemRouter } from './routes/admin/system';
import { adminMediaRouter } from './routes/admin/media';
import { getSettings } from './lib/settings';

export const createApp = () => {
  const app = express();

  // Render puts a proxy in front of the app; without this, rate limiting and
  // IP logging would see every request as coming from the same address.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestContext);

  app.use(
    helmet({
      contentSecurityPolicy: false, // This is a JSON API; the frontend sets its own CSP.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(compression());

  app.use(
    cors({
      // Reflect the caller's origin in development so any local port works;
      // in production only the explicit allow-list from the environment.
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (!isProd && corsOrigins.length === 0) return callback(null, true);
        if (corsOrigins.includes(origin)) return callback(null, true);
        logger.warn('Blocked CORS origin', { origin });
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 86_400,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  // Local media fallback (development only, when Cloudinary is unconfigured).
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), { maxAge: '1h' }));

  /* ---------------------------------------------------------------- *
   * Health
   * ---------------------------------------------------------------- */

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'arkvolt-api', uptime: Math.round(process.uptime()) });
  });

  app.get('/ready', async (_req, res) => {
    const { prisma } = await import('./db');
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ready', database: 'connected' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });

  /* ---------------------------------------------------------------- *
   * Public API
   * ---------------------------------------------------------------- */

  const publicLimiter = rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
  });

  // A coarse ceiling for the whole API surface; the tighter limits that matter
  // (checkout, bookings, inquiries) are applied per-route where submission happens.
  app.use('/api', publicLimiter as unknown as RequestHandler);

  const api = express.Router();

  api.get(
    '/settings',
    async (req, res, next) => {
      try {
        const settings = await getSettings();
        res.json({ data: settings });
      } catch (err) {
        next(err);
      }
    },
  );

  api.use('/catalog', catalogRouter);
  api.use('/orders', ordersRouter);
  api.use('/', frontDeskRouter);

  /* ---------------------------------------------------------------- *
   * Admin API — every route behind auth, origin check and its own rate limit
   * ---------------------------------------------------------------- */

  const adminGuard = express.Router();

  const adminLimiter = rateLimit({
    windowMs: 60_000,
    limit: 240,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Slow down — too many dashboard requests.' } },
  });

  adminGuard.use(adminLimiter);
  adminGuard.use('/auth', adminAuthRouter);
  adminGuard.use(requireSameOrigin as unknown as RequestHandler);
  adminGuard.use(requireAuth as unknown as RequestHandler);

  adminGuard.use('/', adminCatalogRouter);
  adminGuard.use('/', adminOpsRouter);
  adminGuard.use('/', adminSystemRouter);
  adminGuard.use('/media', adminMediaRouter);

  api.use('/admin', adminGuard);

  app.use('/api', api);

  /* ---------------------------------------------------------------- *
   * Docs shortcut
   * ---------------------------------------------------------------- */

  app.get('/', (_req, res) => {
    res.json({
      service: 'ARKVOLT API',
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        ready: 'GET /ready',
        settings: 'GET /api/settings',
        catalog: 'GET /api/catalog/{products,products/:slug,products/:slug/related,categories,services,titles,titles/series}',
        orders: 'POST /api/orders · GET /api/orders/:ref · POST /api/orders/validate-cart',
        bookings: 'POST /api/bookings · GET /api/bookings/:ref',
        inquiries: 'POST /api/inquiries',
        titles: 'POST /api/title-requests',
        admin: 'POST /api/admin/auth/login · GET /api/admin/stats · /api/admin/{products,services,categories,orders,bookings,inquiries,title-requests,titles,settings,audit,media}',
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
