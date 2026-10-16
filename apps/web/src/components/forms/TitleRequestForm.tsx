'use client';

import { useState } from 'react';
import Link from 'next/link';
import { titleRequestSchema } from '@arkvolt/shared';
import { api, ApiRequestError } from '@/lib/api';
import { clearIdempotencyKey, useIdempotencyKey } from '@/lib/cart';

const PLATFORMS = ['PC (Windows 11)', 'PC (Windows 10)', 'Mac', 'Not sure'];

export const TitleRequestForm = ({ initialTitle }: { initialTitle: string }) => {
  const [draft, setDraft] = useState({
    titleName: initialTitle,
    platform: PLATFORMS[0]!,
    deviceSpecs: '',
    customerName: '',
    phone: '',
    email: '',
    city: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<{ ref: string; whatsappUrl: string } | null>(null);
  const idempotencyKey = useIdempotencyKey('title-request');

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: [] }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = titleRequestSchema.safeParse({
      ...draft,
      email: draft.email || undefined,
      city: draft.city || undefined,
      notes: draft.notes || undefined,
      deviceSpecs: draft.deviceSpecs || undefined,
      idempotencyKey,
    });

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
      const res = await api.submitTitleRequest(parsed.data);
      clearIdempotencyKey('title-request');
      setDone({ ref: res.request.ref, whatsappUrl: res.whatsappUrl });
      window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.details);
        setFailure(err.message);
      } else {
        setFailure('We could not send that. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="border border-volt/30 bg-volt/[0.03] p-8 md:p-10">
        <span className="chip-volt">Request received</span>
        <h2 className="mt-5 font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
          {done.ref}
        </h2>
        <p className="mt-5 max-w-lg text-[14.5px] leading-relaxed text-steel">
          Your specification is on its way to the workshop. We will check it against the title's
          requirement sheet and come back with a fixed setup price — usually within a couple of hours
          during working days.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Open WhatsApp
          </a>
          <Link href="/titles" className="btn-ghost">
            Request another title
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-8" noValidate>
      <div className="border border-hairline bg-gunmetal p-6 md:p-7">
        <h2 className="font-mono text-[10px] uppercase tracking-technical text-volt">The title</h2>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="tr-title" className="field-label">
              Title name
            </label>
            <input
              id="tr-title"
              value={draft.titleName}
              onChange={(e) => set('titleName', e.target.value)}
              placeholder="e.g. Cyberpunk 2077"
              className="field"
              autoComplete="off"
              required
            />
            {errors.titleName?.[0] && <p className="field-error">{errors.titleName[0]}</p>}
          </div>

          <div>
            <label htmlFor="tr-platform" className="field-label">
              Platform
            </label>
            <select
              id="tr-platform"
              value={draft.platform}
              onChange={(e) => set('platform', e.target.value)}
              className="field appearance-none bg-plate"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border border-hairline bg-gunmetal p-6 md:p-7">
        <h2 className="font-mono text-[10px] uppercase tracking-technical text-volt">Your machine</h2>

        <div className="mt-6">
          <label htmlFor="tr-specs" className="field-label">
            Specification
          </label>
          <textarea
            id="tr-specs"
            value={draft.deviceSpecs}
            onChange={(e) => set('deviceSpecs', e.target.value)}
            rows={3}
            placeholder="e.g. Ryzen 5 3600, RTX 2060 6GB, 16GB RAM, 1TB mechanical drive"
            className="field resize-y"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-slate">
            Processor, graphics card, memory and what your drive is. Run{' '}
            <code className="font-mono text-[11px] text-volt">dxdiag</code> if you are unsure.
          </p>
        </div>

        <div className="mt-5">
          <label htmlFor="tr-notes" className="field-label">
            What is it currently doing? <span className="text-slate/60">(optional)</span>
          </label>
          <textarea
            id="tr-notes"
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder="Stutters on medium settings, takes two minutes to load, will not launch at all…"
            className="field resize-y"
          />
        </div>
      </div>

      <div className="border border-hairline bg-gunmetal p-6 md:p-7">
        <h2 className="font-mono text-[10px] uppercase tracking-technical text-volt">How we reach you</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="tr-name" className="field-label">
              Full name
            </label>
            <input
              id="tr-name"
              value={draft.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              className="field"
              autoComplete="name"
              required
            />
            {errors.customerName?.[0] && <p className="field-error">{errors.customerName[0]}</p>}
          </div>
          <div>
            <label htmlFor="tr-phone" className="field-label">
              Phone number
            </label>
            <input
              id="tr-phone"
              type="tel"
              value={draft.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="0803 000 0000"
              className="field"
              autoComplete="tel"
              required
            />
            {errors.phone?.[0] && <p className="field-error">{errors.phone[0]}</p>}
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="tr-email" className="field-label">
              Email <span className="text-slate/60">(optional)</span>
            </label>
            <input
              id="tr-email"
              type="email"
              value={draft.email}
              onChange={(e) => set('email', e.target.value)}
              className="field"
              autoComplete="email"
            />
            {errors.email?.[0] && <p className="field-error">{errors.email[0]}</p>}
          </div>
          <div>
            <label htmlFor="tr-city" className="field-label">
              City <span className="text-slate/60">(optional)</span>
            </label>
            <input
              id="tr-city"
              value={draft.city}
              onChange={(e) => set('city', e.target.value)}
              className="field"
              autoComplete="address-level2"
            />
          </div>
        </div>
      </div>

      {failure && (
        <div className="border border-crimson/40 bg-crimson/[0.05] p-4" role="alert">
          <p className="text-[13.5px] text-chalk">{failure}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-5">
        <button type="submit" disabled={submitting} className="btn-primary min-w-[240px]">
          {submitting ? 'Sending…' : 'Send request & open WhatsApp'}
        </button>
        <p className="max-w-xs text-[11px] leading-relaxed text-slate">
          We reply with the requirement check and a fixed setup price. No obligation, nothing charged
          to send this.
        </p>
      </div>
    </form>
  );
};
