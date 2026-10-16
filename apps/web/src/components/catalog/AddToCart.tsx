'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatNaira, type Product } from '@arkvolt/shared';
import { useCart } from '@/lib/cart';

/**
 * Purchase panel.
 *
 * No "Buy now" that pretends to take payment — this store settles on
 * WhatsApp, and the interface should not imply otherwise. Adding to the cart
 * announces itself and offers the two real next steps.
 */
export const AddToCart = ({ product }: { product: Product }) => {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { add, has } = useCart();

  const outOfStock = product.trackStock && product.stock <= 0;
  const maxQty = product.trackStock ? Math.min(product.stock, 20) : 20;
  const alreadyInCart = has(product.id);

  const onAdd = () => {
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      unitPriceKobo: product.priceKobo,
      quantity,
      imageUrl: product.images[0]?.url ?? null,
      stock: product.stock,
      trackStock: product.trackStock,
      kind: product.kind,
    });
    setAdded(true);
  };

  if (outOfStock) {
    return (
      <div className="mt-8">
        <div className="border border-crimson/30 bg-crimson/[0.04] p-5">
          <p className="text-[13.5px] text-chalk">
            This is out of stock right now. The workshop restocks weekly.
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-steel">
            Message us and we will tell you the next delivery date, or source an equivalent
            specification.
          </p>
        </div>
        <Link href={`/contact?about=${product.slug}&subject=Stock enquiry`} className="btn-ghost mt-4 w-full justify-center">
          Ask when it is back
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-stretch gap-3">
        {product.trackStock && maxQty > 1 && (
          <div className="flex items-center border border-hairline-strong">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-full w-11 items-center justify-center text-steel transition-colors hover:bg-plate hover:text-chalk disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                <path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <span className="w-12 text-center font-mono text-[14px] tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty}
              className="flex h-full w-11 items-center justify-center text-steel transition-colors hover:bg-plate hover:text-chalk disabled:opacity-30"
              aria-label="Increase quantity"
            >
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </div>
        )}

        <button type="button" onClick={onAdd} className="btn-primary min-w-[200px] flex-1">
          {alreadyInCart ? 'Add another' : 'Add to cart'}
          {quantity > 1 && <span className="text-void/70">· {formatNaira(product.priceKobo * quantity)}</span>}
        </button>
      </div>

      {/* Confirmation replaces nothing and blocks nothing — it sits under the
          button and offers the next action. */}
      {added && (
        <div className="mt-4 animate-fade-up border border-volt/30 bg-volt/[0.04] p-4" role="status">
          <p className="font-mono text-[10px] uppercase tracking-technical text-volt">
            Added to cart
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-steel">
            Checkout sends your order to the workshop on WhatsApp, where payment and delivery are
            confirmed.
          </p>
          <div className="mt-3.5 flex flex-wrap gap-3">
            <Link href="/checkout" className="btn-primary btn-sm">
              Go to checkout
            </Link>
            <button type="button" onClick={() => setAdded(false)} className="btn-quiet btn-sm">
              Keep browsing
            </button>
          </div>
        </div>
      )}

      <p className="mt-5 font-mono text-[10px] leading-relaxed tracking-wide text-slate">
        No payment is taken on this site · 90-day warranty on parts and labour
      </p>
    </div>
  );
};
