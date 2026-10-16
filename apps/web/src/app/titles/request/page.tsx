import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { TitleRequestForm } from '@/components/forms/TitleRequestForm';
import { SectionHeading } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Request a title setup',
  description:
    'Tell us the title and your machine specification. We check it against the requirement sheet and quote the setup labour.',
  robots: { index: false, follow: true },
};

export default async function TitleRequestPage({ searchParams }: { searchParams: { title?: string; slug?: string } }) {
  const settings = await api.settings();
  const title = searchParams.title?.slice(0, 160) ?? '';

  return (
    <>
      <header className="noise relative border-b border-hairline">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="shell relative z-[2] py-14 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-technical text-slate">
              <li><Link href="/" className="hover:text-chalk">Home</Link></li>
              <li aria-hidden>/</li>
              <li><Link href="/titles" className="hover:text-chalk">Titles</Link></li>
              <li aria-hidden>/</li>
              <li className="text-chalk">Setup request</li>
            </ol>
          </nav>

          <SectionHeading
            index="01"
            eyebrow="Setup request"
            title="Tell us the title and your machine"
            lede="We check your specification against the title's requirement sheet and come back with an honest answer plus a fixed setup price. If your hardware cannot hold a playable frame rate at any setting, we will tell you that instead of taking the job."
          />
        </div>
      </header>

      <section className="shell py-14 md:py-20">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <TitleRequestForm initialTitle={title} />

          <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
            <div className="border border-hairline bg-gunmetal p-6">
              <h2 className="font-mono text-[10px] uppercase tracking-technical text-volt">
                What we need from you
              </h2>
              <ul className="mt-5 space-y-3.5">
                {[
                  'Your processor model — e.g. Ryzen 5 3600, Core i5-10400',
                  'Your graphics card and its VRAM — e.g. RTX 2060 6GB',
                  'Total system memory — e.g. 16GB',
                  'What the game is installed on — SSD or mechanical drive',
                  'What it is currently doing — stuttering, not launching, low frame rate',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[13px] leading-relaxed text-steel">
                    <span className="mt-2 h-1 w-1 shrink-0 bg-volt" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-hairline pt-5 text-[12px] leading-relaxed text-slate">
                Not sure? Press <kbd className="border border-hairline px-1.5 py-0.5 font-mono text-[10px]">Win</kbd> +{' '}
                <kbd className="border border-hairline px-1.5 py-0.5 font-mono text-[10px]">R</kbd>, type{' '}
                <code className="font-mono text-[11px] text-volt">dxdiag</code>, and send us what it says.
              </p>
            </div>

            <div className="border border-hairline p-6">
              <h2 className="font-mono text-[10px] uppercase tracking-technical text-volt">
                How the pricing works
              </h2>
              <dl className="mt-5 space-y-4">
                {[
                  ['Single title setup', 'From ₦8,000'],
                  ['Two to five titles', 'From ₦6,500 each'],
                  ['Full machine tune with repaste', 'From ₦15,000'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
                    <dt className="text-[13px] text-steel">{k}</dt>
                    <dd className="font-mono text-[13px] tabular-nums text-chalk">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-[12px] leading-relaxed text-slate">
                Final price confirmed in writing after we see your specification. If we diagnose a
                hardware fault during setup, you get the readings and a separate quote — never a
                surprising invoice.
              </p>
            </div>

            <div className="border border-hairline p-6">
              <h2 className="font-mono text-[10px] uppercase tracking-technical text-volt">
                Or just message us
              </h2>
              <p className="mt-4 text-[13px] leading-relaxed text-steel">
                Prefer to skip the form? Send the title and your specs straight to the workshop.
              </p>
              <a
                href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                  title ? `Hi Arkvolt — I would like a setup quote for ${title}.` : 'Hi Arkvolt — I would like a setup quote for a game.',
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost btn-sm mt-5 w-full justify-center"
              >
                Message on WhatsApp
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
