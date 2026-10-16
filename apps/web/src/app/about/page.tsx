import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { SectionHeading } from '@/components/ui/Section';
import { Mark } from '@/components/brand/Mark';

export const metadata: Metadata = {
  title: 'About',
  description:
    'An independent IT hardware workshop in Lagos. Diagnostics before quotes, written prices, measured results — and a firm position on software licensing.',
};

export default async function AboutPage() {
  const settings = await api.settings();

  return (
    <>
      <header className="noise relative border-b border-hairline">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="shell relative z-[2] py-16 md:py-24">
          <div className="mb-8 flex items-center gap-4">
            <span className="h-1.5 w-1.5 animate-signal-pulse bg-volt" aria-hidden />
            <span className="eyebrow">About</span>
          </div>

          <h1 className="max-w-4xl font-display text-d-lg font-bold uppercase tracking-display text-chalk">
            One engineer.
            <br />
            One bench.
            <br />
            <span className="text-volt">Measured work.</span>
          </h1>

          <p className="mt-9 max-w-2xl text-[16.5px] leading-relaxed text-steel">
            ARKVOLT is an independent hardware workshop in Lagos. It exists because getting a computer
            repaired in this city too often means handing over a machine and hoping. We do it
            differently: the fault is measured, the price is written down, and the work is verified
            before you collect.
          </p>
        </div>
      </header>

      <section className="shell grid gap-16 py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-20 lg:py-24">
        <div className="max-w-prose">
          <SectionHeading index="01" eyebrow="How we work" title="Three rules" />

          <div className="mt-12 space-y-10">
            {[
              {
                n: '01',
                t: 'Diagnose before quoting',
                d: 'A price invented before the machine is open is a guess, and guesses get corrected on someone else\u2019s invoice. We measure first. Every diagnostic produces readings you can see — SMART data, rail voltages, thermal curves, memory test results — whether or not you go ahead with the repair.',
              },
              {
                n: '02',
                t: 'Write the price down',
                d: 'The number you approve is the number you pay. If the fault is different from what we expected, we stop and tell you, then re-quote. You are free to decline at any point and collect the machine, paying only the diagnostic fee.',
              },
              {
                n: '03',
                t: 'Verify, then hand over',
                d: 'A machine does not leave the bench until the reported fault is confirmed resolved and the rest of the system still behaves. For thermal and performance work that means before-and-after numbers, not an assurance.',
              },
            ].map((rule) => (
              <article key={rule.n} className="flex gap-6">
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-volt">{rule.n}</span>
                <div>
                  <h3 className="font-display text-[26px] font-semibold uppercase leading-tight tracking-display text-chalk">
                    {rule.t}
                  </h3>
                  <p className="mt-3.5 text-[14.5px] leading-relaxed text-steel">{rule.d}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-8 lg:pt-4">
          <div className="bracket bracket-lg relative border border-hairline">
            <div className="relative aspect-[4/3] overflow-hidden bg-plate">
              <Image
                src="/media/workbench-diagnostics.webp"
                alt="The Arkvolt diagnostic bench"
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px bg-hairline">
            {[
              ['Workshop', 'Ikeja, Lagos'],
              ['Founded', 'Independent'],
              ['Focus', 'PC & laptop hardware'],
              ['Warranty', '90 days parts & labour'],
            ].map(([k, v]) => (
              <div key={k} className="bg-void p-5">
                <dt className="label-tech">{k}</dt>
                <dd className="mt-2 text-[14px] text-chalk">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The licensing position — stated as plainly as everything else. */}
      <section className="noise relative border-y border-hairline bg-gunmetal">
        <div className="shell relative z-[2] py-16 md:py-24">
          <SectionHeading
            index="02"
            eyebrow="Software & licensing"
            title="What we do and do not supply"
            lede="This matters, so it is stated here rather than buried in terms and conditions."
          />

          <div className="mt-12 grid gap-px bg-hairline md:grid-cols-2">
            <div className="bg-void p-8">
              <span className="chip-volt">We do</span>
              <ul className="mt-6 space-y-4">
                {[
                  'Sell installation, configuration and recovery as services, billed as labour',
                  'Supply genuine hardware components with traceable serial numbers',
                  'Deploy operating systems onto machines with a valid, customer-held licence',
                  'Install free and open-source tooling and drivers from official vendor sources',
                  'Prepare a customer\u2019s own licensed software to run correctly on their hardware',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[13.5px] leading-relaxed text-steel">
                    <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt" fill="none" aria-hidden>
                      <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-void p-8">
              <span className="chip border-crimson/40 text-crimson">We do not</span>
              <ul className="mt-6 space-y-4">
                {[
                  'Sell, distribute, pre-install or supply pirated software or cracked game copies',
                  'Use activation workarounds, DRM circumvention tools or key generators',
                  'Provide installer media or licence keys we are not authorised to provide',
                  'Sell or install software the customer does not hold a licence for',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[13.5px] leading-relaxed text-steel">
                    <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-crimson" fill="none" aria-hidden>
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-10 max-w-3xl text-[14px] leading-relaxed text-steel">
            If a customer wants a machine prepared for a game or application, we do that work — and we
            charge for our time and expertise. The licence stays theirs. This is not a limitation; it
            is the reason the work has value. Anyone can copy a file. Making it run correctly on a
            specific machine, and proving it does, is the part that takes skill.
          </p>
        </div>
      </section>

      <section className="shell py-16 text-center md:py-24">
        <Mark className="mx-auto h-10 w-10 text-slate" />
        <h2 className="mx-auto mt-7 max-w-2xl font-display text-d-md font-bold uppercase tracking-display text-chalk">
          Bring us the machine
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-steel">
          {settings.workshopAddress} · {settings.workshopHours}
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/book" className="btn-primary">
            Book an appointment
          </Link>
          <Link href="/contact" className="btn-ghost">
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}
