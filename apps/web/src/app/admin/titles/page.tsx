'use client';

import { useCallback, useEffect, useState } from 'react';
import { BOOKING_STATUSES, GENRES, LABELS, formatDateTime, type Genre, type TitleEntry, type TitleRequest, type BookingStatus } from '@arkvolt/shared';
import { adminApi } from '@/lib/api';
import {
  PageHeader, Panel, TableShell, Th, Td, StatusChip, EmptyState, LoadingRows,
  ErrorBanner, FilterBar, FilterChips, Pagination,
} from '@/components/admin/ui';

type Tab = 'requests' | 'index';

/**
 * Title setup requests and the reference index.
 *
 * Requests are the commercial signal: repeated requests for the same title
 * tell the owner which hardware and which setups are worth preparing for.
 * The index itself is editable inline because a franchise name changes the
 * moment a new entry in a series ships.
 */
export default function AdminTitlesPage() {
  const [tab, setTab] = useState<Tab>('requests');

  const [requests, setRequests] = useState<TitleRequest[]>([]);
  const [reqMeta, setReqMeta] = useState({ page: 1, perPage: 25, total: 0, totalPages: 1 });
  const [reqQuery, setReqQuery] = useState('');
  const [reqStatus, setReqStatus] = useState('');

  const [index, setIndex] = useState<TitleEntry[]>([]);
  const [idxMeta, setIdxMeta] = useState({ page: 1, perPage: 40, total: 0, totalPages: 1 });
  const [idxQuery, setIdxQuery] = useState('');
  const [idxGenre, setIdxGenre] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi.titleRequests({ q: reqQuery, status: reqStatus, page });
        setRequests(res.items);
        setReqMeta(res.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load requests');
      } finally {
        setLoading(false);
      }
    },
    [reqQuery, reqStatus],
  );

  const loadIndex = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi.titles({ q: idxQuery, genre: idxGenre, page, perPage: 40 });
        setIndex(res.items);
        setIdxMeta(res.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load the index');
      } finally {
        setLoading(false);
      }
    },
    [idxQuery, idxGenre],
  );

  useEffect(() => {
    if (tab === 'requests') void loadRequests(1);
    else void loadIndex(1);
  }, [tab, loadRequests, loadIndex]);

  const setRequestStatus = async (request: TitleRequest, status: BookingStatus) => {
    try {
      await adminApi.updateTitleRequest(request.id, { status });
      await loadRequests(reqMeta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const editTitle = async (entry: TitleEntry & { id: string }, patch: Record<string, unknown>) => {
    try {
      await adminApi.updateTitle(entry.id, patch);
      await loadIndex(idxMeta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <>
      <PageHeader
        title="Title index"
        subtitle="Setup requests from customers, and the reference index they search. Names only — the customer supplies their own licence in every case."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab('requests')}
              className={tab === 'requests' ? 'chip-volt' : 'chip hover:border-steel hover:text-chalk'}
            >
              Requests ({reqMeta.total})
            </button>
            <button
              type="button"
              onClick={() => setTab('index')}
              className={tab === 'index' ? 'chip-volt' : 'chip hover:border-steel hover:text-chalk'}
            >
              Index ({idxMeta.total})
            </button>
          </div>
        }
      />

      <div className="px-5 py-8 lg:px-8">
        {tab === 'requests' ? (
          <Panel title="Setup requests">
            <FilterBar query={reqQuery} onQuery={setReqQuery} placeholder="Search title, customer or reference…">
              <FilterChips
                value={reqStatus}
                onChange={setReqStatus}
                options={[{ value: '', label: 'All' }, ...BOOKING_STATUSES.map((s) => ({ value: s as string, label: LABELS.BookingStatus[s] }))]}
              />
            </FilterBar>

            {error && <ErrorBanner message={error} onRetry={() => void loadRequests(reqMeta.page)} />}
            {loading && <LoadingRows />}

            {!loading && !error && requests.length === 0 && (
              <EmptyState
                title="No setup requests"
                body="When a customer asks us to prepare their machine for a title, the request lands here with their hardware specification."
              />
            )}

            {!loading && requests.length > 0 && (
              <>
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Reference</Th>
                      <Th>Title</Th>
                      <Th>Customer</Th>
                      <Th>Their machine</Th>
                      <Th>Status</Th>
                      <Th>Received</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} className="transition-colors hover:bg-plate/60">
                        <Td className="font-mono text-[11px] text-volt">{r.ref}</Td>
                        <Td className="text-chalk">{r.titleName}</Td>
                        <Td>
                          <span className="text-chalk">{r.customerName}</span>
                          <span className="mt-0.5 block font-mono text-[10px] text-slate">{r.phone}</span>
                        </Td>
                        <Td className="max-w-[260px] text-[12px]">
                          <span className="line-clamp-2">{r.deviceSpecs ?? <span className="text-slate">Not provided</span>}</span>
                        </Td>
                        <Td>
                          <select
                            value={r.status}
                            onChange={(e) => void setRequestStatus(r, e.target.value as BookingStatus)}
                            className="border border-hairline bg-plate px-2 py-1 font-mono text-[10px] uppercase tracking-technical text-chalk"
                          >
                            {BOOKING_STATUSES.map((s) => (
                              <option key={s} value={s}>{LABELS.BookingStatus[s]}</option>
                            ))}
                          </select>
                        </Td>
                        <Td className="font-mono text-[11px] text-slate">{formatDateTime(r.createdAt)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
                <Pagination page={reqMeta.page} totalPages={reqMeta.totalPages} total={reqMeta.total} onPage={(p) => void loadRequests(p)} />
              </>
            )}
          </Panel>
        ) : (
          <Panel title="Reference index">
            <FilterBar query={idxQuery} onQuery={setIdxQuery} placeholder="Search title or franchise…">
              <FilterChips
                value={idxGenre}
                onChange={setIdxGenre}
                options={[{ value: '', label: 'All genres' }, ...GENRES.map((g) => ({ value: g as string, label: LABELS.Genre[g] }))]}
              />
            </FilterBar>

            {error && <ErrorBanner message={error} onRetry={() => void loadIndex(idxMeta.page)} />}
            {loading && <LoadingRows rows={8} />}

            {!loading && index.length > 0 && (
              <>
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Title</Th>
                      <Th>Franchise</Th>
                      <Th>Genre</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {index.map((entry) => (
                      <tr key={entry.id} className="transition-colors hover:bg-plate/60">
                        <Td className="text-chalk">
                          <input
                            defaultValue={entry.name}
                            onBlur={(e) => {
                              if (e.target.value.trim() && e.target.value !== entry.name) {
                                void editTitle(entry as TitleEntry & { id: string }, { name: e.target.value.trim() });
                              }
                            }}
                            className="w-full border border-transparent bg-transparent px-2 py-1 text-[13px] text-chalk transition-colors hover:border-hairline focus:border-volt focus:outline-none"
                          />
                        </Td>
                        <Td>
                          <input
                            defaultValue={entry.series ?? ''}
                            placeholder="—"
                            onBlur={(e) => {
                              const value = e.target.value.trim() || null;
                              if (value !== entry.series) {
                                void editTitle(entry as TitleEntry & { id: string }, { series: value });
                              }
                            }}
                            className="w-full border border-transparent bg-transparent px-2 py-1 text-[12.5px] text-steel transition-colors hover:border-hairline focus:border-volt focus:outline-none"
                          />
                        </Td>
                        <Td>
                          <select
                            value={entry.genre}
                            onChange={(e) => void editTitle(entry as TitleEntry & { id: string }, { genre: e.target.value as Genre })}
                            className="border border-transparent bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-technical text-steel transition-colors hover:border-hairline focus:border-volt focus:outline-none"
                          >
                            {GENRES.map((g) => (
                              <option key={g} value={g} className="bg-plate text-chalk">
                                {LABELS.Genre[g]}
                              </option>
                            ))}
                          </select>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
                <Pagination page={idxMeta.page} totalPages={idxMeta.totalPages} total={idxMeta.total} onPage={(p) => void loadIndex(p)} />
              </>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
