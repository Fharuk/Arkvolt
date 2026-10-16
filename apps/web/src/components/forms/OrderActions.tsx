'use client';

import { useState } from 'react';

/**
 * Two deliberate affordances on an order page: open the WhatsApp thread, or
 * copy the reference. Copying is here because customers read these down the
 * phone, and a misheard character is the most common support call.
 */
export const OrderActions = ({ whatsappUrl, ref_ }: { whatsappUrl: string; ref_: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref_);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* Clipboard blocked — the reference is visible on screen anyway. */
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm w-full justify-center">
        Message about this order
      </a>
      <button type="button" onClick={copy} className="btn-ghost btn-sm w-full justify-center">
        {copied ? 'Reference copied' : 'Copy reference'}
      </button>
    </div>
  );
};
