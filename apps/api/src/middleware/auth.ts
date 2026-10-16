import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db';
import { isProd } from '../config';
import { SESSION_COOKIE, verifyToken } from '../lib/auth';
import { forbidden, unauthorized } from '../lib/http';
import type { AuditActor } from '../lib/audit';

/**
 * A signed-in request always has a real user id, unlike `AuditActor` which
 * permits null for failed sign-in attempts. Narrowing it here means every
 * authenticated handler can use `req.actor.id` without a null check.
 */
export interface RequestActor extends AuditActor {
  id: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: RequestActor;
    }
  }
}

const bearer = (req: Request): string | null => {
  const header = req.get('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
};

/**
 * Accepts either the httpOnly session cookie (browser dashboard) or a bearer
 * token (scripts, curl, CI). The user row is re-read on every request so a
 * deleted or disabled account loses access immediately rather than at token
 * expiry.
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = bearer(req) ?? (req.cookies?.[SESSION_COOKIE] as string | undefined);
    if (!token) throw unauthorized();

    const payload = verifyToken(token);
    const user = await prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });

    if (!user) throw forbidden('This account is no longer active.');
    req.actor = { id: user.id, email: user.email, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * CSRF defence for cookie-authenticated writes: the browser will send the
 * cookie cross-site, but it cannot set a custom header on a simple form POST.
 * Bearer-token callers skip this because they never send ambient credentials.
 */
export const requireSameOrigin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (bearer(req)) return next();

  const origin = req.get('origin');
  if (!origin) return next(); // non-browser client with no cookie auth path

  const allowed = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const host = req.get('host');
  const sameHost = host ? origin.endsWith(host) : false;
  if (sameHost || allowed.includes(origin)) return next();

  // The dashboard dev server runs on a different port from the API, and the
  // Next rewrites proxy means the API sees a mismatched Host. Local only.
  if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return next();

  next(forbidden('Request blocked: origin not allowed.'));
};
