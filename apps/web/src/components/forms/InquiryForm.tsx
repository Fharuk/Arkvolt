'use client';

import { useState } from 'react';
import { inquirySchema } from '@arkvolt/shared';
import { api, ApiRequestError } from '@/lib/api';
import { clearIdempotencyKey, useIdempotencyKey } from '@/lib/cart';

export const InquiryForm = ({
  initialSubject = '',
  relatedSlug = '',
}: {
  initialSubject?: string;
  relatedSlug?: string;
}) => {
  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    email: '',
    subject: initialSubject,
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<{ ref: string; whatsappUrl: string } | null>(null);
  const idempotencyKey = useIdempotencyKey('inquiry');

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: [] }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = inquirySchema.safeParse({
      ...draft,
      email: draft.email || undefined,
      source: 'CONTACT',
      relatedSlug: relatedSlug || undefined,
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
      const res = await api.submitInquiry(parsed.data);
      clearIdempotencyKey('inquiry');
      setDone({ ref: res.inquiry.ref, whatsappUrl: res.whatsappUrl });
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
        <span className="chip-volt">Message sent</span>
        <h2 className="mt-5 font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
          {done.ref}
        </h2>
        <p className="mt-5 text-[14.5px] leading-relaxed text-steel">
          Your message is ready to send on WhatsApp. We usually reply within a couple of hours during
          working days — sooner if you send it as a WhatsApp message.
        </p>
        <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-8">
          Open WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="border border-hairline bg-gunmetal p-6 md:p-9">
      <h2 className="font-mono text-[10px] uppercase tracking-technical text-volt">
        Send us a message
      </h2>

      <div className="mt-7 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="inq-name" className="field-label">Your name</label>
            <input id="inq-name" value={draft.name} onChange={(e) => set('name', e.target.value)} className="field" autoComplete="name" required />
            {errors.name?.[0] && <p className="field-error">{errors.name[0]}</p>}
          </div>
          <div>
            <label htmlFor="inq-phone" className="field-label">Phone number</label>
            <input id="inq-phone" type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0803 000 0000" className="field" autoComplete="tel" required />
            {errors.phone?.[0] && <p className="field-error">{errors.phone[0]}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="inq-email" className="field-label">
            Email <span className="text-slate/60">(optional)</span>
          </label>
          <input id="inq-email" type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} className="field" autoComplete="email" />
          {errors.email?.[0] && <p className="field-error">{errors.email[0]}</p>}
        </div>

        <div>
          <label htmlFor="inq-subject" className="field-label">Subject</label>
          <input
            id="inq-subject"
            value={draft.subject}
            onChange={(e) => set('subject', e.target.value)}
            placeholder="e.g. Do you stock 32GB SODIMM kits?"
            className="field"
            required
          />
          {errors.subject?.[0] && <p className="field-error">{errors.subject[0]}</p>}
        </div>

        <div>
          <label htmlFor="inq-message" className="field-label">Message</label>
          <textarea
            id="inq-message"
            value={draft.message}
            onChange={(e) => set('message', e.target.value)}
            rows={6}
            placeholder="Tell us what you need. If it is about a machine, include the model number and what it is doing."
            className="field resize-y"
            required
          />
          {errors.message?.[0] && <p className="field-error">{errors.message[0]}</p>}
        </div>

        {failure && (
          <div className="border border-crimson/40 bg-crimson/[0.05] p-4" role="alert">
            <p className="text-[13.5px] text-chalk">{failure}</p>
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
          {submitting ? 'Sending…' : 'Send message'}
        </button>

        <p className="text-center text-[11px] leading-relaxed text-slate">
          Your message is also opened in WhatsApp so you can send it directly and get a faster reply.
        </p>
      </div>
    </form>
  );
};
