import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { badRequest } from '../lib/http';
import { fieldErrors } from '@arkvolt/shared';

type Source = 'body' | 'query' | 'params';

/**
 * Replaces `req[source]` with the parsed result, so downstream handlers work
 * with typed, coerced, trimmed values — never raw strings off the wire.
 */
export const validate =
  (schema: ZodSchema, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(badRequest('Please check the highlighted fields.', fieldErrors(result.error)));
      return;
    }
    if (source === 'query') {
      // Express 4 exposes query as a getter in newer versions; assign defensively.
      Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
    } else {
      req[source] = result.data as never;
    }
    next();
  };
