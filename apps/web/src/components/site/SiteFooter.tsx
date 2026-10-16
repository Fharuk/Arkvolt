import Link from 'next/link';
import type { StoreSettings } from '@arkvolt/shared';
import { Wordmark } from '@/components/brand/Mark';

const COLUMNS = [
  {
    title: 'Store',
    links: [
      { href: '/store', label: 'All products' },
      { href: '/store?kind=PART', label: 'Components' },
      { href: '/store?kind=SOFTWARE', label: 'Software & utilities' },
      { href: '/cart', label: 'Your cart' },
    ],
  },
  {
    title: 'Repairs',
    links: [
      { href: '/repairs', label: 'What we fix' },
      { href: '/book', label: 'Book an appointment' },
      { href: '/repairs#pricing', label: 'Service pricing' },
      { href: '/repairs#process', label: 'How it works' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { href: '/titles', label: 'Title setup requests' },
      { href: '/about', label: 'About Arkvolt' },
      { href: '/contact', label: 'Contact us' },
      { href: '/order', label: 'Track an order' },
    ],
  },
];

export const SiteFooter = ({ settings }: { settings: StoreSettings }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="noise relative mt-0 border-t border-hairline bg-gunmetal">
      {/* A hairline across the top edge, with a single volt segment marking the
          start — the site's quietest signature, and the last thing you see on
          every page. A rule, not a glow. */}
      <div className="relative h-px w-full bg-hairline-strong" aria-hidden>
        <span className="absolute left-0 top-0 h-px w-24 bg-volt" />
      </div>

      <div className="shell py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Wordmark showTagline />
            <p className="mt-6 text-[14px] leading-relaxed text-steel">
              {settings.tagline || 'Software supply and hardware repair for machines that have to work.'}
            </p>

            <dl className="mt-8 space-y-3">
              {settings.supportPhone && (
                <div className="flex gap-4">
                  <dt className="label-tech w-16 shrink-0 pt-1">Phone</dt>
                  <dd>
                    <a href={`tel:${settings.supportPhone.replace(/\s/g, '')}`} className="text-[13px] text-chalk hover:text-volt">
                      {settings.supportPhone}
                    </a>
                  </dd>
                </div>
              )}
              {settings.supportEmail && (
                <div className="flex gap-4">
                  <dt className="label-tech w-16 shrink-0 pt-1">Email</dt>
                  <dd>
                    <a href={`mailto:${settings.supportEmail}`} className="text-[13px] text-chalk hover:text-volt">
                      {settings.supportEmail}
                    </a>
                  </dd>
                </div>
              )}
              {settings.workshopAddress && (
                <div className="flex gap-4">
                  <dt className="label-tech w-16 shrink-0 pt-1">Workshop</dt>
                  <dd className="text-[13px] leading-relaxed text-steel">{settings.workshopAddress}</dd>
                </div>
              )}
              {settings.workshopHours && (
                <div className="flex gap-4">
                  <dt className="label-tech w-16 shrink-0 pt-1">Hours</dt>
                  <dd className="text-[13px] leading-relaxed text-steel">{settings.workshopHours}</dd>
                </div>
              )}
            </dl>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="label-tech mb-5 text-volt">{col.title}</h3>
              <ul className="space-y-3.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="link-underline text-[13px] text-steel transition-colors hover:text-chalk"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-hairline pt-8 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-technical text-slate">
            © {year} {settings.storeName} · Lagos, Nigeria
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {settings.socials.map((social) => (
              <a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] uppercase tracking-technical text-slate transition-colors hover:text-volt"
              >
                {social.label}
              </a>
            ))}
            <Link
              href="/admin"
              className="font-mono text-[10px] uppercase tracking-technical text-slate/50 transition-colors hover:text-steel"
            >
              Admin
            </Link>
          </div>
        </div>

        {/* Honest, plainly worded, and it protects the business. */}
        <p className="mt-10 max-w-3xl border-t border-hairline pt-8 text-[11px] leading-relaxed text-slate/70">
          {settings.storeName} sells installation and repair services, genuine licensed software, and
          hardware components. We do not sell, distribute or supply cracked, pirated or unauthorised
          copies of any software. Where a customer asks us to prepare a machine for a title, the
          customer provides their own licensed copy and we are paid for our time and expertise. All
          prices are confirmed in writing before work begins.
        </p>
      </div>
    </footer>
  );
};
