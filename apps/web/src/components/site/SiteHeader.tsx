'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { StoreSettings } from '@arkvolt/shared';
import { Wordmark } from '@/components/brand/Mark';
import { useCart } from '@/lib/cart';
import { CartDrawer } from '@/components/site/CartDrawer';

const NAV = [
  { href: '/store', label: 'Store', index: '01' },
  { href: '/repairs', label: 'Repairs', index: '02' },
  { href: '/titles', label: 'Titles', index: '03' },
  { href: '/book', label: 'Book', index: '04' },
  { href: '/about', label: 'About', index: '05' },
  { href: '/contact', label: 'Contact', index: '06' },
];

const SETTINGS_FALLBACK_WHATSAPP = '2349030438653';

export const SiteHeader = ({ settings }: { settings: StoreSettings }) => {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const [open, setOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /* The header gains a backdrop and a hairline only once the page has moved.
     At the top of the document it sits flush against the hero, which reads
     cleaner than a permanent bar. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Route change closes the mobile sheet and restores scroll. */
  useEffect(() => {
    setOpen(false);
    setCartOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open || cartOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, cartOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setCartOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* The dashboard is a tool, not a page of the storefront: it gets no
     marketing chrome. */
  if (pathname?.startsWith('/admin')) return null;

  const whatsapp = settings.whatsappNumber || SETTINGS_FALLBACK_WHATSAPP;
  const showAnnouncement = settings.announcementEnabled && settings.announcement;

  return (
    <>
      {showAnnouncement && (
        <div className="noise relative border-b border-hairline bg-gunmetal">
          <div className="shell flex h-9 items-center justify-center gap-3">
            <span className="h-1 w-1 shrink-0 animate-signal-pulse bg-volt" aria-hidden />
            <p className="truncate font-mono text-[10px] uppercase tracking-technical text-steel">
              {settings.announcement}
            </p>
          </div>
        </div>
      )}

      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ease-mechanical ${
          scrolled ? 'border-b border-hairline bg-void/88 backdrop-blur-md' : 'border-b border-transparent'
        }`}
      >
        <div className="shell flex h-[68px] items-center justify-between gap-6">
          <Link href="/" className="shrink-0" aria-label="ARKVOLT — home">
            <Wordmark />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative px-4 py-2.5 font-mono text-[11px] uppercase tracking-technical transition-colors duration-200 ${
                    active ? 'text-volt' : 'text-steel hover:text-chalk'
                  }`}
                >
                  <span className="mr-1.5 text-[9px] text-slate/60">{item.index}</span>
                  {item.label}
                  <span
                    className={`absolute inset-x-4 bottom-1 h-px bg-volt transition-transform duration-300 ease-mechanical ${
                      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                    aria-hidden
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="group relative flex h-10 items-center gap-2.5 border border-hairline px-3.5 transition-colors duration-200 hover:border-hairline-strong sm:px-4"
              aria-label={`Open cart${count > 0 ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4 text-steel transition-colors group-hover:text-chalk" fill="none" aria-hidden>
                <path d="M3 5h2l1.6 8.4A1 1 0 0 0 7.58 14h7.2a1 1 0 0 0 .98-.8L17 7H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
                <circle cx="8" cy="17" r="1.2" fill="currentColor" />
                <circle cx="15" cy="17" r="1.2" fill="currentColor" />
              </svg>
              <span className="hidden font-mono text-[10px] uppercase tracking-technical text-steel sm:inline">
                Cart
              </span>
              {/* Renders empty until hydration completes, so the badge cannot
                  flash a stale count on first paint. */}
              <span
                className={`min-w-[20px] border border-volt/40 px-1 text-center font-mono text-[10px] tabular-nums text-volt transition-opacity ${
                  ready && count > 0 ? 'opacity-100' : 'opacity-0'
                }`}
                aria-hidden
              >
                {ready ? count : 0}
              </span>
            </button>

            <Link
              href="/book"
              className="hidden h-10 items-center border border-volt bg-volt px-5 font-mono text-[10px] uppercase tracking-technical text-void transition-colors duration-200 hover:bg-transparent hover:text-volt md:inline-flex"
            >
              Book a repair
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center border border-hairline text-steel transition-colors hover:border-hairline-strong hover:text-chalk lg:hidden"
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              <span className="relative block h-3 w-4" aria-hidden>
                <span
                  className={`absolute left-0 block h-px w-full bg-current transition-transform duration-300 ease-mechanical ${
                    open ? 'top-1.5 rotate-45' : 'top-0'
                  }`}
                />
                <span
                  className={`absolute left-0 top-1.5 block h-px w-full bg-current transition-opacity duration-200 ${
                    open ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`absolute left-0 block h-px w-full bg-current transition-transform duration-300 ease-mechanical ${
                    open ? 'top-1.5 -rotate-45' : 'top-3'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sheet */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-void/80 backdrop-blur-sm transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute inset-x-0 top-[68px] border-y border-hairline bg-gunmetal transition-transform duration-400 ease-mechanical ${
            open ? 'translate-y-0' : '-translate-y-[calc(100%+80px)]'
          }`}
        >
          <nav aria-label="Mobile" className="shell flex flex-col py-2">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-baseline justify-between border-b border-hairline py-4 last:border-b-0"
                >
                  <span className="flex items-baseline gap-4">
                    <span className="font-mono text-[10px] tabular-nums text-slate">{item.index}</span>
                    <span
                      className={`font-display text-3xl font-semibold uppercase tracking-display ${
                        active ? 'text-volt' : 'text-chalk'
                      }`}
                    >
                      {item.label}
                    </span>
                  </span>
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-slate" fill="none" aria-hidden>
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </Link>
              );
            })}
            <div className="grid grid-cols-2 gap-3 py-5">
              <Link href="/book" className="btn-primary justify-center">
                Book a repair
              </Link>
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost justify-center"
              >
                WhatsApp
              </a>
            </div>
          </nav>
        </div>
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} settings={settings} />
    </>
  );
};
