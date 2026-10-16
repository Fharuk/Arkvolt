'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import type { StoreSettings } from '@arkvolt/shared';
import { formatNaira } from '@arkvolt/shared';
import { useCart } from '@/lib/cart';

export const CartDrawer = ({ open, onClose, settings }: { open: boolean; onClose: () => void; settings: StoreSettings }) => {
  const { lines, subtotalKobo, setQuantity, remove, count } = useCart();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const freeThreshold = settings.freeDeliveryThresholdKobo;
  const towardsFree = Math.max(0, freeThreshold - subtotalKobo);
  const progress = freeThreshold > 0 ? Math.min(100, (subtotalKobo / freeThreshold) * 100) : 0;

  return (
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-void/85 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-label="Your cart"
        aria-modal={open}
        className={`absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col border-l border-hairline bg-gunmetal transition-transform duration-400 ease-mechanical ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-hairline px-6 py-5">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl font-semibold uppercase tracking-display">Your cart</h2>
            <span className="font-mono text-[10px] tabular-nums text-slate">
              {count} {count === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-hairline text-steel transition-colors hover:border-hairline-strong hover:text-chalk"
            aria-label="Close cart"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="bracket border border-hairline p-8">
              <svg viewBox="0 0 32 32" className="h-8 w-8 text-slate" fill="none" aria-hidden>
                <path d="M4 9h4l3 14h14l3-10H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
                <circle cx="13" cy="27" r="1.6" fill="currentColor" />
                <circle cx="24" cy="27" r="1.6" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="font-display text-xl uppercase tracking-display text-steel">Nothing here yet</p>
              <p className="mt-2 text-sm text-slate">
                Components, upgrade kits and in-house tools are in the store.
              </p>
            </div>
            <Link href="/store" onClick={onClose} className="btn-ghost">
              Browse the store
            </Link>
          </div>
        ) : (
          <>
            {freeThreshold > 0 && (
              <div className="border-b border-hairline px-6 py-4">
                {towardsFree > 0 ? (
                  <p className="font-mono text-[10px] uppercase tracking-technical text-slate">
                    {formatNaira(towardsFree)} more for free delivery
                  </p>
                ) : (
                  <p className="font-mono text-[10px] uppercase tracking-technical text-jade">
                    Free delivery unlocked
                  </p>
                )}
                <div className="mt-2.5 h-[3px] w-full bg-hairline" role="presentation">
                  <div
                    className="h-full bg-volt transition-[width] duration-500 ease-mechanical"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <ul className="flex-1 overflow-y-auto">
              {lines.map((line) => (
                <li key={line.productId} className="flex gap-4 border-b border-hairline p-6">
                  <div className="relative h-20 w-20 shrink-0 border border-hairline bg-plate">
                    {line.imageUrl ? (
                      <Image src={line.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-[9px] text-slate">
                        NO IMG
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/store/${line.slug}`}
                        onClick={onClose}
                        className="line-clamp-2 text-[14px] font-medium leading-snug text-chalk hover:text-volt"
                      >
                        {line.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(line.productId)}
                        className="shrink-0 text-slate transition-colors hover:text-crimson"
                        aria-label={`Remove ${line.name}`}
                      >
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </button>
                    </div>

                    <p className="mt-1 font-mono text-[10px] uppercase tracking-technical text-slate">{line.sku}</p>

                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div className="flex items-center border border-hairline">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center text-steel transition-colors hover:bg-plate hover:text-chalk"
                          aria-label={`Decrease quantity of ${line.name}`}
                        >
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden>
                            <path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" />
                          </svg>
                        </button>
                        <span className="w-9 text-center font-mono text-[12px] tabular-nums">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          disabled={line.trackStock && line.quantity >= line.stock}
                          className="flex h-8 w-8 items-center justify-center text-steel transition-colors hover:bg-plate hover:text-chalk disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label={`Increase quantity of ${line.name}`}
                        >
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden>
                            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" />
                          </svg>
                        </button>
                      </div>
                      <span className="font-mono text-[13px] tabular-nums text-chalk">
                        {formatNaira(line.unitPriceKobo * line.quantity)}
                      </span>
                    </div>

                    {line.trackStock && line.quantity >= line.stock && (
                      <p className="mt-2 font-mono text-[9px] uppercase tracking-technical text-amber">
                        Maximum available stock
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-hairline p-6">
              <div className="mb-4 flex items-baseline justify-between">
                <span className="label-tech">Subtotal</span>
                <span className="font-display text-3xl font-semibold tabular-nums tracking-display text-chalk">
                  {formatNaira(subtotalKobo)}
                </span>
              </div>

              <p className="mb-5 text-[12px] leading-relaxed text-slate">
                Delivery is calculated at checkout. Payment is confirmed with the admin on WhatsApp —
                nothing is charged on this site.
              </p>

              <Link href="/checkout" onClick={onClose} className="btn-primary w-full justify-center">
                Proceed to checkout
              </Link>
              <Link href="/cart" onClick={onClose} className="btn-quiet mt-2 w-full justify-center">
                View full cart
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};
