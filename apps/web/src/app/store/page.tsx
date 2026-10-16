import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCT_KINDS, PRODUCT_SORTS, LABELS, type ProductKind, type ProductSort } from '@arkvolt/shared';
import { api } from '@/lib/api';
import { SectionHeading } from '@/components/ui/Section';
import { ProductCard } from '@/components/catalog/Cards';

export const metadata: Metadata = {
  title: 'Store',
  description:
    'Storage, memory, thermal and power components supplied and fitted in Lagos, plus in-house tooling. Every item carries its specification and fitting requirements before you buy.',
};

export const revalidate = 60;

const SORT_LABELS: Record<ProductSort, string> = {
  featured: 'Recommended',
  newest: 'Newest',
  'price-asc': 'Price ↑',
  'price-desc': 'Price ↓',
  'name-asc': 'A–Z',
};

interface SearchParams {
  kind?: string;
  category?: string;
  sort?: string;
  q?: string;
  page?: string;
}

export default async function StorePage({ searchParams }: { searchParams: SearchParams }) {
  const kind = (PRODUCT_KINDS as readonly string[]).includes(searchParams.kind ?? '')
    ? (searchParams.kind as ProductKind)
    : undefined;
  const sort = (PRODUCT_SORTS as readonly string[]).includes(searchParams.sort ?? '')
    ? (searchParams.sort as ProductSort)
    : 'featured';
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);

  const [{ items, meta }, categories] = await Promise.all([
    api
      .products({ perPage: 12, kind, sort, q: searchParams.q, category: searchParams.category, page })
      .catch(() => ({ items: [], meta: { page: 1, perPage: 12, total: 0, totalPages: 1 } })),
    api.categories().catch(() => []),
  ]);

  const buildHref = (patch: Partial<SearchParams>): string => {
    const next = { kind: searchParams.kind, sort: searchParams.sort, q: searchParams.q, category: searchParams.category, ...patch };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) qs.set(k, String(v));
    const s = qs.toString();
    return `/store${s ? `?${s}` : ''}`;
  };

  const activeCategory = categories.find((c) => c.slug === searchParams.category);

  return (
    <>
      <header className="noise relative border-b border-hairline">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="shell relative z-[2] py-16 md:py-20">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-technical text-slate">
              <li>
                <Link href="/" className="hover:text-chalk">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-chalk">Store</li>
              {activeCategory && (
                <>
                  <li aria-hidden>/</li>
                  <li className="text-chalk">{activeCategory.name}</li>
                </>
              )}
            </ol>
          </nav>

          <h1 className="font-display text-d-lg font-bold uppercase tracking-display text-chalk">
            {activeCategory ? activeCategory.name : 'The store'}
          </h1>

          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-steel">
            {activeCategory?.description ??
              'Components we would put in our own machines, supplied with their full specification and fitting requirements stated up front. Fitting is included within Lagos — outside Lagos we ship nationwide and talk you through it.'}
          </p>

          <p className="mt-6 font-mono text-[10px] uppercase tracking-technical text-slate">
            {meta.total} {meta.total === 1 ? 'product' : 'products'} listed
          </p>
        </div>
      </header>

      {/* Filter rail — sticky, hairline-separated, no rounded pills. */}
      <div className="sticky top-[68px] z-30 border-b border-hairline bg-void/92 backdrop-blur-md">
        <div className="shell flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-tech mr-1">Type</span>
            <Link
              href={buildHref({ kind: undefined, category: undefined, page: undefined })}
              className={`chip transition-colors ${!kind && !searchParams.category ? 'chip-volt' : 'hover:border-steel hover:text-chalk'}`}
            >
              All
            </Link>
            {PRODUCT_KINDS.filter((k) => k !== 'SERVICE').map((k) => (
              <Link
                key={k}
                href={buildHref({ kind: k, category: undefined, page: undefined })}
                className={`chip transition-colors ${kind === k ? 'chip-volt' : 'hover:border-steel hover:text-chalk'}`}
              >
                {LABELS.ProductKind[k]}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="label-tech mr-1">Sort</span>
            {PRODUCT_SORTS.map((s) => (
              <Link
                key={s}
                href={buildHref({ sort: s, page: undefined })}
                className={`chip transition-colors ${sort === s ? 'chip-volt' : 'hover:border-steel hover:text-chalk'}`}
              >
                {SORT_LABELS[s]}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="shell py-14 md:py-20">
        {items.length === 0 ? (
          <div className="border border-hairline bg-gunmetal p-12 text-center md:p-20">
            <SectionHeading
              index="00"
              eyebrow="No results"
              title="Nothing matches that"
              lede="Try a different type or clear the filters. If you are looking for something specific, message the workshop — we can usually source it."
            />
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/store" className="btn-ghost">
                Clear filters
              </Link>
              <Link href="/contact" className="btn-quiet">
                Ask us to source it
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>

            {meta.totalPages > 1 && (
              <nav aria-label="Pagination" className="mt-14 flex items-center justify-between border-t border-hairline pt-8">
                {page > 1 ? (
                  <Link href={buildHref({ page: String(page - 1) })} className="btn-ghost btn-sm">
                    ← Previous
                  </Link>
                ) : (
                  <span />
                )}

                <span className="font-mono text-[10px] tabular-nums uppercase tracking-technical text-slate">
                  Page {page} of {meta.totalPages}
                </span>

                {page < meta.totalPages ? (
                  <Link href={buildHref({ page: String(page + 1) })} className="btn-ghost btn-sm">
                    Next →
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}

        {/* Fitting note — the commercial reality, stated once, clearly. */}
        <aside className="mt-20 grid gap-px border border-hairline bg-hairline md:grid-cols-3">
          {[
            { t: 'Fitting included in Lagos', d: 'Bring the machine to the workshop and we fit at no extra cost. Allow 60–90 minutes.' },
            { t: 'Nationwide courier', d: 'Outside Lagos we ship the component and walk you through installation on WhatsApp.' },
            { t: 'Serial numbers recorded', d: 'Every component we supply is logged against your order for warranty claims.' },
          ].map((item) => (
            <div key={item.t} className="bg-void p-7">
              <h3 className="font-display text-[19px] font-semibold uppercase tracking-display text-chalk">
                {item.t}
              </h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-steel">{item.d}</p>
            </div>
          ))}
        </aside>
      </section>
    </>
  );
}
