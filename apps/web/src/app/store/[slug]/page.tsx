import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { formatNaira, LABELS } from '@arkvolt/shared';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/catalog/Cards';
import { AddToCart } from '@/components/catalog/AddToCart';
import { ProductGallery } from '@/components/catalog/ProductGallery';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const p = await api.product(params.slug);
    return {
      title: p.metaTitle || p.name,
      description: p.metaDescription || p.shortDescription || p.tagline,
      openGraph: {
        title: p.name,
        description: p.shortDescription,
        images: p.images[0] ? [{ url: p.images[0].url, alt: p.images[0].alt }] : undefined,
      },
    };
  } catch {
    return { title: 'Product not found' };
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product;
  try {
    product = await api.product(params.slug);
  } catch {
    notFound();
  }

  const related = await api.relatedProducts(product.slug).catch(() => []);
  const category = product.category;

  const onSale = product.compareAtKobo !== null && product.compareAtKobo > product.priceKobo;
  const inStock = !product.trackStock || product.stock > 0;

  /* Structured data so the listing shows a price in search results. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    description: product.shortDescription || product.tagline,
    image: product.images.map((i) => i.url),
    brand: { '@type': 'Brand', name: 'ARKVOLT' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      price: (product.priceKobo / 100).toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="border-b border-hairline">
        <div className="shell py-5">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-technical text-slate">
              <li><Link href="/" className="hover:text-chalk">Home</Link></li>
              <li aria-hidden>/</li>
              <li><Link href="/store" className="hover:text-chalk">Store</Link></li>
              {category && (
                <>
                  <li aria-hidden>/</li>
                  <li><Link href={`/store?category=${category.slug}`} className="hover:text-chalk">{category.name}</Link></li>
                </>
              )}
              <li aria-hidden>/</li>
              <li className="truncate text-chalk">{product.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* ============================================================ *
       * Datasheet header: gallery left, specification and purchase
       * panel right. Deliberately like a component catalogue page.
       * ============================================================ */}
      <section className="shell py-12 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <ProductGallery images={product.images} name={product.name} />

          <div className="lg:pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip">{LABELS.ProductKind[product.kind]}</span>
              <span className="font-mono text-[10px] uppercase tracking-technical text-slate">
                {product.sku}
              </span>
            </div>

            <h1 className="mt-6 font-display text-d-md font-bold uppercase tracking-display text-chalk">
              {product.name}
            </h1>

            {product.tagline && (
              <p className="mt-5 text-[16px] leading-relaxed text-steel">{product.tagline}</p>
            )}

            {/* Price block */}
            <div className="mt-8 flex flex-wrap items-end gap-x-5 gap-y-2 border-y border-hairline py-6">
              <div>
                {product.priceType !== 'QUOTE' && (
                  <p className="label-tech">
                    {product.priceType === 'FROM' ? 'Starting from' : 'Price'}
                  </p>
                )}
                <p className="mt-1.5 font-display text-[54px] font-bold leading-none tabular-nums tracking-display text-chalk">
                  {product.priceType === 'QUOTE' ? 'On assessment' : formatNaira(product.priceKobo)}
                </p>
              </div>

              {onSale && (
                <div className="pb-1.5">
                  <p className="font-mono text-[13px] tabular-nums text-slate line-through">
                    {formatNaira(product.compareAtKobo!)}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-technical text-volt">
                    Save {formatNaira(product.compareAtKobo! - product.priceKobo)}
                  </p>
                </div>
              )}

              <div className="ml-auto pb-1.5 text-right">
                {product.trackStock ? (
                  product.stock > 0 ? (
                    <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-technical text-jade">
                      <span className="h-1.5 w-1.5 bg-jade" aria-hidden />
                      {product.stock} in stock
                    </p>
                  ) : (
                    <p className="font-mono text-[10px] uppercase tracking-technical text-crimson">
                      Out of stock
                    </p>
                  )
                ) : (
                  <p className="font-mono text-[10px] uppercase tracking-technical text-slate">
                    Made to order
                  </p>
                )}
              </div>
            </div>

            <AddToCart product={product} />

            {/* Delivery terms — short, factual. */}
            <dl className="mt-8 space-y-4 border-t border-hairline pt-6">
              <div className="flex gap-4">
                <dt className="label-tech w-24 shrink-0 pt-0.5">Delivery</dt>
                <dd className="text-[13px] leading-relaxed text-steel">
                  {product.deliveryNotes || 'Fitting included within Lagos. Nationwide courier available.'}
                </dd>
              </div>
              <div className="flex gap-4">
                <dt className="label-tech w-24 shrink-0 pt-0.5">Payment</dt>
                <dd className="text-[13px] leading-relaxed text-steel">
                  Confirmed with the admin on WhatsApp after checkout. No card details are taken on
                  this site.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ============================================================ *
       * Body: description, specification, requirements, procedure
       * ============================================================ */}
      <section className="border-t border-hairline bg-gunmetal">
        <div className="shell grid gap-16 py-16 lg:grid-cols-[1fr_380px] lg:gap-20 lg:py-20">
          <div className="min-w-0">
            {product.description && (
              <div className="max-w-prose">
                {product.description.split('\n\n').map((para, i) => (
                  <p
                    key={i}
                    className={`text-[15.5px] leading-[1.75] text-steel ${i > 0 ? 'mt-6' : ''} ${i === 0 ? 'text-chalk' : ''}`}
                  >
                    {para}
                  </p>
                ))}
              </div>
            )}

            {/* Install procedure — numbered, because order matters. */}
            {product.installSteps.length > 0 && (
              <div className="mt-16">
                <h2 className="font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
                  What happens at the bench
                </h2>
                <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-steel">
                  The sequence we follow for this job, so you know exactly what is being done to your
                  machine and in what order.
                </p>

                <ol className="mt-10 space-y-px bg-hairline">
                  {product.installSteps.map((step, i) => (
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

            {/* What's included */}
            {product.included.length > 0 && (
              <div className="mt-16">
                <h2 className="font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
                  What you are paying for
                </h2>
                <ul className="mt-8 grid gap-px bg-hairline sm:grid-cols-2">
                  {product.included.map((item) => (
                    <li key={item} className="flex items-start gap-3 bg-void p-5">
                      <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt" fill="none" aria-hidden>
                        <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                      <span className="text-[13.5px] leading-relaxed text-chalk">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Side column: specifications and requirements. Sticky, because a
              buyer scrolls between the spec and the price. */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            {product.specs.length > 0 && (
              <div className="border border-hairline">
                <h2 className="border-b border-hairline px-5 py-4 font-mono text-[10px] uppercase tracking-technical text-volt">
                  Specification
                </h2>
                <table className="spec-table">
                  <tbody>
                    {product.specs.map((spec) => (
                      <tr key={spec.label}>
                        <th scope="row" className="px-5">{spec.label}</th>
                        <td className="px-5 font-medium">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Requirements are a genuine pre-purchase filter, not filler:
                they stop the wrong purchase. */}
            {product.requirements.length > 0 && (
              <div className="mt-8 border border-amber/25 bg-amber/[0.03]">
                <h2 className="flex items-center gap-2.5 border-b border-amber/25 px-5 py-4 font-mono text-[10px] uppercase tracking-technical text-amber">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
                    <path d="M8 2l6 11H2L8 2Z" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M8 6.5v3M8 11.4v.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  Check before you order
                </h2>

                <div className="divide-y divide-amber/10">
                  {product.requirements.map((group) => (
                    <div key={group.label} className="p-5">
                      <h3 className="font-mono text-[10px] uppercase tracking-technical text-amber/80">
                        {group.label}
                      </h3>
                      <ul className="mt-3 space-y-2.5">
                        {group.items.map((item) => (
                          <li key={item} className="flex gap-3 text-[13px] leading-relaxed text-steel">
                            <span className="mt-2 h-1 w-1 shrink-0 bg-amber/60" aria-hidden />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="border-t border-amber/25 p-5">
                  <p className="text-[12.5px] leading-relaxed text-steel">
                    Not sure whether this fits your machine? Send us the model number and we will
                    confirm before you buy anything.
                  </p>
                  <Link href={`/contact?about=${encodeURIComponent(product.slug)}`} className="btn-ghost btn-sm mt-4 w-full justify-center">
                    Ask about compatibility
                  </Link>
                </div>
              </div>
            )}

            {product.tags.length > 0 && (
              <div className="mt-8">
                <p className="label-tech mb-3">Related searches</p>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <Link key={tag} href={`/store?q=${encodeURIComponent(tag)}`} className="chip hover:border-steel hover:text-chalk">
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-hairline">
          <div className="shell py-16 md:py-20">
            <div className="flex items-end justify-between gap-6">
              <h2 className="font-display text-d-sm font-semibold uppercase tracking-display text-chalk">
                Usually bought together
              </h2>
              <Link href="/store" className="btn-quiet btn-sm">
                All products
              </Link>
            </div>
            <div className="mt-10 grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
