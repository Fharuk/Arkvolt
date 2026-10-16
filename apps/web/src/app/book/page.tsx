import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { BookingForm } from '@/components/forms/BookingForm';
import { SectionHeading } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Book a repair',
  description:
    'Book a hardware repair appointment in Lagos. Describe the fault, choose a time, and the workshop confirms the slot on WhatsApp.',
};

export const revalidate = 300;

const SLOTS = ['Morning (09:00–12:00)', 'Afternoon (12:00–15:00)', 'Late afternoon (15:00–18:00)', 'Flexible'];

export default async function BookPage({ searchParams }: { searchParams: { service?: string; device?: string } }) {
  const services = await api.services().catch(() => []);

  return (
    <>
      <header className="noise relative border-b border-hairline">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="shell relative z-[2] py-16 md:py-20">
          <SectionHeading
            index="01"
            eyebrow="Appointment"
            title={
              <>
                Book it in.
                <br />
                Four minutes.
              </>
            }
            lede="Tell us what the machine is and what it is doing. You do not need an account, and nothing is charged here — the workshop confirms your slot and the price on WhatsApp."
          />
        </div>
      </header>

      <section className="shell py-14 md:py-20">
        <div className="grid gap-14 lg:grid-cols-[1.35fr_1fr] lg:gap-20">
          <BookingForm services={services} slots={SLOTS} preselectedServiceId={searchParams.service} />

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="border border-hairline bg-gunmetal">
              <h2 className="border-b border-hairline px-6 py-5 font-mono text-[10px] uppercase tracking-technical text-volt">
                What happens after you submit
              </h2>
              <ol className="divide-y divide-hairline">
                {[
                  { t: 'You are routed to WhatsApp', d: 'Your details arrive pre-filled in a message to the workshop. Send it and the thread opens.' },
                  { t: 'We confirm the slot', d: 'Usually within the hour during working hours. If the slot is taken we offer the nearest alternative.' },
                  { t: 'Diagnosis on arrival', d: 'Typically same day. You get the readings, the fault and a fixed price in writing.' },
                  { t: 'You approve, we proceed', d: 'Nothing is done — and nothing is billed — until you say yes.' },
                ].map((step, i) => (
                  <li key={step.t} className="flex gap-5 p-6">
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-volt">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-[14px] font-medium text-chalk">{step.t}</h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-steel">{step.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-8 border border-hairline p-6">
              <h2 className="label-tech">Bring with you</h2>
              <ul className="mt-4 space-y-3">
                {[
                  'The charger or power adapter',
                  'Any external devices you use with it',
                  'The password, if the machine will be tested under your profile',
                  'A backup of anything irreplaceable, if the drive is suspect',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[13px] leading-relaxed text-steel">
                    <span className="mt-2 h-1 w-1 shrink-0 bg-volt" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 border border-amber/25 bg-amber/[0.03] p-6">
              <h2 className="font-mono text-[10px] uppercase tracking-technical text-amber">
                Liquid damage
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-steel">
                Switch it off, do not charge it, and do not attempt to dry it with heat. Bring it in as
                soon as you can — corrosion damage is progressive, and the first hour matters more
                than anything we can do afterwards.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
