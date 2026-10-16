import type { Metadata } from 'next';
import Link from 'next/link';
import { OrderLookup } from '@/components/forms/OrderLookup';
import { SectionHeading } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Track an order',
  description: 'Enter your order reference to see its current status.',
};

export default function OrderLookupPage() {
  return (
    <section className="shell py-20 md:py-28">
      <div className="mx-auto max-w-xl">
        <SectionHeading
          index="01"
          eyebrow="Order tracking"
          title="Where is my order?"
          lede="Enter the reference from your checkout confirmation. It looks like AV-2610-KP4MWX."
        />
        <div className="mt-10">
          <OrderLookup />
        </div>
        <p className="mt-8 text-center text-[13px] leading-relaxed text-steel">
          Lost the reference?{' '}
          <Link href="/contact" className="link-underline text-chalk">
            Message the workshop
          </Link>{' '}
          with your phone number and we will find it.
        </p>
      </div>
    </section>
  );
}
