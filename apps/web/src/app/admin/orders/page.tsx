'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDateTime, formatNaira, LABELS, ORDER_STATUSES, PAYMENT_STATUSES, type Order, type OrderStatus } from '@arkvolt/shared';
import { adminApi } from '@/lib/api';
import {
  PageHeader, Panel, TableShell, Th, Td, StatusChip, EmptyState, LoadingRows,
  ErrorBanner, FilterBar, FilterChips, Pagination, Field,
} from '@/components/admin/ui';

/**
 * Orders pipeline.
 *
 * Selecting a row opens a drawer rather than a new page: on a busy day the
 * admin works through a queue, and losing the list position between every
 * status change is the fastest way to make a tool annoying.
 */
export default function AdminOrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [meta, setMeta] = useState({ page: 1, perPage: 25, total: 0, totalPages: 1 });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ order: Order; whatsappUrl: string } | null>(null);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi.orders({ q: query, status, page, perPage: 25 });
        setRows(res.items);
        setMeta(res.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load orders');
      } finally {
        setLoading(false);
      }
    },
    [query, status],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const open = async (id: string) => {
    try {
      setSelected(await adminApi.order(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that order');
    }
  };

  const update = async (id: string, patch: Record<string, unknown>) => {
    try {
      await adminApi.updateOrder(id, patch);
      setSelected((s) => (s ? { ...s, order: { ...s.order, ...patch } as Order } : s));
      await load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Every order placed on the storefront. Update the pipeline status and record payment as it is confirmed on WhatsApp."
        actions={
          <a href="/api/admin/export/orders.csv" className="btn-ghost btn-sm">
            Export CSV
          </a>
        }
      />

      <div className="px-5 py-8 lg:px-8">
        <Panel>
          <FilterBar query={query} onQuery={setQuery} placeholder="Search by reference, name or phone…">
            <FilterChips
              value={status}
              onChange={setStatus}
              options={[{ value: '', label: 'All' }, ...ORDER_STATUSES.map((s) => ({ value: s as string, label: LABELS.OrderStatus[s] }))]}
            />
          </FilterBar>

          {error && <ErrorBanner message={error} onRetry={() => void load(meta.page)} />}
          {loading && <LoadingRows />}

          {!loading && !error && rows.length === 0 && (
            <EmptyState
              title="No orders match"
              body="Adjust the filters, or wait for the next order to come through the storefront."
            />
          )}

          {!loading && rows.length > 0 && (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>Reference</Th>
                    <Th>Customer</Th>
                    <Th>Items</Th>
                    <Th>Status</Th>
                    <Th>Payment</Th>
                    <Th className="text-right">Total</Th>
                    <Th>Placed</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => void open(order.id)}
                      className="cursor-pointer transition-colors hover:bg-plate/60"
                    >
                      <Td className="font-mono text-[11px] text-volt">{order.ref}</Td>
                      <Td>
                        <span className="text-chalk">{order.customerName}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-slate">{order.phone}</span>
                      </Td>
                      <Td className="text-[12px]">
                        {order.items.length} line{order.items.length === 1 ? '' : 's'}
                      </Td>
                      <Td>
                        <StatusChip status={order.status} label={LABELS.OrderStatus[order.status]} />
                      </Td>
                      <Td>
                        <StatusChip status={order.paymentStatus} label={LABELS.PaymentStatus[order.paymentStatus]} />
                      </Td>
                      <Td numeric className="text-right text-chalk">
                        {formatNaira(order.totalKobo)}
                      </Td>
                      <Td className="font-mono text-[11px] text-slate">{formatDateTime(order.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
              <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={(p) => void load(p)} />
            </>
          )}
        </Panel>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-hairline bg-gunmetal">
            <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-hairline bg-gunmetal px-6 py-5">
              <div>
                <p className="font-mono text-[11px] tracking-wide text-volt">{selected.order.ref}</p>
                <h2 className="mt-2 font-display text-[26px] font-semibold uppercase tracking-display text-chalk">
                  {selected.order.customerName}
                </h2>
                <p className="mt-1 font-mono text-[10px] text-slate">{formatDateTime(selected.order.createdAt)}</p>
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
                <h3 className="font-mono text-[10px] uppercase tracking-technical text-volt">Contact</h3>
                <dl className="mt-4 space-y-3">
                  {[
                    ['Phone', selected.order.phone],
                    ['Email', selected.order.email ?? '—'],
                    ['Fulfilment', LABELS.FulfilmentMode[selected.order.fulfilment]],
                    ['Address', [selected.order.address, selected.order.city, selected.order.state].filter(Boolean).join(', ') || '—'],
                    ['Customer note', selected.order.notes ?? '—'],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex gap-4">
                      <dt className="label-tech w-24 shrink-0 pt-0.5">{k}</dt>
                      <dd className="text-[12.5px] leading-relaxed text-chalk">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3 className="font-mono text-[10px] uppercase tracking-technical text-volt">Items</h3>
                <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
                  {selected.order.items.map((item) => (
                    <li key={item.id} className="flex items-baseline justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[13px] text-chalk">{item.nameSnapshot}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate">
                          {item.skuSnapshot} · {item.quantity} × {formatNaira(item.unitPriceKobo)}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[13px] tabular-nums text-chalk">
                        {formatNaira(item.lineTotalKobo)}
                      </span>
                    </li>
                  ))}
                </ul>

                <dl className="mt-4 space-y-2.5">
                  <div className="flex justify-between">
                    <dt className="text-[12.5px] text-steel">Subtotal</dt>
                    <dd className="font-mono text-[12.5px] tabular-nums text-chalk">{formatNaira(selected.order.subtotalKobo)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[12.5px] text-steel">Delivery</dt>
                    <dd className="font-mono text-[12.5px] tabular-nums text-chalk">{formatNaira(selected.order.deliveryFeeKobo)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-hairline pt-3">
                    <dt className="font-mono text-[10px] uppercase tracking-technical text-steel">Total</dt>
                    <dd className="font-display text-[24px] font-semibold tabular-nums tracking-display text-chalk">
                      {formatNaira(selected.order.totalKobo)}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-5">
                <h3 className="font-mono text-[10px] uppercase tracking-technical text-volt">Pipeline</h3>

                <Field label="Order status">
                  <select
                    value={selected.order.status}
                    onChange={(e) => void update(selected.order.id, { status: e.target.value as OrderStatus })}
                    className="field appearance-none bg-plate"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {LABELS.OrderStatus[s]}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Payment status">
                  <select
                    value={selected.order.paymentStatus}
                    onChange={(e) => void update(selected.order.id, { paymentStatus: e.target.value })}
                    className="field appearance-none bg-plate"
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {LABELS.PaymentStatus[s]}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Delivery fee (₦)" hint="Leave blank to keep the amount charged at checkout.">
                  <input
                    type="number"
                    min={0}
                    defaultValue={selected.order.deliveryFeeKobo / 100}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isFinite(value) && value * 100 !== selected.order.deliveryFeeKobo) {
                        void update(selected.order.id, { deliveryFee: value });
                      }
                    }}
                    className="field"
                  />
                </Field>

                <Field label="Internal notes" hint="Never shown to the customer.">
                  <textarea
                    defaultValue={selected.order.internalNotes ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (selected.order.internalNotes ?? '')) {
                        void update(selected.order.id, { internalNotes: e.target.value });
                      }
                    }}
                    rows={3}
                    className="field resize-y"
                  />
                </Field>
              </section>

              <section className="border border-hairline bg-void p-5">
                <h3 className="font-mono text-[10px] uppercase tracking-technical text-volt">
                  WhatsApp hand-off
                </h3>
                <p className="mt-3 text-[12.5px] leading-relaxed text-steel">
                  Reopen the thread with this order's details pre-filled, or record that it has been
                  sent for response-time reporting.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a href={selected.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
                    Open WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminApi.markWhatsappSent(selected.order.id);
                      await load(meta.page);
                    }}
                    className="btn-ghost btn-sm"
                  >
                    Mark as sent
                  </button>
                </div>
                {selected.order.whatsappSentAt && (
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-technical text-slate">
                    Recorded {formatDateTime(selected.order.whatsappSentAt)}
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
