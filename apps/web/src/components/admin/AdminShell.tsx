'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminApi, type AdminUserSummary } from '@/lib/api';
import { Wordmark } from '@/components/brand/Mark';

const NAV = [
  { href: '/admin', label: 'Overview', icon: 'grid' },
  { href: '/admin/orders', label: 'Orders', icon: 'box' },
  { href: '/admin/bookings', label: 'Repairs', icon: 'wrench' },
  { href: '/admin/products', label: 'Products', icon: 'tag' },
  { href: '/admin/services', label: 'Services', icon: 'layers' },
  { href: '/admin/inquiries', label: 'Enquiries', icon: 'mail' },
  { href: '/admin/titles', label: 'Title index', icon: 'list' },
  { href: '/admin/settings', label: 'Settings', icon: 'sliders' },
  { href: '/admin/audit', label: 'Activity log', icon: 'clock' },
] as const;

const ICONS: Record<string, string> = {
  grid: 'M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z',
  box: 'M10 2 3 5v10l7 3 7-3V5l-7-3ZM3 5l7 3 7-3M10 8v10',
  wrench: 'M14 4a4 4 0 0 1-5 5L4 14l-1 3 3-1 5-5a4 4 0 0 1 5-5l-3 1-1-1 1-3Z',
  tag: 'M3 3h8l6 6-8 8-6-6V3Zm3 3v.01',
  layers: 'M10 2 2 6l8 4 8-4-8-4ZM2 10l8 4 8-4M2 14l8 4 8-4',
  mail: 'M2 5h16v10H2zM2 5l8 6 8-6',
  list: 'M3 5h14M3 10h14M3 15h9',
  sliders: 'M3 5h10M15 5h2M3 10h4M9 10h8M3 15h12M17 15h0',
  clock: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM10 6v4l3 2',
};

/**
 * AdminShell handles the whole session lifecycle: it resolves the current
 * user on mount, redirects to the login screen when the session is missing
 * or expired, and only then renders the chrome. Nothing inside the dashboard
 * has to think about authentication.
 */
export const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUserSummary | null>(null);
  const [state, setState] = useState<'checking' | 'ready' | 'out'>('checking');
  const [navOpen, setNavOpen] = useState(false);

  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (isLogin) {
      setState('ready');
      return;
    }

    let cancelled = false;
    adminApi
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setState('out');
        router.replace(`/admin/login?next=${encodeURIComponent(pathname ?? '/admin')}`);
      });

    return () => {
      cancelled = true;
    };
  }, [isLogin, pathname, router]);

  useEffect(() => setNavOpen(false), [pathname]);

  const logout = async () => {
    try {
      await adminApi.logout();
    } finally {
      router.replace('/admin/login');
    }
  };

  if (isLogin) return <>{children}</>;

  if (state !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-5">
          <span className="h-1.5 w-1.5 animate-signal-pulse bg-volt" />
          <p className="font-mono text-[10px] uppercase tracking-technical text-slate">
            {state === 'checking' ? 'Verifying session' : 'Redirecting to sign in'}
          </p>
        </div>
      </div>
    );
  }

  const navItems = (
    <nav aria-label="Dashboard">
      <ul className="space-y-px">
        {NAV.map((item) => {
          const active =
            item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center gap-3.5 border-l-2 px-4 py-3 transition-colors duration-200 ${
                  active
                    ? 'border-volt bg-plate text-chalk'
                    : 'border-transparent text-steel hover:border-hairline-strong hover:bg-plate/60 hover:text-chalk'
                }`}
              >
                <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 ${active ? 'text-volt' : 'text-slate'}`} fill="none" aria-hidden>
                  <path d={ICONS[item.icon]} stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="round" />
                </svg>
                <span className="font-mono text-[11px] uppercase tracking-technical">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <div className="min-h-screen bg-void">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-void/95 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-4 px-5 lg:px-8">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center border border-hairline text-steel lg:hidden"
              aria-label="Toggle navigation"
              aria-expanded={navOpen}
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>

            <Link href="/admin" className="flex items-center gap-3">
              <Wordmark />
            </Link>

            <span className="hidden border border-hairline px-2.5 py-1 font-mono text-[9px] uppercase tracking-technical text-slate md:inline">
              Control panel
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="hidden font-mono text-[10px] uppercase tracking-technical text-slate transition-colors hover:text-chalk sm:inline"
            >
              View store ↗
            </Link>

            <div className="hidden text-right sm:block">
              <p className="font-mono text-[10px] uppercase tracking-technical text-chalk">{user?.name}</p>
              <p className="font-mono text-[9px] text-slate">{user?.email}</p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex h-9 items-center border border-hairline px-3.5 font-mono text-[10px] uppercase tracking-technical text-steel transition-colors hover:border-hairline-strong hover:text-chalk"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — desktop */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[248px] shrink-0 overflow-y-auto border-r border-hairline py-6 lg:block">
          {navItems}

          <div className="mx-4 mt-8 border-t border-hairline pt-6">
            <p className="font-mono text-[9px] uppercase tracking-technical text-slate">Signed in as</p>
            <p className="mt-1.5 truncate font-mono text-[10px] text-steel">{user?.email}</p>
            {user?.lastLoginAt && (
              <p className="mt-1 font-mono text-[9px] text-slate/70">
                Last seen {new Date(user.lastLoginAt).toLocaleDateString('en-NG')}
              </p>
            )}
          </div>
        </aside>

        {/* Sidebar — mobile sheet */}
        {navOpen && (
          <div className="fixed inset-0 top-16 z-30 lg:hidden">
            <div className="absolute inset-0 bg-void/85 backdrop-blur-sm" onClick={() => setNavOpen(false)} />
            <div className="relative h-full w-[280px] overflow-y-auto border-r border-hairline bg-gunmetal py-6">
              {navItems}
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
};
