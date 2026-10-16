import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { fieldErrors } from '@arkvolt/shared';
import { logger } from './logger';

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, HttpError);
  }
}

export const badRequest = (message: string, details?: Record<string, string[]>) =>
  new HttpError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Sign in to continue') => new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have access to this resource') =>
  new HttpError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Not found') => new HttpError(404, 'NOT_FOUND', message);
export const conflict = (message: string, details?: Record<string, string[]>) =>
  new HttpError(409, 'CONFLICT', message, details);
export const tooMany = (message = 'Too many attempts. Try again shortly.') =>
  new HttpError(429, 'RATE_LIMITED', message);

/* ------------------------------------------------------------------ *
 * Wrappers
 * ------------------------------------------------------------------ */

/** Wraps an async handler so a rejected promise reaches the error middleware. */
export const asyncHandler =
  <T extends RequestHandler>(fn: T): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };

/** Throwing is the control flow — every route body reads top to bottom. */
export const ok = <T>(res: Response, data: T, status = 200): void => {
  res.status(status).json({ data });
};

export const list = <T>(
  res: Response,
  data: T[],
  meta: { page: number; perPage: number; total: number },
): void => {
  res.status(200).json({
    data,
    meta: { ...meta, totalPages: Math.max(1, Math.ceil(meta.total / meta.perPage)) },
  });
};

/* ------------------------------------------------------------------ *
 * Error middleware — the last line of defence
 * ------------------------------------------------------------------ */

interface PrismaKnownError {
  code: string;
  meta?: { target?: string[] | string };
}

const isPrismaError = (e: unknown): e is PrismaKnownError =>
  typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'string';

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // Express identifies error middleware by arity — `next` must be declared.
  _next: NextFunction,
): void => {
  const requestId = String(res.locals.requestId ?? '');

  if (err instanceof ZodError) {
    res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields.', details: fieldErrors(err) },
    });
    return;
  }

  if (err instanceof HttpError) {
    if (err.status >= 500) logger.error(err.message, { requestId, path: req.path });
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  if (isPrismaError(err)) {
    const target = Array.isArray(err.meta?.target) ? err.meta?.target.join(', ') : err.meta?.target;
    if (err.code === 'P2002') {
      res.status(409).json({
        error: {
          code: 'DUPLICATE',
          message: `That ${target ?? 'value'} is already taken.`,
          details: target ? { [String(target).split(', ')[0] ?? '_']: ['Already in use'] } : undefined,
        },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'That record no longer exists.' } });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({
        error: {
          code: 'IN_USE',
          message: 'This record is referenced elsewhere and cannot be removed.',
        },
      });
      return;
    }
  }

  logger.error('Unhandled error', {
    requestId,
    path: req.path,
    method: req.method,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Something went wrong on our end. Please try again.' },
  });
};

/* ------------------------------------------------------------------ *
 * Request context
 * ------------------------------------------------------------------ */

export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
  const id =
    (req.headers['x-request-id'] as string | undefined) ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  res.locals.requestId = id;
  res.setHeader('x-request-id', id);
  next();
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `No route matches ${req.method} ${req.path}` },
  });
};
