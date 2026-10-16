'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatNaira } from '@arkvolt/shared';
import { useCart } from '@/lib/cart';

export const CartView = ({
  freeThresholdKobo,
  deliveryFeeKobo,
}: {
  freeThresholdKobo: number;
  deliveryFeeKobo: number;
}) => {
  const { lines, subtotalKobo, setQuantity, remove, clear, ready } = useCart();

  if (!ready) {
    return (
      <div className="space-y-px">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="border border-hairline bg-gunmetal p-12 text-center md:p-20">
        <h2 className="font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
          Your cart is empty
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-steel">
          Storage, memory, thermal supplies and the tooling we use on the bench are all in the store.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/store" className="btn-primary">
            Browse the store
          </Link>
          <Link href="/repairs" className="btn-ghost">
            See repair services
          </Link>
        </div>
      </div>
    );
  }

  const qualifiesForFree = freeThresholdKobo > 0 && subtotalKobo >= freeThresholdKobo;
  const estimatedDelivery = qualifiesForFree ? 0 : deliveryFeeKobo;
  const towardsFree = Math.max(0, freeThresholdKobo - subtotalKobo);

  return (
    <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
      <div>
        <ul className="border-t border-hairline">
          {lines.map((line) => (
            <li key={line.productId} className="flex gap-5 border-b border-hairline py-6">
              <Link href={`/store/${line.slug}`} className="relative h-24 w-24 shrink-0 border border-hairline bg-plate">
                {line.imageUrl ? (
                  <Image src={line.imageUrl} alt="" fill sizes="96px" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center font-mono text-[9px] text-slate">—</span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/store/${line.slug}`}
                      className="font-display text-[20px] font-semibold uppercase leading-tight tracking-display text-chalk hover:text-volt"
                    >
                      {line.name}
                    </Link>
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-technical text-slate">
                      {line.sku} · {formatNaira(line.unitPriceKobo)} each
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[15px] tabular-nums text-chalk">
                    {formatNaira(line.unitPriceKobo * line.quantity)}
                  </span>
                </div>

                <div className="mt-auto flex items-center gap-5 pt-5">
                  <div className="flex items-center border border-hairline">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center text-steel transition-colors hover:bg-plate hover:text-chalk"
                      aria-label={`Decrease quantity of ${line.name}`}
                    >
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                        <path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                    </button>
                    <span className="w-10 text-center font-mono text-[13px] tabular-nums">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      disabled={line.trackStock && line.quantity >= line.stock}
                      className="flex h-9 w-9 items-center justify-center text-steel transition-colors hover:bg-plate hover:text-chalk disabled:opacity-30"
                      aria-label={`Increase quantity of ${line.name}`}
                    >
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                        <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(line.productId)}
                    className="font-mono text-[10px] uppercase tracking-technical text-slate transition-colors hover:text-crimson"
                  >
                    Remove
                  </button>

                  {line.trackStock && line.quantity >= line.stock && (
                    <span className="font-mono text-[10px] uppercase tracking-technical text-amber">
                      Max available
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between">
          <Link href="/store" className="btn-quiet btn-sm">
            ← Continue shopping
          </Link>
          <button
            type="button"
            onClick={clear}
            className="font-mono text-[10px] uppercase tracking-technical text-slate transition-colors hover:text-crimson"
          >
            Empty cart
          </button>
        </div>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="border border-hairline bg-gunmetal p-6 md:p-7">
          <h2 className="font-mono text-[10px] uppercase tracking-technical text-volt">Summary</h2>

          <dl className="mt-6 space-y-3.5">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[13px] text-steel">Subtotal</dt>
              <dd className="font-mono text-[14px] tabular-nums text-chalk">{formatNaira(subtotalKobo)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[13px] text-steel">Delivery</dt>
              <dd className="font-mono text-[14px] tabular-nums text-chalk">
                {estimatedDelivery === 0 ? 'Free' : formatNaira(estimatedDelivery)}
              </dd>
            </div>
          </dl>

          {freeThresholdKobo > 0 && !qualifiesForFree && (
            <div className="mt-5 border-t border-hairline pt-5">
              <p className="font-mono text-[10px] uppercase tracking-technical text-slate">
                {formatNaira(towardsFree)} more for free delivery
              </p>
              <div className="mt-2.5 h-[3px] w-full bg-hairline">
                <div
                  className="h-full bg-volt transition-[width] duration-500 ease-mechanical"
                  style={{ width: `${Math.min(100, (subtotalKobo / freeThresholdKobo) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-hairline pt-6">
            <dt className="font-mono text-[10px] uppercase tracking-technical text-steel">Estimated total</dt>
            <dd className="font-display text-[32px] font-semibold leading-none tabular-nums tracking-display text-chalk">
              {formatNaira(subtotalKobo + estimatedDelivery)}
            </dd>
          </div>

          <Link href="/checkout" className="btn-primary mt-7 w-full justify-center">
            Proceed to checkout
          </Link>

          <p className="mt-5 text-[12px] leading-relaxed text-slate">
            Final delivery is confirmed by the admin on WhatsApp, based on your address. Nothing is
            charged on this site.
          </p>
        </div>

        <ul className="mt-6 space-y-3 border-t border-hairline pt-6">
          {[
            'Fitting included on components within Lagos',
            '90-day warranty on parts and labour',
            'Serial numbers recorded against your order',
            'Nationwide courier outside Lagos',
          ].map((item) => (
            <li key={item} className="flex gap-3 text-[12.5px] leading-relaxed text-steel">
              <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt" fill="none" aria-hidden>
                <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.7" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};
