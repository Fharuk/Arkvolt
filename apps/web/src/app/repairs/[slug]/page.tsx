import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { formatNaira } from '@arkvolt/shared';
import { api } from '@/lib/api';
import { ServiceCard } from '@/components/catalog/Cards';

export const revalidate = 120;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const s = await api.service(params.slug);
    return { title: s.name, description: s.shortDescription || s.tagline };
  } catch {
    return { title: 'Service not found' };
  }
}

export default async function ServicePage({ params }: { params: { slug: string } }) {
  let service;
  try {
    service = await api.service(params.slug);
  } catch {
    notFound();
  }

  const all = await api.services().catch(() => []);
  const others = all.filter((s) => s.slug !== service.slug).slice(0, 3);
  const settings = await api.settings();

  return (
    <>
      <div className="border-b border-hairline">
        <div className="shell py-5">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-technical text-slate">
              <li><Link href="/" className="hover:text-chalk">Home</Link></li>
              <li aria-hidden>/</li>
              <li><Link href="/repairs" className="hover:text-chalk">Repairs</Link></li>
              <li aria-hidden>/</li>
              <li className="text-chalk">{service.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      <section className="noise relative border-b border-hairline">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div className="shell relative z-[2] grid gap-12 py-14 lg:grid-cols-[1.2fr_1fr] lg:gap-20 lg:py-20">
          <div>
            {service.isFeatured && (
              <span className="chip-volt mb-6 inline-flex">Most booked</span>
            )}

            <h1 className="font-display text-d-lg font-bold uppercase tracking-display text-chalk">
              {service.name}
            </h1>

            <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-steel">{service.tagline}</p>

            <div className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-6 border-y border-hairline py-7">
              <div>
                <p className="label-tech">
                  {service.priceType === 'FIXED' ? 'Fixed price' : service.priceType === 'FROM' ? 'Starting from' : 'Priced on assessment'}
                </p>
                <p className="mt-2 font-display text-[46px] font-bold leading-none tabular-nums tracking-display text-chalk">
                  {service.priceType === 'QUOTE' ? 'On assessment' : formatNaira(service.priceKobo)}
                </p>
              </div>
              <dl className="flex gap-10">
                <div>
                  <dt className="label-tech">Turnaround</dt>
                  <dd className="mt-2 text-[14px] text-chalk">{service.turnaround || 'By arrangement'}</dd>
                </div>
                {service.durationMins && (
                  <div>
                    <dt className="label-tech">Bench time</dt>
                    <dd className="mt-2 text-[14px] text-chalk">
                      {service.durationMins >= 60
                        ? `${Math.round((service.durationMins / 60) * 10) / 10} hours`
                        : `${service.durationMins} minutes`}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={`/book?service=${service.id}`} className="btn-primary">
                Book this service
              </Link>
              <a
                href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(`Hi Arkvolt — I'd like to ask about ${service.name}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Ask a question first
              </a>
            </div>
          </div>

          {service.images[0] && (
            <div className="bracket bracket-lg relative border border-hairline">
              <div className="relative aspect-[4/3] overflow-hidden bg-plate">
                <Image
                  src={service.images[0].url}
                  alt={service.images[0].alt || service.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="shell grid gap-16 py-16 lg:grid-cols-[1fr_380px] lg:gap-20 lg:py-20">
        <div>
          {service.description.split('\n\n').map((para, i) => (
            <p
              key={i}
              className={`text-[15.5px] leading-[1.75] text-steel ${i > 0 ? 'mt-6' : 'text-chalk'}`}
            >
              {para}
            </p>
          ))}

          {service.process.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
                How the job runs
              </h2>
              <ol className="mt-10 space-y-px bg-hairline">
                {service.process.map((step, i) => (
                  <li key={step.title} className="bg-void p-6 md:p-7">
                    <div className="flex gap-6">
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-volt">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className="text-[15px] font-medium text-chalk">{step.title}</h3>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-steel">{step.detail}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {service.faqs.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
                Questions we get asked
              </h2>
              <div className="mt-10 divide-y divide-hairline border-y border-hairline">
                {service.faqs.map((faq) => (
                  <details key={faq.q} className="group py-6">
                    <summary className="flex cursor-pointer items-start justify-between gap-6 list-none">
                      <h3 className="text-[16px] font-medium text-chalk transition-colors group-hover:text-volt">
                        {faq.q}
                      </h3>
                      <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center text-slate transition-transform duration-300 group-open:rotate-45">
                        <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" aria-hidden>
                          <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </span>
                    </summary>
                    <p className="mt-4 max-w-2xl pr-10 text-[14px] leading-relaxed text-steel">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          {service.includes.length > 0 && (
            <div className="border border-hairline">
              <h2 className="border-b border-hairline px-5 py-4 font-mono text-[10px] uppercase tracking-technical text-volt">
                Included
              </h2>
              <ul className="divide-y divide-hairline">
                {service.includes.map((item) => (
                  <li key={item} className="flex gap-3 p-5">
                    <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt" fill="none" aria-hidden>
                      <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                    <span className="text-[13px] leading-relaxed text-chalk">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 border border-hairline bg-gunmetal p-6">
            <h2 className="label-tech">Not sure this is the right one?</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-steel">
              Book the diagnostic instead. We will identify the fault and recommend the correct
              service, and the diagnostic fee comes off whatever you go ahead with.
            </p>
            <Link href="/repairs/diagnostic-assessment" className="btn-ghost btn-sm mt-5 w-full justify-center">
              See diagnostic service
            </Link>
          </div>
        </aside>
      </section>

      {others.length > 0 && (
        <section className="border-t border-hairline bg-gunmetal">
          <div className="shell py-16 md:py-20">
            <h2 className="font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
              Other services
            </h2>
            <div className="mt-10 grid gap-px bg-hairline md:grid-cols-3">
              {others.map((s, i) => (
                <ServiceCard key={s.id} service={s} index={String(i + 1).padStart(2, '0')} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
