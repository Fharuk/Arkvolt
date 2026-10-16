'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi, ApiRequestError } from '@/lib/api';
import { Mark } from '@/components/brand/Mark';

const LoginForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [setupNote, setSetupNote] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);

  /**
   * A fresh deployment has no administrator. Rather than leaving the operator
   * stuck on a form they cannot pass, the first-run path is offered here — it
   * is the only place in the dashboard that can be reached without a session,
   * and the API refuses it the moment an account exists.
   */
  const bootstrap = async () => {
    setBootstrapping(true);
    setSetupNote(null);
    try {
      const { user } = await adminApi.bootstrap();
      setEmail(user.email);
      setSetupNote('Administrator created. Sign in with the password you set as ADMIN_PASSWORD on the server, then change it from Settings.');
    } catch (err) {
      setSetupNote(err instanceof ApiRequestError ? err.message : 'Could not reach the server.');
    } finally {
      setBootstrapping(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await adminApi.login(email, password);
      router.replace(next.startsWith('/admin') ? next : '/admin');
      // A full refresh clears any stale server-rendered dashboard state.
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : 'Could not reach the server. Check the API is running and try again.',
      );
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      {/* Left: form */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px]">
          <Link href="/" className="inline-flex items-center gap-3">
            <Mark className="h-9 w-9 text-chalk" />
            <span className="font-display text-[22px] font-bold uppercase tracking-[0.02em] text-chalk">
              Arkvolt
            </span>
          </Link>

          <h1 className="mt-12 font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
            Control panel
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-steel">
            Sign in to manage the catalogue, orders, repair bookings and settings.
          </p>

          <form onSubmit={submit} className="mt-10 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="field-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="border border-crimson/40 bg-crimson/[0.05] p-4" role="alert">
                <p className="text-[13px] text-chalk">{error}</p>
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <details className="mt-8 border border-hairline bg-gunmetal/50">
            <summary className="cursor-pointer px-4 py-3 font-mono text-[10px] uppercase tracking-technical text-slate transition-colors hover:text-chalk">
              First deployment?
            </summary>
            <div className="border-t border-hairline px-4 py-4">
              <p className="text-[11.5px] leading-relaxed text-steel">
                If this deployment has no administrator yet, one is created from the
                <span className="font-mono text-[11px] text-chalk"> ADMIN_EMAIL </span>
                and
                <span className="font-mono text-[11px] text-chalk"> ADMIN_PASSWORD </span>
                configured on the API. This closes permanently once an account exists.
              </p>
              <button
                type="button"
                onClick={() => void bootstrap()}
                disabled={bootstrapping}
                className="btn-ghost btn-sm mt-4"
              >
                {bootstrapping ? 'Creating…' : 'Create the first administrator'}
              </button>
              {setupNote && (
                <p className="mt-3 border border-volt/30 bg-volt/[0.04] px-3 py-2.5 text-[11.5px] leading-relaxed text-chalk" role="status">
                  {setupNote}
                </p>
              )}
            </div>
          </details>

          <p className="mt-6 border-t border-hairline pt-6 text-[11px] leading-relaxed text-slate">
            Sessions last twelve hours and are stored in an httpOnly cookie, so they cannot be read by
            scripts on this page. Failed attempts are recorded in the activity log.
          </p>

          <Link
            href="/"
            className="mt-6 inline-block font-mono text-[10px] uppercase tracking-technical text-slate transition-colors hover:text-chalk"
          >
            ← Back to the store
          </Link>
        </div>
      </div>

      {/* Right: a quiet technical panel. No stock photo, no gradient. */}
      <div className="noise relative hidden overflow-hidden border-l border-hairline bg-gunmetal lg:block">
        <div className="grid-field absolute inset-0 opacity-60" aria-hidden />

        <div className="relative z-[2] flex h-full flex-col justify-center px-14">
          <p className="eyebrow">Internal tooling</p>

          <h2 className="mt-6 max-w-md font-display text-[46px] font-bold uppercase leading-[0.95] tracking-display text-chalk">
            Everything the workshop runs on
          </h2>

          <dl className="mt-12 grid max-w-md grid-cols-2 gap-px bg-hairline">
            {[
              ['Catalogue', 'Products, services, categories'],
              ['Orders', 'Pipeline and payment status'],
              ['Repairs', 'Bookings, technicians, queue'],
              ['Titles', 'Setup request index'],
              ['Settings', 'WhatsApp, delivery, storefront'],
              ['Activity log', 'Every change, attributed'],
            ].map(([k, v]) => (
              <div key={k} className="bg-void p-5">
                <dt className="font-mono text-[10px] uppercase tracking-technical text-volt">{k}</dt>
                <dd className="mt-2 text-[12px] leading-snug text-steel">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-void">
          <span className="h-1.5 w-1.5 animate-signal-pulse bg-volt" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
