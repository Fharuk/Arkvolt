import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { CartView } from '@/components/forms/CartView';
import { SectionHeading } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Your cart',
  description: 'Review the components and tools in your cart before confirming with the workshop.',
};

export default async function CartPage() {
  const settings = await api.settings();

  return (
    <section className="shell py-16 md:py-24">
      <SectionHeading
        index="01"
        eyebrow="Cart"
        title="Review your order"
        lede="Fitting is included on all components within Lagos. Delivery is calculated at checkout."
      />
      <div className="mt-12">
        <CartView freeThresholdKobo={settings.freeDeliveryThresholdKobo} deliveryFeeKobo={settings.deliveryFeeKobo} />
      </div>
    </section>
  );
}
