import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { CheckoutFlow } from '@/components/forms/CheckoutFlow';
import { SectionHeading } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Checkout',
  description:
    'Confirm your order with the ARKVOLT workshop on WhatsApp. No payment is taken on this site.',
};

export default async function CheckoutPage() {
  const settings = await api.settings();

  return (
    <>
      <header className="noise relative border-b border-hairline">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="shell relative z-[2] py-14 md:py-16">
          <SectionHeading
            index="01"
            eyebrow="Checkout"
            title="Confirm on WhatsApp"
            lede="This site does not take payment. Submit your order and it goes straight to the workshop on WhatsApp, where stock, delivery and payment are confirmed between you and the admin."
          />
        </div>
      </header>

      <section className="shell py-14 md:py-20">
        <CheckoutFlow deliveryFeeKobo={settings.deliveryFeeKobo} freeThresholdKobo={settings.freeDeliveryThresholdKobo} />
      </section>
    </>
  );
}
