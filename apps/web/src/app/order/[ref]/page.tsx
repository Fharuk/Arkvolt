import type { Metadata } from 'next';
import Link from 'next/link';
import { formatNaira, formatDateTime, LABELS } from '@arkvolt/shared';
import { api } from '@/lib/api';
import { OrderActions } from '@/components/forms/OrderActions';

export const metadata: Metadata = {
  title: 'Order status',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STAGES = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'] as const;

export default async function OrderPage({ params }: { params: { ref: string } }) {
  const ref = decodeURIComponent(params.ref).toUpperCase();

  let result;
  try {
    result = await api.lookupOrder(ref);
  } catch {
    result = null;
  }

  if (!result) {
    return (
      <section className="shell flex min-h-[60vh] items-center justify-center py-20">
        <div className="max-w-lg border border-hairline bg-gunmetal p-10 text-center">
          <span className="chip">Reference not found</span>
          <h1 className="mt-6 font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
            {ref}
          </h1>
          <p className="mt-5 text-[14px] leading-relaxed text-steel">
            We have no order under that reference. Check the characters — the letters and numbers are
            deliberately chosen so they cannot be confused when read aloud.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/order" className="btn-ghost btn-sm">
              Try another reference
            </Link>
            <Link href="/contact" className="btn-quiet btn-sm">
              Ask the workshop
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const { order, whatsappUrl } = result;
  const currentStage = STAGES.indexOf(order.status as (typeof STAGES)[number]);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <section className="shell py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-hairline pb-8">
          <div>
            <p className="label-tech">Order reference</p>
            <h1 className="mt-3 font-display text-d-md font-bold uppercase tracking-display text-chalk">
              {order.ref}
            </h1>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-technical text-slate">
              Placed {formatDateTime(order.createdAt)}
            </p>
          </div>

          <div className="text-right">
            <p className="label-tech">Status</p>
            <p
              className={`mt-3 font-display text-[26px] font-semibold uppercase tracking-display ${
                isCancelled ? 'text-crimson' : order.status === 'COMPLETED' ? 'text-jade' : 'text-volt'
              }`}
            >
              {LABELS.OrderStatus[order.status]}
            </p>
          </div>
        </div>

        {/* Progress rail */}
        {!isCancelled && (
          <ol className="mt-10 grid grid-cols-5 gap-px bg-hairline" aria-label="Order progress">
            {STAGES.map((stage, i) => {
              const done = i <= currentStage;
              return (
                <li key={stage} className="bg-void p-4">
                  <div className={`h-0.5 w-full ${done ? 'bg-volt' : 'bg-hairline'}`} aria-hidden />
                  <p
                    className={`mt-3 font-mono text-[9px] uppercase leading-tight tracking-technical ${
                      done ? 'text-chalk' : 'text-slate'
                    }`}
                  >
                    {LABELS.OrderStatus[stage]}
                  </p>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-technical text-volt">Items</h2>
            <ul className="mt-5 border-t border-hairline">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-6 border-b border-hairline py-4">
                  <div className="min-w-0">
                    {item.slugSnapshot ? (
                      <Link href={`/store/${item.slugSnapshot}`} className="text-[14px] text-chalk hover:text-volt">
                        {item.nameSnapshot}
                      </Link>
                    ) : (
                      <span className="text-[14px] text-chalk">{item.nameSnapshot}</span>
                    )}
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-technical text-slate">
                      {item.skuSnapshot} · {item.quantity} × {formatNaira(item.unitPriceKobo)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[14px] tabular-nums text-chalk">
                    {formatNaira(item.lineTotalKobo)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-3">
              <div className="flex items-baseline justify-between">
                <dt className="text-[13px] text-steel">Subtotal</dt>
                <dd className="font-mono text-[13px] tabular-nums text-chalk">{formatNaira(order.subtotalKobo)}</dd>
              </div>
              {order.deliveryFeeKobo > 0 && (
                <div className="flex items-baseline justify-between">
                  <dt className="text-[13px] text-steel">Delivery</dt>
                  <dd className="font-mono text-[13px] tabular-nums text-chalk">{formatNaira(order.deliveryFeeKobo)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-hairline pt-4">
                <dt className="font-mono text-[10px] uppercase tracking-technical text-steel">Total</dt>
                <dd className="font-display text-[30px] font-semibold leading-none tabular-nums tracking-display text-chalk">
                  {formatNaira(order.totalKobo)}
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className={`chip ${order.paymentStatus === 'PAID' ? 'border-jade/40 text-jade' : ''}`}>
                {LABELS.PaymentStatus[order.paymentStatus]}
              </span>
              <span className="chip">{LABELS.FulfilmentMode[order.fulfilment]}</span>
            </div>
          </div>

          <aside className="space-y-8">
            <div className="border border-hairline bg-gunmetal p-6">
              <h2 className="font-mono text-[10px] uppercase tracking-technical text-volt">
                Need to change something?
              </h2>
              <p className="mt-4 text-[13px] leading-relaxed text-steel">
                Message the workshop with your reference and we will sort it. Orders are not final
                until payment is confirmed.
              </p>
              <OrderActions whatsappUrl={whatsappUrl} ref_={order.ref} />

              <dl className="mt-6 space-y-3.5 border-t border-hairline pt-5">
                {[
                  ['Name', order.customerName],
                  ['Phone', order.phone],
                  ...(order.address ? ([['Address', [order.address, order.city, order.state].filter(Boolean).join(', ')]] as const) : []),
                  ...(order.notes ? ([['Your notes', order.notes]] as const) : []),
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex gap-4">
                    <dt className="label-tech w-20 shrink-0 pt-0.5">{k}</dt>
                    <dd className="text-[12.5px] leading-relaxed text-chalk">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="border border-hairline p-6">
              <h2 className="label-tech">What happens next</h2>
              <ol className="mt-4 space-y-4">
                {[
                  'The admin confirms stock and delivery with you on WhatsApp.',
                  'Payment is arranged directly — bank transfer or on collection.',
                  'We prepare, fit and test the components.',
                  'You collect, or we dispatch by courier.',
                ].map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="font-mono text-[10px] tabular-nums text-volt">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[12.5px] leading-relaxed text-steel">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
