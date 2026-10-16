'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatNaira } from '@arkvolt/shared';
import { ApiRequestError } from '@/lib/api';

/* ================================================================== *
 * Shared dashboard primitives.
 *
 * These exist so the nine admin pages share one look and one set of
 * behaviours — sorting, empty states, error surfaces, status chips — instead
 * of each solving it slightly differently.
 * ================================================================== */

export const PageHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) => (
  <header className="border-b border-hairline px-5 py-8 lg:px-8 lg:py-10">
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <h1 className="font-display text-d-sm font-semibold uppercase tracking-display text-chalk">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-steel">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  </header>
);

export const Panel = ({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`border border-hairline bg-gunmetal ${className}`}>
    {title && (
      <header className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-technical text-volt">{title}</h2>
        {action}
      </header>
    )}
    {children}
  </section>
);

/* ------------------------------------------------------------------ *
 * Status chips — colour is semantic here, never decorative
 * ------------------------------------------------------------------ */

const STATUS_TONE: Record<string, string> = {
  NEW: 'border-volt/50 text-volt',
  CONFIRMED: 'border-volt/30 text-volt/90',
  PREPARING: 'border-amber/40 text-amber',
  READY: 'border-jade/40 text-jade',
  COMPLETED: 'border-jade/40 text-jade',
  CANCELLED: 'border-crimson/40 text-crimson',
  ARCHIVED: 'border-hairline-strong text-slate',
  DRAFT: 'border-hairline-strong text-slate',
  ACTIVE: 'border-jade/40 text-jade',
  PAID: 'border-jade/40 text-jade',
  UNPAID: 'border-amber/40 text-amber',
  AWAITING_CONFIRMATION: 'border-amber/40 text-amber',
  REFUNDED: 'border-hairline-strong text-slate',
  CONTACTED: 'border-volt/30 text-volt/90',
  SCHEDULED: 'border-volt/40 text-volt',
  IN_PROGRESS: 'border-amber/40 text-amber',
  AWAITING_PARTS: 'border-amber/40 text-amber',
  READ: 'border-hairline-strong text-steel',
  REPLIED: 'border-jade/40 text-jade',
  CLOSED: 'border-hairline-strong text-slate',
  SPAM: 'border-crimson/30 text-crimson/80',
  STANDARD: 'border-hairline-strong text-steel',
  PRIORITY: 'border-amber/40 text-amber',
  EMERGENCY: 'border-crimson/50 text-crimson',
};

export const StatusChip = ({ status, label }: { status: string; label?: string }) => (
  <span
    className={`inline-flex items-center border px-2.5 py-1 font-mono text-[9px] uppercase tracking-technical ${
      STATUS_TONE[status] ?? 'border-hairline-strong text-steel'
    }`}
  >
    {label ?? status.replace(/_/g, ' ').toLowerCase()}
  </span>
);

/* ------------------------------------------------------------------ *
 * Table
 * ------------------------------------------------------------------ */

export const TableShell = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[720px] border-collapse text-left">{children}</table>
  </div>
);

export const Th = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <th
    scope="col"
    className={`border-b border-hairline-strong px-5 py-3.5 font-mono text-[9px] font-normal uppercase tracking-technical text-slate ${className}`}
  >
    {children}
  </th>
);

export const Td = ({
  children,
  className = '',
  numeric = false,
}: {
  children: ReactNode;
  className?: string;
  numeric?: boolean;
}) => (
  <td className={`border-b border-hairline px-5 py-4 text-[13px] text-steel ${numeric ? 'tabular-nums' : ''} ${className}`}>
    {children}
  </td>
);

export const EmptyState = ({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
    <svg viewBox="0 0 40 40" className="h-8 w-8 text-hairline-strong" fill="none" aria-hidden>
      <path d="M6 10h28v20H6z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 17h28" stroke="currentColor" strokeWidth="1.5" />
    </svg>
    <div>
      <p className="font-display text-[20px] uppercase tracking-display text-steel">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-slate">{body}</p>
    </div>
    {action}
  </div>
);

export const LoadingRows = ({ rows = 6 }: { rows?: number }) => (
  <div className="space-y-px p-5">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton h-11" />
    ))}
  </div>
);

export const ErrorBanner = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="m-5 border border-crimson/40 bg-crimson/[0.05] p-4">
    <p className="text-[13px] text-chalk">{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className="btn-ghost btn-sm mt-3">
        Try again
      </button>
    )}
  </div>
);

/* ------------------------------------------------------------------ *
 * Search + filter bar
 * ------------------------------------------------------------------ */

export const FilterBar = ({
  query,
  onQuery,
  placeholder = 'Search…',
  children,
}: {
  query: string;
  onQuery: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) => {
  const [local, setLocal] = useState(query);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  /* Debounced so typing does not fire a request per keystroke. */
  useEffect(() => {
    if (local === query) return;
    timer.current = setTimeout(() => onQuery(local), 320);
    return () => clearTimeout(timer.current);
  }, [local, onQuery, query]);

  useEffect(() => setLocal(query), [query]);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4">
      <div className="relative min-w-[220px] flex-1">
        <svg viewBox="0 0 16 16" className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={placeholder}
          className="field py-2.5 pl-10 text-[13px]"
          type="search"
        />
      </div>
      {children}
    </div>
  );
};

export const FilterChips = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={`chip transition-colors ${value === o.value ? 'chip-volt' : 'hover:border-steel hover:text-chalk'}`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/* ------------------------------------------------------------------ *
 * Pagination
 * ------------------------------------------------------------------ */

export const Pagination = ({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline px-5 py-4">
    <p className="font-mono text-[10px] tabular-nums uppercase tracking-technical text-slate">
      {total} {total === 1 ? 'record' : 'records'} · page {page} of {totalPages}
    </p>
    <div className="flex gap-2">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className="btn-ghost btn-sm">
        ← Prev
      </button>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="btn-ghost btn-sm">
        Next →
      </button>
    </div>
  </div>
);

/* ------------------------------------------------------------------ *
 * Stat tile
 * ------------------------------------------------------------------ */

export const Stat = ({
  label,
  value,
  meta,
  tone = 'default',
  href,
}: {
  label: string;
  value: string | number;
  meta?: string;
  tone?: 'default' | 'volt' | 'amber' | 'crimson' | 'jade';
  href?: string;
}) => {
  const toneClass = {
    default: 'text-chalk',
    volt: 'text-volt',
    amber: 'text-amber',
    crimson: 'text-crimson',
    jade: 'text-jade',
  }[tone];

  const inner = (
    <>
      <p className="font-mono text-[9px] uppercase tracking-technical text-slate">{label}</p>
      <p className={`mt-3 font-display text-[38px] font-semibold leading-none tabular-nums tracking-display ${toneClass}`}>
        {value}
      </p>
      {meta && <p className="mt-2.5 text-[11.5px] leading-snug text-slate">{meta}</p>}
    </>
  );

  return href ? (
    <Link href={href} className="block bg-void p-5 transition-colors hover:bg-plate md:p-6">
      {inner}
    </Link>
  ) : (
    <div className="bg-void p-5 md:p-6">{inner}</div>
  );
};

export const Money = ({ kobo, className = '' }: { kobo: number; className?: string }) => (
  <span className={`font-mono tabular-nums ${className}`}>{formatNaira(kobo)}</span>
);

/* ------------------------------------------------------------------ *
 * Field wrapper for the editors
 * ------------------------------------------------------------------ */

export const Field = ({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}) => (
  <div>
    <label className="field-label">
      {label}
      {required && <span className="ml-1 text-volt">*</span>}
    </label>
    {children}
    {error ? (
      <p className="field-error">{error}</p>
    ) : hint ? (
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate">{hint}</p>
    ) : null}
  </div>
);

/** Turns an ApiRequestError into a field-keyed error map for the editors. */
export const toFieldErrors = (err: unknown): Record<string, string> => {
  if (err instanceof ApiRequestError) {
    const out: Record<string, string> = {};
    for (const [key, messages] of Object.entries(err.details)) out[key] = messages[0] ?? 'Invalid';
    return out;
  }
  return {};
};
