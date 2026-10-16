import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env, isProd } from '../config';
import { unauthorized } from './http';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  name: string;
  /** Token version — bump to invalidate every existing session at once. */
  v: number;
}

const ISSUER = 'arkvolt.api';
const AUDIENCE = 'arkvolt.admin';

/** 12 rounds: ~250ms on Render's shared CPU. Slow enough to make offline attacks futile. */
const BCRYPT_ROUNDS = 12;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, BCRYPT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

export const signToken = (payload: Omit<AuthTokenPayload, 'v'> & { v?: number }): string =>
  jwt.sign({ ...payload, v: payload.v ?? 1 }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: 'HS256',
  } as jwt.SignOptions);

export const verifyToken = (token: string): AuthTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    }) as jwt.JwtPayload & AuthTokenPayload;

    if (!decoded.sub || !decoded.email) throw unauthorized('Session is invalid');
    return { sub: decoded.sub, email: decoded.email, name: decoded.name ?? '', v: decoded.v ?? 1 };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw unauthorized('Your session has expired. Sign in again.');
    if (err instanceof jwt.JsonWebTokenError) throw unauthorized('Session is invalid. Sign in again.');
    throw err;
  }
};

/* ------------------------------------------------------------------ *
 * Cookie transport
 * ------------------------------------------------------------------ */

export const SESSION_COOKIE = 'arkvolt_session';

/**
 * The dashboard is a browser client, so the session rides in an httpOnly
 * cookie: JavaScript cannot read it, which closes off the entire class of
 * token-exfiltration bugs. SameSite=Lax + Secure in production also blocks
 * cross-site POSTs from riding an existing session.
 */
export const sessionCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: maxAgeSeconds * 1000,
  ...(isProd ? { domain: undefined } : {}),
});

export const clearCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
};

export const parseExpiryToSeconds = (value: string): number => {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return 43_200;
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const factor = { s: 1, m: 60, h: 3_600, d: 86_400 }[unit] ?? 1;
  return amount * factor;
};

/** Constant-time-ish dummy compare so timing cannot reveal whether an email exists. */
export const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.6m4bDxLQd3WGZu5HkAtM5HXoH8rJ4Iq';
