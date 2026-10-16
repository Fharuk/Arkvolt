'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import type { CartLine } from '@arkvolt/shared';

/* ------------------------------------------------------------------ *
 * Cart
 *
 * Deliberately client-side and credential-free: there is no customer
 * account in this system, so a server-side cart would be a session store
 * with nothing to attach it to. The cart is a list of ids and quantities
 * in localStorage. Prices are never trusted from here — the API re-reads
 * every price and stock level at checkout.
 * ------------------------------------------------------------------ */

const STORAGE_KEY = 'arkvolt.cart.v1';
const MAX_QTY = 20;

interface CartState {
  lines: CartLine[];
}

type Action =
  | { type: 'hydrate'; lines: CartLine[] }
  | { type: 'add'; line: CartLine }
  | { type: 'setQty'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' }
  | { type: 'refresh'; lines: CartLine[] };

const reducer = (state: CartState, action: Action): CartState => {
  switch (action.type) {
    case 'hydrate':
    case 'refresh':
      return { lines: action.lines };

    case 'add': {
      const existing = state.lines.find((l) => l.productId === action.line.productId);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.productId === action.line.productId
              ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + action.line.quantity) }
              : l,
          ),
        };
      }
      return { lines: [...state.lines, action.line] };
    }

    case 'setQty': {
      const quantity = Math.max(0, Math.min(MAX_QTY, action.quantity));
      if (quantity === 0) return { lines: state.lines.filter((l) => l.productId !== action.productId) };
      return { lines: state.lines.map((l) => (l.productId === action.productId ? { ...l, quantity } : l)) };
    }

    case 'remove':
      return { lines: state.lines.filter((l) => l.productId !== action.productId) };

    case 'clear':
      return { lines: [] };

    default:
      return state;
  }
};

interface CartContextValue {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotalKobo: number;
  /** True once anything has been added — used to trigger the drawer. */
  justAdded: string | null;
  add: (line: CartLine) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
  dismissAdded: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, { lines: [] });
  const [ready, setReady] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  /* Hydrate after mount. Reading localStorage during render would produce a
     server/client mismatch on the cart badge. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          dispatch({ type: 'hydrate', lines: parsed as CartLine[] });
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
    } catch {
      /* Storage full or blocked — the cart still works for this page view. */
    }
  }, [state.lines, ready]);

  /* Keep the cart honest across tabs: another tab adding an item should be
     reflected here rather than silently overwritten on next write. */
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as CartLine[];
        if (Array.isArray(parsed)) dispatch({ type: 'refresh', lines: parsed });
      } catch {
        /* ignore malformed payloads */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((line: CartLine) => {
    dispatch({ type: 'add', line });
    setJustAdded(line.productId);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = state.lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotalKobo = state.lines.reduce((sum, l) => sum + l.unitPriceKobo * l.quantity, 0);

    return {
      lines: state.lines,
      ready,
      count,
      subtotalKobo,
      justAdded,
      add,
      setQuantity: (productId, quantity) => dispatch({ type: 'setQty', productId, quantity }),
      remove: (productId) => dispatch({ type: 'remove', productId }),
      clear: () => dispatch({ type: 'clear' }),
      has: (productId) => state.lines.some((l) => l.productId === productId),
      dismissAdded: () => setJustAdded(null),
    };
  }, [state.lines, ready, justAdded, add]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
};

/** Stable per-attempt key so a resubmitted checkout cannot create two orders. */
export const useIdempotencyKey = (scope: string): string => {
  const [key] = useState(() => {
    if (typeof window === 'undefined') return `${scope}-ssr`;
    const storageKey = `arkvolt.idem.${scope}`;
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const generated = `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(storageKey, generated);
    return generated;
  });
  return key;
};

export const clearIdempotencyKey = (scope: string): void => {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(`arkvolt.idem.${scope}`);
};
