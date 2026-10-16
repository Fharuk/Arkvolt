import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · ARKVOLT Admin' },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The dashboard has its own layout, deliberately without the storefront
 * header and footer: it is a tool, and mixing marketing chrome into a tool
 * makes it slower to use.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
