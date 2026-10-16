'use client';

import { useState } from 'react';
import {
  DEVICE_CATEGORIES,
  ISSUE_CATEGORIES,
  SERVICE_MODES,
  URGENCIES,
  LABELS,
  bookingSchema,
  type Service,
  type ServiceMode,
  type Urgency,
} from '@arkvolt/shared';
import { api, ApiRequestError } from '@/lib/api';
import { clearIdempotencyKey, useIdempotencyKey } from '@/lib/cart';
import { formatNaira } from '@arkvolt/shared';

/* ------------------------------------------------------------------ *
 * The booking form is a three-step wizard.
 *
 * One long form asking eleven questions loses people halfway. Splitting it
 * lets the first screen be two taps, and by the time the visitor reaches
 * their contact details they have already invested enough to finish.
 * Validation still runs against the same shared schema the API uses, so the
 * client can never send something the server will reject for a known reason.
 * ------------------------------------------------------------------ */

type Draft = {
  deviceCategory: string;
  deviceBrand: string;
  deviceModel: string;
  issueCategory: string;
  issueDescription: string;
  urgency: Urgency;
  serviceMode: ServiceMode;
  serviceId: string;
  preferredDate: string;
  preferredSlot: string;
  address: string;
  city: string;
  state: string;
  customerName: string;
  phone: string;
  email: string;
};

const INITIAL: Draft = {
  deviceCategory: 'LAPTOP',
  deviceBrand: '',
  deviceModel: '',
  issueCategory: '',
  issueDescription: '',
  urgency: 'STANDARD',
  serviceMode: 'DROP_OFF',
  serviceId: '',
  preferredDate: '',
  preferredSlot: 'Flexible',
  address: '',
  city: 'Lagos',
  state: 'Lagos',
  customerName: '',
  phone: '',
  email: '',
};

const STEP_LABELS = ['The machine', 'The fault', 'You'];

export const BookingForm = ({
  services,
  slots,
  preselectedServiceId,
}: {
  services: Service[];
  slots: string[];
  preselectedServiceId?: string;
}) => {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    ...INITIAL,
    ...(preselectedServiceId ? { serviceId: preselectedServiceId } : {}),
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ref: string; whatsappUrl: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const idempotencyKey = useIdempotencyKey('booking');

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: [] }));
  };

  /** Validate only the fields belonging to the step being left. */
  const validateStep = (index: number): boolean => {
    const full = bookingSchema.safeParse({ ...draft, idempotencyKey });
    if (full.success) return true;

    const stepFields: Record<number, string[]> = {
      0: ['deviceCategory', 'deviceBrand', 'deviceModel', 'serviceMode'],
      1: ['issueCategory', 'issueDescription', 'urgency', 'preferredDate'],
      2: ['customerName', 'phone', 'email', 'address', 'city'],
    };

    const relevant = full.error.issues.filter((issue) =>
      stepFields[index]?.includes(String(issue.path[0] ?? '')),
    );

    if (relevant.length === 0) return true;

    const next: Record<string, string[]> = {};
    for (const issue of relevant) {
      const key = String(issue.path[0] ?? '_');
      (next[key] ??= []).push(issue.message);
    }
    setErrors(next);
    return false;
  };

  const next = () => {
    if (validateStep(step)) setStep((s) => Math.min(2, s + 1));
  };

  const submit = async () => {
    const parsed = bookingSchema.safeParse({ ...draft, idempotencyKey });
    if (!parsed.success) {
      const next: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '_');
        (next[key] ??= []).push(issue.message);
      }
      setErrors(next);
      // Send the visitor to the step that actually has the problem.
      const failing = Object.keys(next);
      setStep(failing.some((f) => ['customerName', 'phone', 'email'].includes(f)) ? 2 : 1);
      return;
    }

    setSubmitting(true);
    setFailure(null);
    try {
      const res = await api.submitBooking(parsed.data);
      clearIdempotencyKey('booking');
      setResult({ ref: res.booking.ref, whatsappUrl: res.whatsappUrl });
      // Open the thread immediately — this is the completion of the action,
      // not an optional extra the visitor has to hunt for.
      window.location.href = res.whatsappUrl;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.details);
        setFailure(err.message);
      } else {
        setFailure('We could not submit that. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="border border-volt/30 bg-volt/[0.03] p-8 md:p-10">
        <span className="chip-volt">Booking received</span>
        <h2 className="mt-5 font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
          Reference {result.ref}
        </h2>
        <p className="mt-5 max-w-lg text-[14.5px] leading-relaxed text-steel">
          Your details are ready to send to the workshop on WhatsApp. If the tab did not open, use the
          button below. Quote the reference above in any message about this job.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Open WhatsApp
          </a>
          <a href={`tel:+2349030438653`} className="btn-ghost">
            Call instead
          </a>
        </div>
        <p className="mt-8 border-t border-hairline pt-6 font-mono text-[10px] uppercase tracking-technical text-slate">
          Bookmark this reference — it is how we find your job
        </p>
      </div>
    );
  }

  const isRemote = draft.serviceMode === 'REMOTE';

  return (
    <div>
      {/* Step rail */}
      <ol className="mb-px grid grid-cols-3 gap-px bg-hairline" aria-label="Progress">
        {STEP_LABELS.map((label, i) => {
          const state = i === step ? 'current' : i < step ? 'done' : 'todo';
          return (
            <li key={label} className="bg-void">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={state === 'current'}
                className="flex w-full flex-col gap-2 p-5 text-left disabled:cursor-default"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      state === 'todo' ? 'text-slate' : 'text-volt'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {state === 'done' && (
                    <svg viewBox="0 0 16 16" className="h-3 w-3 text-volt" fill="none" aria-hidden>
                      <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  )}
                </span>
                <span
                  className={`font-display text-[17px] uppercase tracking-display ${
                    state === 'current' ? 'text-chalk' : 'text-slate'
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`h-px w-full transition-colors ${state === 'todo' ? 'bg-hairline' : 'bg-volt'}`}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ol>

      <div className="border border-hairline border-t-0 bg-gunmetal p-6 md:p-9">
        {/* ---------------- STEP 1 ---------------- */}
        {step === 0 && (
          <div className="animate-fade-up space-y-8">
            <fieldset>
              <legend className="field-label">What kind of machine is it?</legend>
              <div className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-3 lg:grid-cols-5">
                {DEVICE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => set('deviceCategory', cat)}
                    aria-pressed={draft.deviceCategory === cat}
                    className={`p-4 text-left transition-colors duration-200 ${
                      draft.deviceCategory === cat
                        ? 'bg-volt/10 text-chalk'
                        : 'bg-void text-steel hover:bg-plate hover:text-chalk'
                    }`}
                  >
                    <span className="block text-[12.5px] leading-tight">{LABELS.DeviceCategory[cat]}</span>
                    {draft.deviceCategory === cat && <span className="mt-2 block h-px w-full bg-volt" aria-hidden />}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="brand" className="field-label">
                  Make
                </label>
                <input
                  id="brand"
                  value={draft.deviceBrand}
                  onChange={(e) => set('deviceBrand', e.target.value)}
                  placeholder="HP, Dell, Lenovo, custom build…"
                  className="field"
                  autoComplete="off"
                />
                {errors.deviceBrand?.[0] && <p className="field-error">{errors.deviceBrand[0]}</p>}
              </div>
              <div>
                <label htmlFor="model" className="field-label">
                  Model number
                </label>
                <input
                  id="model"
                  value={draft.deviceModel}
                  onChange={(e) => set('deviceModel', e.target.value)}
                  placeholder="e.g. Pavilion 15-cs3055cl"
                  className="field"
                  autoComplete="off"
                />
                {errors.deviceModel?.[0] && <p className="field-error">{errors.deviceModel[0]}</p>}
                <p className="mt-2 text-[11px] leading-relaxed text-slate">
                  On the sticker underneath, or in Settings → System → About.
                </p>
              </div>
            </div>

            <fieldset>
              <legend className="field-label">How should we handle it?</legend>
              <div className="grid gap-px bg-hairline sm:grid-cols-2">
                {SERVICE_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => set('serviceMode', mode)}
                    aria-pressed={draft.serviceMode === mode}
                    className={`p-4 text-left transition-colors duration-200 ${
                      draft.serviceMode === mode ? 'bg-volt/10 text-chalk' : 'bg-void text-steel hover:bg-plate hover:text-chalk'
                    }`}
                  >
                    <span className="block text-[13px]">{LABELS.ServiceMode[mode]}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="service" className="field-label">
                Service package <span className="text-slate/60">(optional — we can advise on arrival)</span>
              </label>
              <select
                id="service"
                value={draft.serviceId}
                onChange={(e) => set('serviceId', e.target.value)}
                className="field appearance-none bg-plate"
              >
                <option value="">Not sure — recommend one for me</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.priceType === 'QUOTE' ? 'quoted on assessment' : formatNaira(s.priceKobo)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ---------------- STEP 2 ---------------- */}
        {step === 1 && (
          <div className="animate-fade-up space-y-8">
            <fieldset>
              <legend className="field-label">What is it doing?</legend>
              <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-2">
                {ISSUE_CATEGORIES.map((issue) => (
                  <button
                    key={issue}
                    type="button"
                    onClick={() => set('issueCategory', issue)}
                    aria-pressed={draft.issueCategory === issue}
                    className={`p-3.5 text-left text-[13px] transition-colors duration-200 ${
                      draft.issueCategory === issue
                        ? 'bg-volt/10 text-chalk'
                        : 'bg-void text-steel hover:bg-plate hover:text-chalk'
                    }`}
                  >
                    {LABELS.IssueCategory[issue]}
                  </button>
                ))}
              </div>
              {errors.issueCategory?.[0] && <p className="field-error">{errors.issueCategory[0]}</p>}
            </fieldset>

            <div>
              <label htmlFor="description" className="field-label">
                Describe it in your own words
              </label>
              <textarea
                id="description"
                value={draft.issueDescription}
                onChange={(e) => set('issueDescription', e.target.value)}
                rows={5}
                placeholder="When did it start? Does it happen every time, or under particular conditions? Any recent changes, spills, drops or power surges?"
                className="field resize-y"
              />
              {errors.issueDescription?.[0] ? (
                <p className="field-error">{errors.issueDescription[0]}</p>
              ) : (
                <p className="mt-2 text-[11px] leading-relaxed text-slate">
                  The more specific you are here, the more accurate the initial quote — and the fewer
                  surprises on the bench.
                </p>
              )}
            </div>

            <fieldset>
              <legend className="field-label">How urgent is it?</legend>
              <div className="grid gap-px bg-hairline sm:grid-cols-3">
                {URGENCIES.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => set('urgency', u)}
                    aria-pressed={draft.urgency === u}
                    className={`p-4 text-left transition-colors duration-200 ${
                      draft.urgency === u ? 'bg-volt/10 text-chalk' : 'bg-void text-steel hover:bg-plate hover:text-chalk'
                    }`}
                  >
                    <span className="block text-[13px]">{LABELS.Urgency[u]}</span>
                    <span className="mt-1.5 block text-[11px] leading-snug text-slate">
                      {u === 'STANDARD'
                        ? 'Normal queue, no rush'
                        : u === 'PRIORITY'
                          ? 'Move it up the queue'
                          : 'Business stopped — call me first'}
                    </span>
                  </button>
                ))}
              </div>
              {draft.urgency === 'EMERGENCY' && (
                <p className="mt-3 border-t border-hairline pt-3 text-[12px] leading-relaxed text-amber">
                  Emergency jobs are accepted subject to capacity and carry a priority rate. We will
                  confirm whether we can take it before you bring it in.
                </p>
              )}
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="date" className="field-label">
                  Preferred date <span className="text-slate/60">(optional)</span>
                </label>
                <input
                  id="date"
                  type="date"
                  value={draft.preferredDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set('preferredDate', e.target.value)}
                  className="field [color-scheme:dark]"
                />
              </div>
              <div>
                <label htmlFor="slot" className="field-label">
                  Preferred time
                </label>
                <select
                  id="slot"
                  value={draft.preferredSlot}
                  onChange={(e) => set('preferredSlot', e.target.value)}
                  className="field appearance-none bg-plate"
                >
                  {slots.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- STEP 3 ---------------- */}
        {step === 2 && (
          <div className="animate-fade-up space-y-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="field-label">
                  Full name
                </label>
                <input
                  id="name"
                  value={draft.customerName}
                  onChange={(e) => set('customerName', e.target.value)}
                  className="field"
                  autoComplete="name"
                />
                {errors.customerName?.[0] && <p className="field-error">{errors.customerName[0]}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="field-label">
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="0803 000 0000"
                  className="field"
                  autoComplete="tel"
                />
                {errors.phone?.[0] ? (
                  <p className="field-error">{errors.phone[0]}</p>
                ) : (
                  <p className="mt-2 text-[11px] text-slate">This is the number we will message you on.</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="field-label">
                Email <span className="text-slate/60">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={draft.email}
                onChange={(e) => set('email', e.target.value)}
                className="field"
                autoComplete="email"
              />
              {errors.email?.[0] && <p className="field-error">{errors.email[0]}</p>}
            </div>

            {!isRemote && (
              <div className="animate-fade-up space-y-5 border-t border-hairline pt-8">
                <p className="label-tech">
                  {draft.serviceMode === 'ONSITE' ? 'Where should we come?' : 'Your location'}
                </p>

                <div>
                  <label htmlFor="address" className="field-label">
                    Street address
                  </label>
                  <input
                    id="address"
                    value={draft.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="House number, street, landmark"
                    className="field"
                    autoComplete="street-address"
                  />
                  {errors.address?.[0] && <p className="field-error">{errors.address[0]}</p>}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="city" className="field-label">
                      City / area
                    </label>
                    <input
                      id="city"
                      value={draft.city}
                      onChange={(e) => set('city', e.target.value)}
                      className="field"
                      autoComplete="address-level2"
                    />
                    {errors.city?.[0] && <p className="field-error">{errors.city[0]}</p>}
                  </div>
                  <div>
                    <label htmlFor="state" className="field-label">
                      State
                    </label>
                    <input
                      id="state"
                      value={draft.state}
                      onChange={(e) => set('state', e.target.value)}
                      className="field"
                      autoComplete="address-level1"
                    />
                  </div>
                </div>

                {draft.serviceMode === 'COURIER' && (
                  <p className="text-[12px] leading-relaxed text-steel">
                    We will send the courier details on WhatsApp once the slot is confirmed. Do not
                    dispatch anything before you hear from us.
                  </p>
                )}
              </div>
            )}

            {/* Review — the visitor should see exactly what they are sending. */}
            <div className="border border-hairline bg-void p-5">
              <p className="label-tech">Review</p>
              <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {[
                  ['Device', `${LABELS.DeviceCategory[draft.deviceCategory as keyof typeof LABELS.DeviceCategory]} · ${draft.deviceBrand} ${draft.deviceModel}`],
                  ['Fault', draft.issueCategory ? LABELS.IssueCategory[draft.issueCategory as keyof typeof LABELS.IssueCategory] : '—'],
                  ['Priority', LABELS.Urgency[draft.urgency]],
                  ['Handling', LABELS.ServiceMode[draft.serviceMode]],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <dt className="label-tech w-20 shrink-0 pt-0.5">{k}</dt>
                    <dd className="text-[12.5px] leading-snug text-chalk">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {failure && (
              <div className="border border-crimson/40 bg-crimson/[0.05] p-4" role="alert">
                <p className="text-[13px] text-chalk">{failure}</p>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="mt-9 flex items-center justify-between gap-4 border-t border-hairline pt-7">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-quiet">
              ← Back
            </button>
          ) : (
            <span />
          )}

          {step < 2 ? (
            <button type="button" onClick={next} className="btn-primary min-w-[160px]">
              Continue
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting} className="btn-primary min-w-[220px]">
              {submitting ? 'Submitting…' : 'Submit & open WhatsApp'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
