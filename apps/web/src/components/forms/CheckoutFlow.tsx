'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FULFILMENT_MODES,
  LABELS,
  checkoutSchema,
  formatNaira,
  type FulfilmentMode,
} from '@arkvolt/shared';
import { api, ApiRequestError } from '@/lib/api';
import { clearIdempotencyKey, useCart, useIdempotencyKey } from '@/lib/cart';

type Draft = {
  customerName: string;
  phone: string;
  email: string;
  fulfilment: FulfilmentMode;
  address: string;
  city: string;
  state: string;
  notes: string;
};

const INITIAL: Draft = {
  customerName: '',
  phone: '',
  email: '',
  fulfilment: 'DELIVERY',
  address: '',
  city: '',
  state: 'Lagos',
  notes: '',
};

export const CheckoutFlow = ({
  deliveryFeeKobo,
  freeThresholdKobo,
}: {
  deliveryFeeKobo: number;
  freeThresholdKobo: number;
}) => {
  const { lines, subtotalKobo, ready, clear } = useCart();
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<{ ref: string; whatsappUrl: string; total: number } | null>(null);
  const idempotencyKey = useIdempotencyKey('checkout');

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: [] }));
  };

  const isDelivery = draft.fulfilment === 'DELIVERY';
  const qualifiesForFree = freeThresholdKobo > 0 && subtotalKobo >= freeThresholdKobo;
  const delivery = isDelivery && !qualifiesForFree ? deliveryFeeKobo : 0;
  const total = subtotalKobo + delivery;

  const submit = async () => {
    const payload = {
      ...draft,
      email: draft.email || undefined,
      address: draft.address || undefined,
      city: draft.city || undefined,
      state: draft.state || undefined,
      notes: draft.notes || undefined,
      paymentMethod: 'WHATSAPP_TRANSFER' as const,
      items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      idempotencyKey,
    };

    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '_');
        (next[key] ??= []).push(issue.message);
      }
      setErrors(next);
      setFailure('Check the highlighted fields.');
      return;
    }

    setSubmitting(true);
    setFailure(null);
    try {
      const res = await api.submitCheckout(parsed.data);
      clearIdempotencyKey('checkout');
      setDone({ ref: res.order.ref, whatsappUrl: res.whatsappUrl, total: res.order.totalKobo });
      clear();
      window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.details);
        setFailure(err.message);
      } else {
        setFailure('We could not place that order. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Confirmation ---------------- */
  if (done) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="border border-volt/30 bg-volt/[0.03] p-8 md:p-12">
          <span className="chip-volt">Order placed</span>

          <h2 className="mt-6 font-display text-d-md font-bold uppercase tracking-display text-chalk">
            {done.ref}
          </h2>

          <p className="mt-6 text-[15px] leading-relaxed text-steel">
            Your order total is{' '}
            <span className="font-mono tabular-nums text-chalk">{formatNaira(done.total)}</span>. The
            workshop has your details — send the WhatsApp message to confirm stock, delivery and
            payment. Nothing has been charged.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Open WhatsApp {done.ref}
            </a>
            <Link href={`/order/${done.ref}`} className="btn-ghost">
              Track this order
            </Link>
          </div>

          <div className="mt-10 border-t border-hairline pt-6">
            <p className="label-tech">Keep this reference</p>
            <p className="mt-2 text-[13px] leading-relaxed text-steel">
              {done.ref} is how the workshop finds your order. It is also in the WhatsApp message, so
              you do not need to write it down.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Empty cart ---------------- */
  if (ready && lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl border border-hairline bg-gunmetal p-10 text-center md:p-14">
        <h2 className="font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
          Nothing to check out
        </h2>
        <p className="mt-4 text-[14px] leading-relaxed text-steel">
          Add a component or tool to your cart and come back. If you were looking to book a repair
          instead, that is a separate form.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/store" className="btn-primary">
            Go to the store
          </Link>
          <Link href="/book" className="btn-ghost">
            Book a repair
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
      {/* ---------------- Form ---------------- */}
      <div className="space-y-10">
        <section>
          <h2 className="flex items-center gap-4 border-b border-hairline pb-4">
            <span className="index-num">01</span>
            <span className="font-display text-[22px] font-semibold uppercase tracking-display text-chalk">
              How should we get it to you?
            </span>
          </h2>

          <div className="mt-6 grid gap-px bg-hairline sm:grid-cols-2">
            {(['DELIVERY', 'PICKUP'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => set('fulfilment', mode)}
                aria-pressed={draft.fulfilment === mode}
                className={`p-5 text-left transition-colors duration-200 ${
                  draft.fulfilment === mode ? 'bg-volt/10' : 'bg-void hover:bg-plate'
                }`}
              >
                <span className={`block text-[14px] ${draft.fulfilment === mode ? 'text-chalk' : 'text-steel'}`}>
                  {LABELS.FulfilmentMode[mode]}
                </span>
                <span className="mt-1.5 block text-[12px] leading-snug text-slate">
                  {mode === 'DELIVERY'
                    ? qualifiesForFree
                      ? 'Free — your order qualifies'
                      : `Courier within Lagos — ${formatNaira(deliveryFeeKobo)}`
                    : 'Collect at the Ikeja workshop, fitting included'}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-4 border-b border-hairline pb-4">
            <span className="index-num">02</span>
            <span className="font-display text-[22px] font-semibold uppercase tracking-display text-chalk">
              Your details
            </span>
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="co-name" className="field-label">Full name</label>
              <input id="co-name" value={draft.customerName} onChange={(e) => set('customerName', e.target.value)} className="field" autoComplete="name" required />
              {errors.customerName?.[0] && <p className="field-error">{errors.customerName[0]}</p>}
            </div>
            <div>
              <label htmlFor="co-phone" className="field-label">Phone number</label>
              <input id="co-phone" type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0803 000 0000" className="field" autoComplete="tel" required />
              {errors.phone?.[0] ? (
                <p className="field-error">{errors.phone[0]}</p>
              ) : (
                <p className="mt-2 text-[11px] text-slate">The number the admin will message you on.</p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="co-email" className="field-label">
              Email <span className="text-slate/60">(optional)</span>
            </label>
            <input id="co-email" type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} className="field" autoComplete="email" />
            {errors.email?.[0] && <p className="field-error">{errors.email[0]}</p>}
          </div>

          {isDelivery && (
            <div className="mt-6 space-y-5 border-t border-hairline pt-6">
              <div>
                <label htmlFor="co-address" className="field-label">Delivery address</label>
                <input id="co-address" value={draft.address} onChange={(e) => set('address', e.target.value)} placeholder="House number, street, landmark" className="field" autoComplete="street-address" />
                {errors.address?.[0] && <p className="field-error">{errors.address[0]}</p>}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="co-city" className="field-label">City / area</label>
                  <input id="co-city" value={draft.city} onChange={(e) => set('city', e.target.value)} className="field" autoComplete="address-level2" />
                  {errors.city?.[0] && <p className="field-error">{errors.city[0]}</p>}
                </div>
                <div>
                  <label htmlFor="co-state" className="field-label">State</label>
                  <input id="co-state" value={draft.state} onChange={(e) => set('state', e.target.value)} className="field" autoComplete="address-level1" />
                </div>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="flex items-center gap-4 border-b border-hairline pb-4">
            <span className="index-num">03</span>
            <span className="font-display text-[22px] font-semibold uppercase tracking-display text-chalk">
              Anything we should know?
            </span>
          </h2>

          <div className="mt-6">
            <label htmlFor="co-notes" className="field-label">
              Notes for the workshop <span className="text-slate/60">(optional)</span>
            </label>
            <textarea
              id="co-notes"
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={4}
              placeholder="Machine model, whether you want it fitted while you wait, delivery instructions…"
              className="field resize-y"
            />
          </div>
        </section>

        {failure && (
          <div className="border border-crimson/40 bg-crimson/[0.05] p-4" role="alert">
            <p className="text-[13.5px] text-chalk">{failure}</p>
          </div>
        )}
      </div>

      {/* ---------------- Order summary ---------------- */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="border border-hairline bg-gunmetal">
          <h2 className="border-b border-hairline px-6 py-5 font-mono text-[10px] uppercase tracking-technical text-volt">
            Your order · {lines.reduce((n, l) => n + l.quantity, 0)} items
          </h2>

          <ul className="max-h-[320px] divide-y divide-hairline overflow-y-auto">
            {lines.map((line) => (
              <li key={line.productId} className="flex gap-4 p-5">
                <div className="relative h-14 w-14 shrink-0 border border-hairline bg-plate">
                  {line.imageUrl ? (
                    <Image src={line.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] leading-snug text-chalk">{line.name}</p>
                  <p className="mt-1 font-mono text-[10px] tabular-nums text-slate">
                    {line.quantity} × {formatNaira(line.unitPriceKobo)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[13px] tabular-nums text-chalk">
                  {formatNaira(line.unitPriceKobo * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-3.5 border-t border-hairline p-6">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[13px] text-steel">Subtotal</dt>
              <dd className="font-mono text-[14px] tabular-nums text-chalk">{formatNaira(subtotalKobo)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[13px] text-steel">
                {isDelivery ? 'Delivery' : 'Collection'}
              </dt>
              <dd className="font-mono text-[14px] tabular-nums text-chalk">
                {delivery === 0 ? (isDelivery ? 'Free' : '—') : formatNaira(delivery)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-5">
              <dt className="font-mono text-[10px] uppercase tracking-technical text-steel">Total</dt>
              <dd className="font-display text-[34px] font-semibold leading-none tabular-nums tracking-display text-chalk">
                {formatNaira(total)}
              </dd>
            </div>
          </dl>

          <div className="border-t border-hairline p-6">
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !ready}
              className="btn-primary w-full justify-center"
            >
              {submitting ? 'Placing order…' : 'Place order & open WhatsApp'}
            </button>

            <div className="mt-5 flex gap-3 border-t border-hairline pt-5">
              <svg viewBox="0 0 18 18" className="mt-0.5 h-4 w-4 shrink-0 text-slate" fill="none" aria-hidden>
                <rect x="2.5" y="7" width="13" height="8.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M6 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              <p className="text-[12px] leading-relaxed text-slate">
                No card details are collected and nothing is charged on this site. Payment is arranged
                directly with the admin on WhatsApp once your order is confirmed.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
