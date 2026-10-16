import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { formatNaira, LABELS } from '@arkvolt/shared';
import { api } from '@/lib/api';
import { Section, SectionHeading, Bracket } from '@/components/ui/Section';
import { Ticker } from '@/components/ui/Ticker';
import { ProductCard, ServiceCard } from '@/components/catalog/Cards';
import { TitleSearch } from '@/components/catalog/TitleSearch';
import { Mark } from '@/components/brand/Mark';

export const metadata: Metadata = {
  title: 'ARKVOLT — Software supply and hardware repair in Lagos',
  description:
    'NVMe and memory upgrades, thermal services, data recovery and on-site business support. Every price confirmed in writing before work starts. Same-day diagnostics on weekdays.',
};

export const revalidate = 60;

const TICKER_ITEMS = [
  'Same-day diagnostics on weekdays',
  'Every price confirmed in writing before work starts',
  'No recovery, no fee on data recovery',
  '90-day warranty on all parts and labour',
  'On-site support across Lagos',
  'Nationwide courier on components',
  'Genuine drives, traceable serial numbers',
  'Payment confirmed on WhatsApp',
];

const CAPABILITIES = [
  {
    index: '01',
    title: 'Dropping power under load',
    body: 'Random shutdowns, USB devices that drop out mid-session, drives that disappear. Usually the power supply, occasionally the board — we measure the rails and tell you which.',
  },
  {
    index: '02',
    title: 'Running hot and throttling',
    body: 'Compact dust in the fin stack, dried thermal compound, failing fans. We tear down, clean, repaste and give you the before and after temperatures in writing.',
  },
  {
    index: '03',
    title: 'Painfully slow',
    body: 'Almost always storage. We read the drive health, confirm the bottleneck properly, and fit an NVMe or SSD with your data migrated across in the same visit.',
  },
  {
    index: '04',
    title: 'Not booting at all',
    body: 'Power, POST, memory, corrupted boot sector. A structured diagnostic sequence — so you get a diagnosis rather than a guess and a parts bill.',
  },
  {
    index: '05',
    title: 'Files you cannot lose',
    body: 'Failed drives, formatted partitions, corrupted volumes. Assessed before anything is attempted, and you review the file listing before paying.',
  },
  {
    index: '06',
    title: 'Offices that cannot stop',
    body: 'Scheduled maintenance for workstations, network gear and printers. Fixed appointment times, work logged after every visit, parts quoted before fitting.',
  },
];

export default async function HomePage() {
  const [featured, services, settings] = await Promise.all([
    api.products({ perPage: 6, sort: 'featured' }).catch(() => ({ items: [], meta: null })),
    api.services().catch(() => []),
    api.settings(),
  ]);

  const whatsapp = settings.whatsappNumber;

  return (
    <>
      {/* ============================================================ *
       * HERO
       *
       * Two-column split rather than a centred stack: the headline gets
       * real scale on the left, a photograph of actual bench work on the
       * right. No floating device mockup, no gradient orb.
       * ============================================================ */}
      <section className="noise relative overflow-hidden border-b border-hairline">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-70" aria-hidden />

        <div className="shell relative z-[2] grid items-center gap-14 py-20 lg:grid-cols-[1.15fr_1fr] lg:gap-20 lg:py-28">
          <div>
            <div className="mb-8 flex items-center gap-4">
              <span className="h-1.5 w-1.5 animate-signal-pulse bg-volt" aria-hidden />
              <span className="eyebrow">Hardware engineering · Lagos, Nigeria</span>
            </div>

            <h1 className="font-display text-d-lg font-bold uppercase tracking-display text-chalk">
              We fix the
              <br />
              machine.
              <br />
              <span className="text-volt">We supply</span>
              <br />
              the rest.
            </h1>

            <p className="mt-8 max-w-lg text-[16px] leading-relaxed text-steel">
              A working workshop for people whose computers have to earn. Drives, memory and thermal
              work supplied and fitted; operating systems deployed properly; data recovered when
              everything else has failed. You get a diagnosis, a written price, and the work done.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/book" className="btn-primary">
                Book a repair
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </Link>
              <Link href="/store" className="btn-ghost">
                Shop components
              </Link>
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-quiet"
              >
                WhatsApp the workshop
              </a>
            </div>

            {/* Three operating facts, stated plainly. Not "trust badges". */}
            <dl className="mt-14 grid grid-cols-3 gap-px border-t border-hairline pt-8">
              {[
                { k: 'Diagnostics', v: 'Same day' },
                { k: 'Warranty', v: '90 days' },
                { k: 'Coverage', v: 'Lagos wide' },
              ].map((item) => (
                <div key={item.k} className="border-l border-hairline pl-5 first:border-l-0 first:pl-0">
                  <dt className="label-tech">{item.k}</dt>
                  <dd className="mt-2 font-display text-[26px] font-semibold uppercase leading-none tracking-display text-chalk">
                    {item.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero media: an actual technician at an actual bench. */}
          <div className="relative">
            <Bracket size="lg" className="relative border border-hairline">
              <div className="relative aspect-[4/5] overflow-hidden bg-plate">
                <Image
                  src="/media/technician-bench.webp"
                  alt="An Arkvolt technician diagnosing a customer's machine at the bench"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
                {/* No scrim and no blur — the caption sits on its own solid
                    plinth, which is how a spec sheet annotates a photo. */}
                <div className="absolute inset-x-0 bottom-0 border-t border-hairline bg-void/95 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="label-tech">Bench 01 · Ikeja</p>
                      <p className="mt-1.5 text-[13px] text-chalk">Working on a customer machine</p>
                    </div>
                    <Mark className="h-7 w-7 shrink-0 text-slate" />
                  </div>
                </div>
              </div>
            </Bracket>

            {/* Floating spec card — one, used as a data point. */}
            <div className="absolute -bottom-6 -left-4 hidden border border-hairline-strong bg-void p-5 md:block lg:-left-10">
              <p className="label-tech">Typical repaste result</p>
              <p className="mt-2 font-display text-[40px] font-bold leading-none tabular-nums tracking-display text-volt">
                −12°C
              </p>
              <p className="mt-2 text-[11px] text-slate">sustained load, measured</p>
            </div>
          </div>
        </div>
      </section>

      <Ticker items={TICKER_ITEMS} />

      {/* ============================================================ *
       * SERVICES
       * ============================================================ */}
      <Section id="services">
        <div className="shell">
          <SectionHeading
            index="01"
            eyebrow="Repair & service"
            title={
              <>
                What people actually
                <br />
                bring us
              </>
            }
            lede="Six jobs account for most of the work that comes through the door. Every one starts with a diagnosis and ends with a written price you approve before we touch anything."
            action={
              <Link href="/repairs" className="btn-ghost btn-sm">
                All services
              </Link>
            }
            align="between"
          />

          <div className="mt-14 grid gap-px bg-hairline md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => (
              <article key={cap.index} className="group bg-void p-7 transition-colors duration-300 hover:bg-gunmetal">
                <span className="index-num">{cap.index}</span>
                <h3 className="mt-5 font-display text-[24px] font-semibold uppercase leading-tight tracking-display text-chalk">
                  {cap.title}
                </h3>
                <p className="mt-3.5 text-[13.5px] leading-relaxed text-steel">{cap.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-14 grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 3).map((service, i) => (
              <ServiceCard key={service.id} service={service} index={`0${i + 1}`} />
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ *
       * STORE
       * ============================================================ */}
      <Section className="border-y border-hairline bg-gunmetal">
        <div className="shell">
          <SectionHeading
            index="02"
            eyebrow="Store"
            title="Parts we trust, fitted properly"
            lede="We only stock what we would put in a machine we were responsible for. Every component ships with its serial number recorded, and fitting is included within Lagos."
            action={
              <Link href="/store" className="btn-ghost btn-sm">
                Browse everything
              </Link>
            }
            align="between"
          />

          {featured.items.length > 0 ? (
            <div className="mt-14 grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-3">
              {featured.items.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 3} />
              ))}
            </div>
          ) : (
            /* An empty catalogue is a cold API, not an error worth shouting
               about — point the visitor at the WhatsApp line instead. */
            <div className="mt-14 border border-hairline bg-void p-10 text-center">
              <p className="font-display text-2xl uppercase tracking-display text-steel">
                Store is being restocked
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm text-slate">
                Message the workshop and we will tell you what is on the shelf today.
              </p>
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost mt-6"
              >
                Ask what is in stock
              </a>
            </div>
          )}
        </div>
      </Section>

      {/* ============================================================ *
       * PROCESS
       * ============================================================ */}
      <Section id="process">
        <div className="shell">
          <SectionHeading
            index="03"
            eyebrow="How it works"
            title="No surprises on the invoice"
            lede="The reason people distrust computer repair is that the price is invented after the machine is open. We do it the other way round."
          />

          <ol className="mt-16 grid gap-px bg-hairline md:grid-cols-4">
            {[
              {
                n: '01',
                t: 'Tell us what it is doing',
                d: 'Book online or message WhatsApp. Answer four questions about the machine and the fault. Two minutes, no account needed.',
              },
              {
                n: '02',
                t: 'We diagnose it',
                d: 'You get the readings, the fault and the recommended fix in writing — with photographs of anything we found.',
              },
              {
                n: '03',
                t: 'You approve the price',
                d: 'The number is fixed before we start. If you decline, you pay the diagnostic fee only and collect your machine.',
              },
              {
                n: '04',
                t: 'Collect, tested',
                d: 'The fault is verified as resolved and the whole machine is re-tested. Ninety-day warranty on parts and labour.',
              },
            ].map((step) => (
              <li key={step.n} className="group relative bg-void p-7">
                <span className="font-display text-[56px] font-bold leading-none tracking-display text-hairline-strong transition-colors duration-300 group-hover:text-volt/30">
                  {step.n}
                </span>
                <h3 className="mt-5 font-display text-[21px] font-semibold uppercase leading-tight tracking-display text-chalk">
                  {step.t}
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-steel">{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ============================================================ *
       * TITLES — the reference index, framed as what it is
       * ============================================================ */}
      <Section className="noise relative border-y border-hairline bg-gunmetal">
        <div className="shell relative z-[2] grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div>
            <SectionHeading
              index="04"
              eyebrow="Title setup"
              title={
                <>
                  Own the game?
                  <br />
                  We will make it run
                </>
              }
              lede="We do not sell game licences. What we do is prepare your machine for the titles you already own: the right drivers, runtime libraries, display settings and controller mapping, then a benchmark so you know what your hardware will actually sustain."
            />

            <div className="mt-10 space-y-5">
              {[
                ['Your copy, your licence', 'You supply the game from Steam, Epic, GOG or a disc. We never supply or distribute software we do not have the right to.'],
                ['Checked against your hardware', 'Every title has a requirement sheet. We check your CPU, GPU, VRAM and storage against it honestly — including where it will struggle.'],
                ['Measured, not claimed', 'A sustained benchmark with the frame times logged, and the settings we chose explained.'],
              ].map(([title, body]) => (
                <div key={title} className="flex gap-5 border-l border-hairline pl-5">
                  <div>
                    <h3 className="text-[14px] font-medium text-chalk">{title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-steel">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/titles" className="btn-primary">
                Search the title index
              </Link>
              <Link href="/repairs/game-ready-setup" className="btn-ghost">
                Setup pricing
              </Link>
            </div>
          </div>

          <div className="lg:pt-4">
            <TitleSearch variant="panel" limit={7} />
          </div>
        </div>
      </Section>

      {/* ============================================================ *
       * WORKSHOP — proof, not a testimonial carousel
       * ============================================================ */}
      <Section>
        <div className="shell">
          <SectionHeading
            index="05"
            eyebrow="The workshop"
            title="Judged on what comes off the bench"
            lede="Photographs from the bench, taken as work happens. If a machine leaves here fixed, it is because someone measured it, not because a tool said so."
          />

          <div className="mt-14 grid gap-px bg-hairline md:grid-cols-2 lg:grid-cols-4">
            {[
              { src: '/media/laptop-board-repair.webp', label: 'Board-level work', meta: 'Pavilion 15 · power rail fault' },
              { src: '/media/laptop-teardown.webp', label: 'Full teardown', meta: 'Thermal service · 6-month interval' },
              { src: '/media/pcb-macro-dark.webp', label: 'Component inspection', meta: 'Liquid damage assessment' },
              { src: '/media/workbench-diagnostics.webp', label: 'Post-repair testing', meta: 'Sustained load · 2 hr' },
            ].map((shot, i) => (
              <figure key={shot.src} className="group relative aspect-[4/5] overflow-hidden bg-plate">
                <Image
                  src={shot.src}
                  alt={shot.label}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="object-cover transition-transform duration-[900ms] ease-mechanical group-hover:scale-105"
                />
                <figcaption className="absolute inset-x-0 bottom-0 border-t border-hairline bg-void/92 p-5">
                  <p className="font-mono text-[10px] tabular-nums uppercase tracking-technical text-volt">
                    Fig. {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-1.5 font-display text-[19px] font-semibold uppercase tracking-display text-chalk">
                    {shot.label}
                  </p>
                  <p className="mt-1 text-[11px] text-slate">{shot.meta}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ *
       * CLOSING CTA
       * ============================================================ */}
      <section className="noise relative overflow-hidden border-t border-hairline bg-gunmetal">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />

        <div className="shell relative z-[2] py-24 text-center md:py-32">
          <Mark className="mx-auto h-12 w-12 text-slate" />

          <h2 className="mx-auto mt-8 max-w-3xl font-display text-d-md font-bold uppercase tracking-display text-chalk">
            Bring it in. We will tell you what is wrong.
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-steel">
            Diagnostics are same-day on weekdays. Bring the machine before three in the afternoon and
            you will usually have an answer before we close.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/book" className="btn-primary">
              Book an appointment
            </Link>
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hi Arkvolt — I have a machine I'd like you to look at.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Message on WhatsApp
            </a>
          </div>

          <p className="mt-8 font-mono text-[10px] uppercase tracking-technical text-slate">
            {settings.workshopAddress} · {settings.workshopHours}
          </p>
        </div>
      </section>
    </>
  );
}
