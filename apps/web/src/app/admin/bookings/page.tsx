'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BOOKING_STATUSES, LABELS, formatDateTime, formatNaira,
  type RepairBooking, type BookingStatus,
} from '@arkvolt/shared';
import { adminApi } from '@/lib/api';
import {
  PageHeader, Panel, TableShell, Th, Td, StatusChip, EmptyState, LoadingRows,
  ErrorBanner, FilterBar, FilterChips, Pagination, Field,
} from '@/components/admin/ui';

/** The repair queue. Sorted so the most urgent, least-progressed jobs float up. */
export default function AdminBookingsPage() {
  const [rows, setRows] = useState<RepairBooking[]>([]);
  const [meta, setMeta] = useState({ page: 1, perPage: 25, total: 0, totalPages: 1 });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ booking: RepairBooking; whatsappUrl: string } | null>(null);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi.bookings({ q: query, status, page });
        setRows(res.items);
        setMeta(res.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load bookings');
      } finally {
        setLoading(false);
      }
    },
    [query, status],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const update = async (id: string, patch: Record<string, unknown>) => {
    try {
      await adminApi.updateBooking(id, patch);
      setSelected((s) => (s ? { ...s, booking: { ...s.booking, ...patch } as RepairBooking } : s));
      await load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <>
      <PageHeader
        title="Repair queue"
        subtitle="Bookings taken through the website. Assign a technician, set the estimate and move the job through the workshop."
      />

      <div className="px-5 py-8 lg:px-8">
        <Panel>
          <FilterBar query={query} onQuery={setQuery} placeholder="Search by reference, name, phone or model…">
            <FilterChips
              value={status}
              onChange={setStatus}
              options={[{ value: '', label: 'All' }, ...BOOKING_STATUSES.map((s) => ({ value: s as string, label: LABELS.BookingStatus[s] }))]}
            />
          </FilterBar>

          {error && <ErrorBanner message={error} onRetry={() => void load(meta.page)} />}
          {loading && <LoadingRows />}

          {!loading && !error && rows.length === 0 && (
            <EmptyState title="No bookings match" body="Repair appointments booked through the site will appear here." />
          )}

          {!loading && rows.length > 0 && (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>Reference</Th>
                    <Th>Customer</Th>
                    <Th>Device & fault</Th>
                    <Th>Priority</Th>
                    <Th>Status</Th>
                    <Th>Technician</Th>
                    <Th>Received</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => adminApi.booking(b.id).then(setSelected).catch(() => setError('Could not open booking'))}
                      className="cursor-pointer transition-colors hover:bg-plate/60"
                    >
                      <Td className="font-mono text-[11px] text-volt">{b.ref}</Td>
                      <Td>
                        <span className="text-chalk">{b.customerName}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-slate">{b.phone}</span>
                      </Td>
                      <Td>
                        <span className="text-chalk">{b.deviceBrand} {b.deviceModel}</span>
                        <span className="mt-0.5 block text-[11.5px] text-slate">{LABELS.IssueCategory[b.issueCategory]}</span>
                      </Td>
                      <Td><StatusChip status={b.urgency} label={LABELS.Urgency[b.urgency]} /></Td>
                      <Td><StatusChip status={b.status} label={LABELS.BookingStatus[b.status]} /></Td>
                      <Td className="text-[12px]">{b.technician ?? <span className="text-slate">Unassigned</span>}</Td>
                      <Td className="font-mono text-[11px] text-slate">{formatDateTime(b.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
              <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={(p) => void load(p)} />
            </>
          )}
        </Panel>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-hairline bg-gunmetal">
            <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-hairline bg-gunmetal px-6 py-5">
              <div>
                <p className="font-mono text-[11px] tracking-wide text-volt">{selected.booking.ref}</p>
                <h2 className="mt-2 font-display text-[26px] font-semibold uppercase tracking-display text-chalk">
                  {selected.booking.deviceBrand} {selected.booking.deviceModel}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusChip status={selected.booking.urgency} label={LABELS.Urgency[selected.booking.urgency]} />
                  <StatusChip status={selected.booking.status} label={LABELS.BookingStatus[selected.booking.status]} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center border border-hairline text-steel hover:text-chalk"
                aria-label="Close"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </header>

            <div className="flex-1 space-y-8 p-6">
              <section>
                <h3 className="font-mono text-[10px] uppercase tracking-technical text-volt">Reported fault</h3>
                <p className="mt-3 whitespace-pre-wrap border-l border-hairline pl-4 text-[13.5px] leading-relaxed text-chalk">
                  {selected.booking.issueDescription}
                </p>
              </section>

              <section>
                <h3 className="font-mono text-[10px] uppercase tracking-technical text-volt">Job details</h3>
                <dl className="mt-4 space-y-3">
                  {[
                    ['Customer', selected.booking.customerName],
                    ['Phone', selected.booking.phone],
                    ['Email', selected.booking.email ?? '—'],
                    ['Handling', LABELS.ServiceMode[selected.booking.serviceMode]],
                    ['Fault class', LABELS.IssueCategory[selected.booking.issueCategory]],
                    ['Package', selected.booking.service?.name ?? 'None selected'],
                    ['Preferred', selected.booking.preferredDate ? `${selected.booking.preferredDate} · ${selected.booking.preferredSlot ?? ''}` : 'Flexible'],
                    ['Location', [selected.booking.address, selected.booking.city, selected.booking.state].filter(Boolean).join(', ') || '—'],
                    ['Booked', formatDateTime(selected.booking.createdAt)],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex gap-4">
                      <dt className="label-tech w-24 shrink-0 pt-0.5">{k}</dt>
                      <dd className="text-[12.5px] leading-relaxed text-chalk">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="space-y-5">
                <h3 className="font-mono text-[10px] uppercase tracking-technical text-volt">Workshop</h3>

                <Field label="Status">
                  <select
                    value={selected.booking.status}
                    onChange={(e) => void update(selected.booking.id, { status: e.target.value as BookingStatus })}
                    className="field appearance-none bg-plate"
                  >
                    {BOOKING_STATUSES.map((s) => (
                      <option key={s} value={s}>{LABELS.BookingStatus[s]}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Technician" hint="Name of whoever is on the bench for this job.">
                  <input
                    defaultValue={selected.booking.technician ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (selected.booking.technician ?? '')) {
                        void update(selected.booking.id, { technician: e.target.value });
                      }
                    }}
                    className="field"
                  />
                </Field>

                <Field label="Quoted fee (₦)" hint="The figure approved by the customer, before work starts.">
                  <input
                    type="number"
                    min={0}
                    defaultValue={selected.booking.estimatedKobo ? selected.booking.estimatedKobo / 100 : ''}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isFinite(value) && value > 0) void update(selected.booking.id, { estimatedFee: value });
                    }}
                    className="field"
                  />
                  {selected.booking.estimatedKobo ? (
                    <p className="mt-2 font-mono text-[11px] text-volt">
                      Currently quoted at {formatNaira(selected.booking.estimatedKobo)}
                    </p>
                  ) : null}
                </Field>

                <Field label="Internal notes" hint="Bench findings, parts ordered, anything the next technician needs.">
                  <textarea
                    defaultValue={selected.booking.internalNotes ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (selected.booking.internalNotes ?? '')) {
                        void update(selected.booking.id, { internalNotes: e.target.value });
                      }
                    }}
                    rows={4}
                    className="field resize-y"
                  />
                </Field>
              </section>

              <section className="border border-hairline bg-void p-5">
                <h3 className="font-mono text-[10px] uppercase tracking-technical text-volt">Customer thread</h3>
                <p className="mt-3 text-[12.5px] leading-relaxed text-steel">
                  Open WhatsApp with this booking's details pre-filled.
                </p>
                <a href={selected.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm mt-4">
                  Open WhatsApp
                </a>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
