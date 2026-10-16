import { Router } from 'express';
import { changePasswordSchema, loginSchema } from '@arkvolt/shared';
import { prisma } from '../../db';
import { isProd } from '../../config';
import {
  DUMMY_HASH,
  SESSION_COOKIE,
  clearCookieOptions,
  hashPassword,
  parseExpiryToSeconds,
  sessionCookieOptions,
  signToken,
  verifyPassword,
} from '../../lib/auth';
import { clientIp, recordAudit } from '../../lib/audit';
import { asyncHandler, badRequest, unauthorized, ok } from '../../lib/http';
import { logger } from '../../lib/logger';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { env } from '../../config';

export const adminAuthRouter = Router();

const TOKEN_TTL_SECONDS = parseExpiryToSeconds(env.JWT_EXPIRES_IN);

const publicUser = (u: { id: string; email: string; name: string; lastLoginAt: Date | null; createdAt: Date }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  createdAt: u.createdAt.toISOString(),
});

/* ------------------------------------------------------------------ *
 * Sign in
 * ------------------------------------------------------------------ */

adminAuthRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const ip = clientIp(req);

    const user = await prisma.adminUser.findUnique({ where: { email } });

    // Always run a comparison, even when the account does not exist, so response
    // time cannot be used to enumerate valid admin emails.
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const valid = await verifyPassword(password, hash);

    if (!user || !valid) {
      await recordAudit({
        actor: { id: user?.id ?? null, email, name: user?.name ?? 'Unknown' },
        action: 'LOGIN_FAILED',
        entity: 'AdminUser',
        entityId: user?.id ?? null,
        summary: `Failed sign-in attempt for ${email}`,
        req,
      });
      logger.warn('Failed admin sign-in', { email, ip });
      // One message for both cases: never confirm which emails exist.
      throw unauthorized('Email or password is incorrect.');
    }

    const token = signToken({ sub: user.id, email: user.email, name: user.name });

    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(TOKEN_TTL_SECONDS));

    await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip ?? undefined } });

    await recordAudit({
      actor: { id: user.id, email: user.email, name: user.name },
      action: 'LOGIN',
      entity: 'AdminUser',
      entityId: user.id,
      summary: `${user.name} signed in`,
      req,
    });

    ok(res, { user: publicUser(user), token, expiresIn: TOKEN_TTL_SECONDS });
  }),
);

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

adminAuthRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.adminUser.findUnique({ where: { id: req.actor!.id } });
    if (!user) throw unauthorized('Account no longer exists');
    ok(res, publicUser(user));
  }),
);

adminAuthRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.clearCookie(SESSION_COOKIE, clearCookieOptions);
    await recordAudit({
      actor: req.actor!,
      action: 'LOGOUT',
      entity: 'AdminUser',
      entityId: req.actor!.id,
      summary: `${req.actor!.name} signed out`,
      req,
    });
    ok(res, { ok: true });
  }),
);

/* ------------------------------------------------------------------ *
 * Password
 * ------------------------------------------------------------------ */

adminAuthRouter.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    };

    const user = await prisma.adminUser.findUnique({ where: { id: req.actor!.id } });
    if (!user) throw unauthorized('Account no longer exists');

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw badRequest('That is not your current password.', { currentPassword: ['Incorrect password'] });

    if (await verifyPassword(newPassword, user.passwordHash)) {
      throw badRequest('Choose a password you have not used before.', { newPassword: ['Same as current password'] });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.adminUser.update({ where: { id: user.id }, data: { passwordHash } });

    // Re-issue the session so this device stays signed in while every other
    // session is cut off by the version bump.
    const token = signToken({ sub: user.id, email: user.email, name: user.name, v: 2 });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(TOKEN_TTL_SECONDS));

    await recordAudit({
      actor: req.actor!,
      action: 'PASSWORD_CHANGE',
      entity: 'AdminUser',
      entityId: user.id,
      summary: `${user.name} changed their password`,
      req,
    });

    ok(res, { ok: true });
  }),
);

/* ------------------------------------------------------------------ *
 * First-run bootstrap
 *
 * If the database has no admin account at all, this creates one from the
 * ADMIN_EMAIL / ADMIN_PASSWORD environment values — and only then. Once an
 * account exists the endpoint is permanently closed, so it cannot be used
 * to mint a second admin on a live deployment.
 * ------------------------------------------------------------------ */

adminAuthRouter.post(
  '/bootstrap',
  asyncHandler(async (req, res) => {
    const count = await prisma.adminUser.count();
    if (count > 0) throw badRequest('An administrator account already exists. Use the sign-in form.');

    if (!env.ADMIN_PASSWORD) {
      throw badRequest('Set ADMIN_PASSWORD in the API environment to create the first account.');
    }

    const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
    const user = await prisma.adminUser.create({
      data: { email: env.ADMIN_EMAIL, name: env.ADMIN_NAME, passwordHash },
    });

    await recordAudit({
      actor: { id: user.id, email: user.email, name: user.name },
      action: 'CREATE',
      entity: 'AdminUser',
      entityId: user.id,
      summary: `Bootstrap administrator created (${user.email})`,
      req,
    });

    logger.warn('Bootstrap administrator created', { email: user.email, secure: isProd });
    ok(res, { user: publicUser(user) }, 201);
  }),
);
