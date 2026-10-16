'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { AUDIT_ACTIONS, LABELS, formatDateTime } from '@arkvolt/shared';
import { adminApi, type AuditEntryDto } from '@/lib/api';
import {
  PageHeader, Panel, TableShell, Th, Td, StatusChip, EmptyState, LoadingRows,
  ErrorBanner, FilterBar, FilterChips, Pagination,
} from '@/components/admin/ui';

/**
 * Activity log.
 *
 * Read-only by design: there is no endpoint that edits or deletes an audit
 * row, and the API refuses to expose one. Expanding a row shows the field-level
 * diff, so "what actually changed" is answerable months later rather than
 * being a matter of memory.
 */
export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditEntryDto[]>([]);
  const [entities, setEntities] = useState<{ entity: string; count: number }[]>([]);
  const [meta, setMeta] = useState({ page: 1, perPage: 30, total: 0, totalPages: 1 });
  const [query, setQuery] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi.audit({ q: query, entity, action, page, perPage: 30 });
        setRows(res.items);
        setMeta(res.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load the activity log');
      } finally {
        setLoading(false);
      }
    },
    [query, entity, action],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  useEffect(() => {
    adminApi.auditEntities().then(setEntities).catch(() => undefined);
  }, []);

  return (
    <>
      <PageHeader
        title="Activity log"
        subtitle="Every change made in this dashboard, with who made it, from which address, and what the previous value was. Append-only — nothing here can be edited or removed."
        actions={
          <a href="/api/admin/audit/export?limit=5000" className="btn-ghost btn-sm">
            Export CSV
          </a>
        }
      />

      <div className="px-5 py-8 lg:px-8">
        <Panel>
          <FilterBar query={query} onQuery={setQuery} placeholder="Search summary, actor or record id…">
            <FilterChips
              value={entity}
              onChange={setEntity}
              options={[{ value: '', label: 'All records' }, ...entities.slice(0, 6).map((e) => ({ value: e.entity, label: `${e.entity} (${e.count})` }))]}
            />
          </FilterBar>

          <div className="flex flex-wrap gap-2 border-b border-hairline px-5 py-4">
            <button
              type="button"
              onClick={() => setAction('')}
              className={action === '' ? 'chip-volt' : 'chip hover:border-steel hover:text-chalk'}
            >
              Any action
            </button>
            {AUDIT_ACTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAction(a)}
                className={action === a ? 'chip-volt' : 'chip hover:border-steel hover:text-chalk'}
              >
                {LABELS.AuditAction[a]}
              </button>
            ))}
          </div>

          {error && <ErrorBanner message={error} onRetry={() => void load(meta.page)} />}
          {loading && <LoadingRows rows={10} />}

          {!loading && !error && rows.length === 0 && (
            <EmptyState title="No activity recorded" body="Actions taken in this dashboard are logged here from the first sign-in onwards." />
          )}

          {!loading && rows.length > 0 && (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Actor</Th>
                    <Th>Action</Th>
                    <Th>Record</Th>
                    <Th>Detail</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => (
                    <Fragment key={entry.id}>
                      <tr
                        onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                        className="cursor-pointer transition-colors hover:bg-plate/60"
                      >
                        <Td className="whitespace-nowrap font-mono text-[11px] text-slate">
                          {formatDateTime(entry.createdAt)}
                        </Td>
                        <Td>
                          <span className="text-chalk">{entry.actorName}</span>
                          <span className="mt-0.5 block font-mono text-[10px] text-slate">{entry.actorEmail}</span>
                        </Td>
                        <Td>
                          <StatusChip
                            status={entry.action === 'DELETE' || entry.action === 'LOGIN_FAILED' ? 'CANCELLED' : entry.action === 'CREATE' || entry.action === 'LOGIN' ? 'ACTIVE' : 'NEW'}
                            label={LABELS.AuditAction[entry.action as keyof typeof LABELS.AuditAction] ?? entry.action}
                          />
                        </Td>
                        <Td className="text-[12px]">
                          <span className="text-steel">{entry.entity}</span>
                          {entry.entityId && (
                            <span className="mt-0.5 block max-w-[160px] truncate font-mono text-[10px] text-slate">
                              {entry.entityId}
                            </span>
                          )}
                        </Td>
                        <Td className="text-[12.5px] text-chalk">{entry.summary}</Td>
                      </tr>

                      {expanded === entry.id && (
                        <tr className="bg-plate/40">
                          <td colSpan={5} className="border-b border-hairline px-5 py-5">
                            <div className="grid gap-6 md:grid-cols-2">
                              <div>
                                <p className="font-mono text-[10px] uppercase tracking-technical text-volt">
                                  Technical detail
                                </p>
                                <dl className="mt-3 space-y-2">
                                  {[
                                    ['Record ID', entry.entityId ?? '—'],
                                    ['IP address', entry.ip ?? '—'],
                                    ['User agent', entry.userAgent ?? '—'],
                                    ['Timestamp', entry.createdAt],
                                  ].map(([k, v]) => (
                                    <div key={k} className="flex gap-4">
                                      <dt className="label-tech w-24 shrink-0 pt-0.5">{k}</dt>
                                      <dd className="break-all font-mono text-[11px] text-steel">{v}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>

                              <div>
                                <p className="font-mono text-[10px] uppercase tracking-technical text-volt">
                                  Fields changed
                                </p>
                                {entry.diff && Object.keys(entry.diff).length > 0 ? (
                                  <ul className="mt-3 space-y-1.5">
                                    {Object.entries(entry.diff).map(([field, change]) => {
                                      const c = change as { from?: unknown; to?: unknown };
                                      return (
                                        <li key={field} className="flex flex-wrap items-baseline gap-2 font-mono text-[11px]">
                                          <span className="text-slate">{field}</span>
                                          <span className="text-crimson line-through">
                                            {c.from === null || c.from === undefined ? '—' : String(c.from)}
                                          </span>
                                          <span className="text-slate">→</span>
                                          <span className="text-jade">
                                            {c.to === null || c.to === undefined ? '—' : String(c.to)}
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <p className="mt-3 text-[12px] text-slate">
                                    No field-level changes were recorded for this action.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </TableShell>
              <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={(p) => void load(p)} />
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
