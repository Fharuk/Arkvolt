import type { Metadata, Viewport } from 'next';
import { fontVars } from '@/lib/fonts';
import { CartProvider } from '@/lib/cart';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { api } from '@/lib/api';
import type { StoreSettings } from '@arkvolt/shared';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#08090B',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arkvolt.ng'),
  title: {
    default: 'ARKVOLT — Software supply and hardware repair',
    template: '%s · ARKVOLT',
  },
  description:
    'Software, components and expert hardware repair in Lagos. Every price confirmed in writing before work starts. Same-day diagnostics on weekdays.',
  keywords: [
    'computer repair Lagos',
    'PC upgrade Lagos',
    'NVMe fitting Nigeria',
    'laptop repaste Lagos',
    'hardware engineer Lagos',
    'computer workshop Ikeja',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    siteName: 'ARKVOLT',
    title: 'ARKVOLT — Software supply and hardware repair',
    description: 'Software, components and expert hardware repair in Lagos.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-icon.png',
  },
};

/**
 * Settings are read once in the root layout and passed to both the header
 * and the footer, so the phone number, workshop hours and announcement bar
 * are consistent everywhere and editable from the dashboard.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let settings: StoreSettings;
  try {
    settings = await api.settings();
  } catch {
    // The storefront must render even if the API is cold-starting on Render.
    settings = {
      storeName: 'ARKVOLT',
      tagline: 'Software supply and hardware repair for machines that have to work.',
      whatsappNumber: '2349030438653',
      supportPhone: '',
      supportEmail: '',
      workshopAddress: 'Computer Village, Ikeja, Lagos',
      workshopHours: 'Mon–Sat, 09:00–19:00 WAT',
      announcement: null,
      announcementEnabled: false,
      bankDetails: null,
      deliveryFeeKobo: 0,
      freeDeliveryThresholdKobo: 0,
      currency: 'NGN',
      socials: [],
    };
  }

  return (
    <html lang="en-NG" className={fontVars}>
      <body className="min-h-screen bg-void text-chalk">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:border focus:border-volt focus:bg-void focus:px-5 focus:py-3 focus:font-mono focus:text-[11px] focus:uppercase focus:tracking-technical focus:text-volt"
        >
          Skip to content
        </a>

        <CartProvider>
          <SiteHeader settings={settings} />
          <main id="main">{children}</main>
          <SiteFooter settings={settings} />
        </CartProvider>
      </body>
    </html>
  );
}
