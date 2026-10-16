import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { SectionHeading } from '@/components/ui/Section';
import { TitleSearch } from '@/components/catalog/TitleSearch';

export const metadata: Metadata = {
  title: 'Title setup index',
  description:
    'Search the titles we have prepared machines for. We do not sell game licences — you own the game, we configure your hardware to run it properly and benchmark the result.',
};

export const revalidate = 300;

export default async function TitlesPage() {
  const [series, settings, index] = await Promise.all([
    api.titleSeries().catch(() => []),
    api.settings(),
    api.titles({ perPage: 1 }).catch(() => ({ items: [], meta: { total: 0, page: 1, perPage: 1, totalPages: 1 } })),
  ]);

  /* The series rail is capped at 18 groups, so summing its counts would
     understate the index. The real total comes from the index itself. */
  const totalTitles = index.meta.total;
  const seriesCount = series.length;

  const whatsapp = settings.whatsappNumber;

  return (
    <>
      <header className="noise relative border-b border-hairline">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="shell relative z-[2] py-16 md:py-24">
          <div className="mb-8 flex items-center gap-4">
            <span className="h-1.5 w-1.5 animate-signal-pulse bg-volt" aria-hidden />
            <span className="eyebrow">Reference index · setup service</span>
          </div>

          <h1 className="font-display text-d-lg font-bold uppercase tracking-display text-chalk">
            You own it.
            <br />
            <span className="text-volt">We make it run.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-[16px] leading-relaxed text-steel">
            This is a list of titles we have prepared machines for — not a catalogue of things for
            sale. Arkvolt does not sell, supply or distribute game licences. You bring your own copy;
            we configure the hardware, drivers and settings so it performs the way it should, and
            benchmark the result.
          </p>

          {/* The commercial model, stated before anyone can misread the page. */}
          <div className="mt-10 grid gap-px border border-hairline bg-hairline md:grid-cols-3">
            {[
              {
                t: 'You supply the licence',
                d: 'From Steam, Epic, GOG, or a physical disc you own. We never provide the game itself.',
              },
              {
                t: 'We prepare the machine',
                d: 'Driver stack, runtime libraries, display and GPU settings, controller mapping — then tested at load.',
              },
              {
                t: 'You pay for our time',
                d: 'Setup is charged as labour, from ₦8,000 depending on how involved the configuration is.',
              },
            ].map((item) => (
              <div key={item.t} className="bg-void p-6">
                <h2 className="font-display text-[19px] font-semibold uppercase tracking-display text-chalk">
                  {item.t}
                </h2>
                <p className="mt-2.5 text-[13px] leading-relaxed text-steel">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="shell py-16 md:py-20">
        <SectionHeading
          index="01"
          eyebrow={`${totalTitles} titles indexed${seriesCount > 0 ? ` · ${seriesCount} franchises` : ''}`}
          title="Search the index"
          lede="Filter by franchise or search by name. Selecting a title opens a request form — you tell us your machine specification, we tell you whether it will run and what setup costs."
        />

        {series.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {series.map((s) => (
              <Link
                key={s.series}
                href={`/titles?q=${encodeURIComponent(s.series)}`}
                className="chip hover:border-steel hover:text-chalk"
              >
                {s.series}
                <span className="text-slate/70">·{s.count}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12">
          <TitleSearch variant="page" />
        </div>
      </section>

      {/* What the setup actually involves — the value proposition. */}
      <section className="border-y border-hairline bg-gunmetal">
        <div className="shell py-16 md:py-24">
          <SectionHeading
            index="02"
            eyebrow="The setup service"
            title="What ₦8,000 actually buys"
            lede="This is the part people underestimate. A game that runs badly is almost never a hardware problem — it is a configuration problem, and configuration is what we fix."
          />

          <div className="mt-12 grid gap-px bg-hairline md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                t: 'Hardware verification',
                d: 'Your CPU, GPU, VRAM and storage checked against the title requirement sheet — honestly, including the settings where it will struggle.',
              },
              {
                t: 'Driver and runtime work',
                d: 'Correct GPU driver branch, graphics API runtimes, Visual C++ redistributables, DirectX and .NET. Most "game will not launch" faults live here.',
              },
              {
                t: 'Display and input',
                d: 'Refresh rate verified and set, correct display mode, frame-rate cap aligned to your panel, audio device selected, controller mapped and tested.',
              },
              {
                t: 'Thermal and load check',
                d: 'Twenty minutes under real load, temperatures and frame times logged. If it throttles, you will know before you take it home.',
              },
            ].map((item, i) => (
              <article key={item.t} className="bg-void p-7">
                <span className="index-num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-4 font-display text-[20px] font-semibold uppercase leading-tight tracking-display text-chalk">
                  {item.t}
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-steel">{item.d}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-hairline pt-8">
            <Link href="/repairs/game-ready-setup" className="btn-primary btn-sm">
              Full service details
            </Link>
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Hi Arkvolt — I would like a quote to set up a game on my PC.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-sm"
            >
              Ask for a quote
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
