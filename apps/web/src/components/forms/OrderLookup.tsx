'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export const OrderLookup = () => {
  const [ref, setRef] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = ref.trim().toUpperCase();
    if (value.length < 6) {
      setError('Enter the full reference.');
      return;
    }

    setChecking(true);
    setError(null);

    try {
      // Verify before navigating, so a wrong reference produces an inline
      // message rather than a dead-end page.
      const res = await fetch(`/api/orders/${encodeURIComponent(value)}`);
      const payload = (await res.json()) as { data: { order?: unknown } | null };
      if (!res.ok || !payload.data) {
        setError('No order found under that reference.');
        return;
      }
      router.push(`/order/${value}`);
    } catch {
      setError('Could not check that reference. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-hairline bg-gunmetal p-6 md:p-8" noValidate>
      <label htmlFor="order-ref" className="field-label">
        Order reference
      </label>
      <input
        id="order-ref"
        value={ref}
        onChange={(e) => {
          // Uppercase and strip spaces as the customer types — the references
          // are read off a screen and retyped, so normalise it for them.
          setRef(e.target.value.toUpperCase().replace(/\s/g, ''));
          if (error) setError(null);
        }}
        placeholder="AV-2610-KP4MWX"
        autoComplete="off"
        spellCheck={false}
        className="field font-mono text-[16px] tracking-wider"
        required
      />
      {error && <p className="field-error">{error}</p>}

      <button type="submit" disabled={checking} className="btn-primary mt-5 w-full justify-center">
        {checking ? 'Checking…' : 'Find my order'}
      </button>
    </form>
  );
};
