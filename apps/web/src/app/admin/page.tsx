'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDateTime, formatNaira, relativeTime, LABELS } from '@arkvolt/shared';
import { adminApi } from '@/lib/api';
import { PageHeader, Panel, Stat, StatusChip, EmptyState, LoadingRows, ErrorBanner } from '@/components/admin/ui';

type Stats = Awaited<ReturnType<typeof adminApi.stats>>;

/**
 * Overview.
 *
 * Ordered by what actually needs a decision: unread enquiries and open repair
 * bookings first, then money, then catalogue health. A dashboard that opens on
 * a revenue chart instead of the inbox is a dashboard that gets ignored.
 */
export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    adminApi
      .stats()
      .then(setStats)
      .catch((err: Error) => setError(err.message));
  };

  useEffect(load, []);

  const attentionCount = stats
    ? stats.inquiries.unread + stats.bookings.open + stats.orders.open + stats.titleRequests.open
    : 0;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={
          stats
            ? attentionCount > 0
              ? `${attentionCount} item${attentionCount === 1 ? '' : 's'} need attention across orders, repairs and enquiries.`
              : 'Nothing outstanding. Everything is up to date.'
            : 'Loading the current state of the workshop.'
        }
        actions={
          <>
            <Link href="/admin/products/new" className="btn-primary btn-sm">
              Add product
            </Link>
            <button type="button" onClick={load} className="btn-ghost btn-sm">
              Refresh
            </button>
          </>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}
      {!stats && !error && <LoadingRows rows={8} />}

      {stats && (
        <div className="space-y-8 px-5 py-8 lg:px-8">
          {/* Queue-first row */}
          <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Unread enquiries"
              value={stats.inquiries.unread}
              meta={`${stats.inquiries.total} total received`}
              tone={stats.inquiries.unread > 0 ? 'volt' : 'default'}
              href="/admin/inquiries"
            />
            <Stat
              label="Open repairs"
              value={stats.bookings.open}
              meta={`${stats.bookings.total} total · ${stats.bookings.emergency} emergency`}
              tone={stats.bookings.emergency > 0 ? 'crimson' : stats.bookings.open > 0 ? 'volt' : 'default'}
              href="/admin/bookings"
            />
            <Stat
              label="Open orders"
              value={stats.orders.open}
              meta={`${stats.orders.total} placed · ${stats.orders.completed} completed`}
              tone={stats.orders.open > 0 ? 'volt' : 'default'}
              href="/admin/orders"
            />
            <Stat
              label="Title requests"
              value={stats.titleRequests.open}
              meta={`${stats.titleRequests.total} total requested`}
              tone={stats.titleRequests.open > 0 ? 'volt' : 'default'}
              href="/admin/titles"
            />
          </div>

          {/* Money */}
          <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-3">
            <Stat
              label="Revenue, all time"
              value={formatNaira(stats.revenueKobo)}
              meta="Excludes cancelled orders"
              tone="jade"
            />
            <Stat label="This month" value={formatNaira(stats.revenueThisMonthKobo)} meta="Current calendar month" />
            <Stat
              label="Average order"
              value={stats.orders.completed + stats.orders.open > 0 ? formatNaira(Math.round(stats.revenueKobo / Math.max(1, stats.orders.total))) : '—'}
              meta={`Across ${stats.orders.total} order${stats.orders.total === 1 ? '' : 's'}`}
            />
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
            {/* Recent orders */}
            <Panel
              title="Recent orders"
              action={
                <Link href="/admin/orders" className="font-mono text-[10px] uppercase tracking-technical text-slate hover:text-chalk">
                  View all →
                </Link>
              }
            >
              {stats.recentOrders.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  body="Orders placed on the storefront appear here with their full line items and customer details."
                />
              ) : (
                <ul className="divide-y divide-hairline">
                  {stats.recentOrders.map((order) => (
                    <li key={order.id}>
                      <Link href={`/admin/orders?id=${order.id}`} className="flex items-center gap-5 px-5 py-4 transition-colors hover:bg-plate/60">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono text-[11px] tracking-wide text-volt">{order.ref}</span>
                            <StatusChip status={order.status} label={LABELS.OrderStatus[order.status]} />
                            <StatusChip status={order.paymentStatus} label={LABELS.PaymentStatus[order.paymentStatus]} />
                          </div>
                          <p className="mt-2 truncate text-[13px] text-chalk">{order.customerName}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate">
                            {order.items.length} item{order.items.length === 1 ? '' : 's'} · {relativeTime(order.createdAt)}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-[14px] tabular-nums text-chalk">
                          {formatNaira(order.totalKobo)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <div className="space-y-8">
              {/* Repairs */}
              <Panel
                title="Latest repair bookings"
                action={
                  <Link href="/admin/bookings" className="font-mono text-[10px] uppercase tracking-technical text-slate hover:text-chalk">
                    View all →
                  </Link>
                }
              >
                {stats.recentBookings.length === 0 ? (
                  <EmptyState title="No bookings yet" body="Repair appointments booked online appear here." />
                ) : (
                  <ul className="divide-y divide-hairline">
                    {stats.recentBookings.map((booking) => (
                      <li key={booking.id}>
                        <Link href={`/admin/bookings?id=${booking.id}`} className="block px-5 py-4 transition-colors hover:bg-plate/60">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-[11px] tracking-wide text-volt">{booking.ref}</span>
                            <StatusChip status={booking.urgency} label={LABELS.Urgency[booking.urgency]} />
                            <StatusChip status={booking.status} label={LABELS.BookingStatus[booking.status]} />
                          </div>
                          <p className="mt-2 text-[13px] text-chalk">
                            {booking.deviceBrand} {booking.deviceModel}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate">
                            {LABELS.IssueCategory[booking.issueCategory]} · {relativeTime(booking.createdAt)}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              {/* Stock warnings */}
              <Panel title="Low stock">
                {stats.lowStock.length === 0 ? (
                  <EmptyState title="Stock is healthy" body="No active product is at or below three units." />
                ) : (
                  <ul className="divide-y divide-hairline">
                    {stats.lowStock.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] text-chalk">{item.name}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate">{item.sku}</p>
                        </div>
                        <span
                          className={`shrink-0 font-mono text-[13px] tabular-nums ${
                            item.stock === 0 ? 'text-crimson' : 'text-amber'
                          }`}
                        >
                          {item.stock} left
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>

          {/* Catalogue health + top sellers */}
          <div className="grid gap-8 xl:grid-cols-2">
            <Panel title="Catalogue">
              <div className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-4">
                <div className="bg-void p-5">
                  <p className="font-mono text-[9px] uppercase tracking-technical text-slate">Active</p>
                  <p className="mt-2 font-display text-[30px] font-semibold tabular-nums tracking-display text-jade">
                    {stats.products.active}
                  </p>
                </div>
                <div className="bg-void p-5">
                  <p className="font-mono text-[9px] uppercase tracking-technical text-slate">Drafts</p>
                  <p className="mt-2 font-display text-[30px] font-semibold tabular-nums tracking-display text-amber">
                    {stats.products.draft}
                  </p>
                </div>
                <div className="bg-void p-5">
                  <p className="font-mono text-[9px] uppercase tracking-technical text-slate">Low stock</p>
                  <p className="mt-2 font-display text-[30px] font-semibold tabular-nums tracking-display text-amber">
                    {stats.products.lowStock}
                  </p>
                </div>
                <div className="bg-void p-5">
                  <p className="font-mono text-[9px] uppercase tracking-technical text-slate">Total</p>
                  <p className="mt-2 font-display text-[30px] font-semibold tabular-nums tracking-display text-chalk">
                    {stats.products.total}
                  </p>
                </div>
              </div>
              <div className="border-t border-hairline p-5">
                <Link href="/admin/products" className="btn-ghost btn-sm">
                  Manage catalogue
                </Link>
              </div>
            </Panel>

            <Panel title="Best selling lines">
              {stats.topProducts.length === 0 ? (
                <EmptyState title="No sales recorded" body="Once orders are placed, your best performing lines appear here." />
              ) : (
                <ul className="divide-y divide-hairline">
                  {stats.topProducts.map((product) => (
                    <li key={product.sku} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-chalk">{product.name}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate">
                          {product.sku} · {product.units} unit{product.units === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[13px] tabular-nums text-chalk">
                        {formatNaira(product.revenueKobo)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-technical text-slate/70">
            Dashboard generated {formatDateTime(new Date().toISOString())} WAT
          </p>
        </div>
      )}
    </>
  );
}
