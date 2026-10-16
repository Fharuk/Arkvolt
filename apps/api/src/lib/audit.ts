import type { Request } from 'express';
import type { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { logger } from './logger';

export interface AuditActor {
  id: string | null;
  email: string;
  name: string;
}

export interface AuditInput {
  actor: AuditActor;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  summary: string;
  diff?: Record<string, unknown> | null;
  req?: Request;
}

/**
 * Writes one immutable row. Never throws: a failure to record an audit line
 * must not roll back the business operation that succeeded. Failures are
 * logged loudly instead.
 */
export const recordAudit = async (input: AuditInput): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.actor.id,
        actorEmail: input.actor.email,
        actorName: input.actor.name,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary,
        diff: (input.diff ?? null) as Prisma.InputJsonValue,
        ip: clientIp(input.req),
        userAgent: input.req?.get('user-agent')?.slice(0, 400) ?? null,
      },
    });
  } catch (err) {
    logger.error('Audit write failed', {
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

export const clientIp = (req?: Request): string | null => {
  if (!req) return null;
  // Render terminates TLS at its proxy; trust the first hop it provides.
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) return (forwarded.split(',')[0] ?? '').trim() || null;
  return req.ip ?? null;
};

/* ------------------------------------------------------------------ *
 * Diffing
 * ------------------------------------------------------------------ */

const REDACTED = new Set(['passwordhash', 'password', 'token', 'secret', 'apisecret']);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

/**
 * Produces a compact, readable field-level diff: `{ priceKobo: { from, to } }`.
 * Arrays and nested objects are compared by value; only changed keys survive.
 * Sensitive fields are stripped rather than recorded.
 */
export const diffObjects = (
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Record<string, { from: unknown; to: unknown }> | null => {
  if (!before || !after) return null;
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const lower = key.toLowerCase();
    if (REDACTED.has(lower)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes[key] = { from: '(redacted)', to: '(changed)' };
      }
      continue;
    }
    const a = before[key];
    const b = after[key];
    if (isPlainObject(a) && isPlainObject(b)) {
      const nested = diffObjects(a, b);
      if (nested) changes[key] = { from: before[key], to: after[key] };
      continue;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) changes[key] = { from: a ?? null, to: b ?? null };
  }

  return Object.keys(changes).length > 0 ? changes : null;
};

/** Human sentence for the activity feed: "Updated product · price ₦45,000 → ₦52,000". */
export const summariseDiff = (diff: Record<string, unknown> | null, limit = 3): string => {
  if (!diff) return 'No field changes';
  const keys = Object.keys(diff).slice(0, limit);
  const parts = keys.map((k) => {
    const entry = diff[k] as { from?: unknown; to?: unknown } | undefined;
    const from = entry?.from;
    const to = entry?.to;
    if (from === undefined || to === undefined) return k;
    return `${humanKey(k)}: ${short(from)} → ${short(to)}`;
  });
  const extra = Object.keys(diff).length > limit ? ` (+${Object.keys(diff).length - limit} more)` : '';
  return parts.join(', ') + extra;
};

const humanKey = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/Kobo$/, ' (kobo)')
    .toLowerCase();

const short = (value: unknown): string => {
  if (value === null) return '—';
  if (typeof value === 'string') return value.length > 40 ? `${value.slice(0, 39)}…` : value;
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return '{…}';
  return String(value);
};
