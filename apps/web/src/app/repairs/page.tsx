import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { SectionHeading } from '@/components/ui/Section';
import { ServiceCard } from '@/components/catalog/Cards';
import { Ticker } from '@/components/ui/Ticker';

export const metadata: Metadata = {
  title: 'Repairs & services',
  description:
    'Diagnostics, thermal services, operating system deployment, data recovery and on-site business support in Lagos. Written price approved before any work begins.',
};

export const revalidate = 120;

const FAULT_TABLE = [
  { symptom: 'Will not power on at all', likely: 'Power supply, charging circuit, or board-level fault', time: 'Same day' },
  { symptom: 'Shuts down under load', likely: 'Thermal throttling or failing PSU rails', time: 'Same day' },
  { symptom: 'Runs hot, fan loud', likely: 'Compacted dust and dried thermal compound', time: 'Same day' },
  { symptom: 'Blue screens randomly', likely: 'Memory, storage or driver conflict', time: 'Same day' },
  { symptom: 'Extremely slow, disk at 100%', likely: 'Failing mechanical drive', time: 'Same day' },
  { symptom: 'Will not boot, no OS', likely: 'Corrupted boot sector or failed drive', time: 'Same day' },
  { symptom: 'Files gone or drive unreadable', likely: 'Logical corruption or mechanical failure', time: '2–5 days' },
  { symptom: 'Screen cracked or dead pixels', likely: 'Panel replacement', time: '2–4 days' },
  { symptom: 'Liquid spill', likely: 'Corrosion — assess immediately, do not power on', time: 'Priority' },
  { symptom: 'Wi-Fi or ports dead', likely: 'Adapter, antenna or connector fault', time: 'Same day' },
];

export default async function RepairsPage() {
  const services = await api.services().catch(() => []);

  return (
    <>
      <header className="noise relative border-b border-hairline">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="shell relative z-[2] grid gap-12 py-16 md:py-24 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <div>
            <div className="mb-8 flex items-center gap-4">
              <span className="h-1.5 w-1.5 animate-signal-pulse bg-volt" aria-hidden />
              <span className="eyebrow">Repair & service</span>
            </div>

            <h1 className="font-display text-d-lg font-bold uppercase tracking-display text-chalk">
              A diagnosis,
              <br />
              then a price.
              <br />
              <span className="text-volt">In that order.</span>
            </h1>

            <p className="mt-8 max-w-xl text-[16px] leading-relaxed text-steel">
              Computer repair has a trust problem, and it is deserved. The fix is not a promise — it
              is a process. We measure the fault, show you the readings, quote a fixed price, and
              only start once you have approved it in writing.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/book" className="btn-primary">
                Book an appointment
              </Link>
              <Link href="#pricing" className="btn-ghost">
                See pricing
              </Link>
            </div>
          </div>

          <div className="border border-hairline bg-gunmetal p-7 lg:self-end">
            <p className="label-tech">Workshop hours</p>
            <p className="mt-3 font-display text-[26px] font-semibold uppercase leading-tight tracking-display text-chalk">
              Mon–Sat
              <br />
              09:00–19:00 WAT
            </p>
            <p className="mt-5 border-t border-hairline pt-5 text-[13px] leading-relaxed text-steel">
              Bring the machine before 15:00 and you will usually have a diagnosis the same day.
              Sunday and evening slots are available by arrangement.
            </p>
          </div>
        </div>
      </header>

      <Ticker
        items={[
          'No recovery, no fee on data recovery',
          'Written price approved before work starts',
          '90-day warranty on parts and labour',
          'Photographs of everything we find',
          'On-site visits across Lagos',
          'Genuine parts only, serials recorded',
        ]}
        speed={46}
      />

      {/* Services */}
      <section className="shell py-20 md:py-28" id="pricing">
        <SectionHeading
          index="01"
          eyebrow="Service packages"
          title="Fixed price, or it is not fixed"
          lede="A package price is what you pay if the job is what we expect it to be. If the diagnostic reveals something different, we re-quote before continuing — and you are free to decline."
        />

        <div className="mt-14 grid gap-px bg-hairline md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={String(i + 1).padStart(2, '0')} />
          ))}
        </div>

        {services.length === 0 && (
          <div className="mt-14 border border-hairline bg-gunmetal p-10 text-center">
            <p className="font-display text-2xl uppercase tracking-display text-steel">
              Service list is loading
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate">
              Message the workshop and we will tell you the current rates directly.
            </p>
          </div>
        )}
      </section>

      {/* Symptom lookup — a diagnostic aid, not a marketing table */}
      <section className="border-y border-hairline bg-gunmetal">
        <div className="shell py-20 md:py-28">
          <SectionHeading
            index="02"
            eyebrow="Symptom guide"
            title="Find your fault"
            lede="A rough guide to what usually causes each symptom, and how long the work takes. It is a starting point — the actual diagnosis is done on the machine."
          />

          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline-strong">
                  <th scope="col" className="py-4 pr-6 font-mono text-[10px] font-normal uppercase tracking-technical text-volt">
                    Symptom
                  </th>
                  <th scope="col" className="py-4 pr-6 font-mono text-[10px] font-normal uppercase tracking-technical text-volt">
                    Usual cause
                  </th>
                  <th scope="col" className="py-4 font-mono text-[10px] font-normal uppercase tracking-technical text-volt">
                    Turnaround
                  </th>
                </tr>
              </thead>
              <tbody>
                {FAULT_TABLE.map((row) => (
                  <tr key={row.symptom} className="group border-b border-hairline transition-colors hover:bg-plate">
                    <td className="py-4 pr-6 text-[14px] text-chalk">{row.symptom}</td>
                    <td className="py-4 pr-6 text-[13.5px] text-steel">{row.likely}</td>
                    <td className="py-4 font-mono text-[11px] uppercase tracking-technical text-slate">
                      {row.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-hairline pt-8">
            <p className="text-[14px] text-steel">
              Symptom not listed, or not sure which one it is?
            </p>
            <Link href="/book" className="btn-ghost btn-sm">
              Describe it to us
            </Link>
          </div>
        </div>
      </section>

      {/* Repair terms — the honest version */}
      <section className="shell py-20 md:py-28">
        <SectionHeading
          index="03"
          eyebrow="Terms"
          title="What we commit to"
          lede="Stated plainly so there is nothing to argue about later."
        />

        <div className="mt-14 grid gap-px bg-hairline md:grid-cols-2">
          {[
            {
              t: 'The price you approve is the price you pay',
              d: 'If we open the machine and find something worse, we stop, tell you, and re-quote. We do not proceed on the assumption you will accept it.',
            },
            {
              t: 'Ninety days on parts and labour',
              d: 'If the same fault returns within ninety days, we fix it again at no charge. Physical damage and liquid ingress are excluded — both are obvious on inspection.',
            },
            {
              t: 'Your data is not our business',
              d: 'We do not browse, copy or retain customer files. Where migration is part of the job, it is done with you present or on your explicit instruction.',
            },
            {
              t: 'Failing drives are reported, not worked around',
              d: 'If SMART data shows a drive is dying, we tell you before installing anything onto it — even if you asked for something else entirely.',
            },
            {
              t: 'No repair, no repair fee',
              d: 'If we cannot fix it, you pay the diagnostic fee only. If we recommend against repairing it because the cost exceeds the machine value, we say so.',
            },
            {
              t: 'Parts are returned to you',
              d: 'Every component we remove is yours. We put it in a bag and hand it back, unless you tell us to dispose of it.',
            },
          ].map((item, i) => (
            <article key={item.t} className="bg-void p-7 md:p-9">
              <span className="index-num">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-4 font-display text-[22px] font-semibold uppercase leading-tight tracking-display text-chalk">
                {item.t}
              </h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-steel">{item.d}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
