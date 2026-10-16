import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { InquiryForm } from '@/components/forms/InquiryForm';
import { SectionHeading } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Reach the ARKVOLT workshop in Lagos — WhatsApp, phone, email, or the contact form. Sourcing requests and compatibility questions welcome.',
};

export default async function ContactPage({ searchParams }: { searchParams: { about?: string; subject?: string } }) {
  const settings = await api.settings();

  const channels = [
    {
      label: 'WhatsApp',
      value: settings.whatsappNumber ? `+${settings.whatsappNumber}` : '',
      href: `https://wa.me/${settings.whatsappNumber}`,
      note: 'Fastest route. Orders, quotes and bookings are all confirmed here.',
      primary: true,
    },
    {
      label: 'Phone',
      value: settings.supportPhone,
      href: `tel:${settings.supportPhone.replace(/\s/g, '')}`,
      note: 'Working hours only.',
    },
    {
      label: 'Email',
      value: settings.supportEmail,
      href: `mailto:${settings.supportEmail}`,
      note: 'Best for invoices, business enquiries and documents.',
    },
  ].filter((c) => c.value);

  return (
    <>
      <header className="noise relative border-b border-hairline">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="shell relative z-[2] py-16 md:py-20">
          <SectionHeading
            index="01"
            eyebrow="Contact"
            title="Talk to the workshop"
            lede="Quotes, stock questions, compatibility checks, sourcing requests, business support. Most of it happens on WhatsApp because it is where you already are."
          />
        </div>
      </header>

      <section className="shell py-14 md:py-20">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div>
            <ul className="border-t border-hairline">
              {channels.map((channel) => (
                <li key={channel.label} className="border-b border-hairline">
                  <a
                    href={channel.href}
                    target={channel.href.startsWith('http') ? '_blank' : undefined}
                    rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="group flex items-start justify-between gap-6 py-6 transition-colors"
                  >
                    <div>
                      <p className="flex items-center gap-3">
                        <span className={`label-tech ${channel.primary ? 'text-volt' : ''}`}>
                          {channel.label}
                        </span>
                        {channel.primary && (
                          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-technical text-volt">
                            <span className="h-1 w-1 animate-signal-pulse bg-volt" aria-hidden />
                            Recommended
                          </span>
                        )}
                      </p>
                      <p className="mt-2.5 font-display text-[24px] font-semibold tabular-nums uppercase tracking-display text-chalk transition-colors group-hover:text-volt">
                        {channel.value}
                      </p>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-steel">{channel.note}</p>
                    </div>
                    <svg
                      viewBox="0 0 16 16"
                      className="mt-1 h-4 w-4 shrink-0 text-slate transition-transform duration-300 group-hover:translate-x-1 group-hover:text-volt"
                      fill="none"
                      aria-hidden
                    >
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>

            {(settings.workshopAddress || settings.workshopHours) && (
              <div className="mt-10">
                <h2 className="label-tech">Workshop</h2>
                {settings.workshopAddress && (
                  <p className="mt-3 font-display text-[22px] font-semibold uppercase leading-tight tracking-display text-chalk">
                    {settings.workshopAddress}
                  </p>
                )}
                {settings.workshopHours && (
                  <p className="mt-3 text-[13px] leading-relaxed text-steel">{settings.workshopHours}</p>
                )}
                <p className="mt-4 text-[12.5px] leading-relaxed text-slate">
                  Walk-ins are welcome but booked appointments take priority at the bench. If you are
                  bringing a machine in, message first so we can plan for it.
                </p>
              </div>
            )}

            <div className="mt-10 border border-hairline bg-gunmetal p-6">
              <h2 className="label-tech">What we can help with</h2>
              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {[
                  'Fault diagnosis',
                  'Upgrade advice',
                  'Component sourcing',
                  'Compatibility checks',
                  'Business support',
                  'Warranty claims',
                  'Data recovery',
                  'Bulk equipment',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[13px] text-steel">
                    <span className="mt-2 h-1 w-1 shrink-0 bg-volt" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <InquiryForm
            initialSubject={searchParams.subject ?? ''}
            relatedSlug={searchParams.about ?? ''}
          />
        </div>
      </section>
    </>
  );
}
