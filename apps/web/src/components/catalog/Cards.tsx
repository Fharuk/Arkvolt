import Link from 'next/link';
import Image from 'next/image';
import { formatNaira, LABELS, type Product, type Service } from '@arkvolt/shared';

/* ------------------------------------------------------------------ *
 * Product card
 *
 * Structured like a catalogue entry, not a marketing tile: name, SKU,
 * a one-line technical summary, price as data. The stock indicator is the
 * only coloured element, because it is the only thing that changes what
 * the visitor can do right now.
 * ------------------------------------------------------------------ */

const StockIndicator = ({ product }: { product: Product }) => {
  if (!product.trackStock) {
    return <span className="font-mono text-[10px] uppercase tracking-technical text-slate">Made to order</span>;
  }
  if (product.stock === 0) {
    return <span className="font-mono text-[10px] uppercase tracking-technical text-crimson">Out of stock</span>;
  }
  if (product.stock <= 3) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-technical text-amber">
        {product.stock} left in stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-technical text-jade">
      <span className="h-1 w-1 bg-jade" aria-hidden />
      In stock
    </span>
  );
};

export const ProductCard = ({ product, priority = false }: { product: Product; priority?: boolean }) => {
  const image = product.images[0];
  const onSale = product.compareAtKobo !== null && product.compareAtKobo > product.priceKobo;
  const saving = onSale ? product.compareAtKobo! - product.priceKobo : 0;

  return (
    <Link
      href={`/store/${product.slug}`}
      className="group relative flex flex-col border border-hairline bg-gunmetal transition-colors duration-300 ease-mechanical hover:border-hairline-strong"
    >
      {/* Corner brackets appear on hover — the "framed object" signal. */}
      <span
        className="pointer-events-none absolute -left-px -top-px h-3.5 w-3.5 border-l border-t border-volt opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -bottom-px -right-px h-3.5 w-3.5 border-b border-r border-volt opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />

      <div className="relative aspect-[4/3] overflow-hidden border-b border-hairline bg-plate">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || product.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-mechanical group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-technical text-slate">
            No image
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
          <span className="border border-hairline-strong bg-void/85 px-2 py-1 font-mono text-[9px] uppercase tracking-technical text-steel backdrop-blur-sm">
            {LABELS.ProductKind[product.kind]}
          </span>
          {onSale && (
            <span className="border border-volt/50 bg-void/85 px-2 py-1 font-mono text-[9px] uppercase tracking-technical text-volt backdrop-blur-sm">
              Save {formatNaira(saving)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-[10px] uppercase tracking-technical text-slate">{product.sku}</p>

        <h3 className="mt-2.5 font-display text-[22px] font-semibold uppercase leading-[1.06] tracking-display text-chalk transition-colors duration-200 group-hover:text-volt">
          {product.name}
        </h3>

        <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-steel">
          {product.tagline || product.shortDescription}
        </p>

        {/* First two spec pairs — the technical layer, right on the card. */}
        {product.specs.length > 0 && (
          <dl className="mt-5 space-y-1.5 border-t border-hairline pt-4">
            {product.specs.slice(0, 2).map((spec) => (
              <div key={spec.label} className="flex items-baseline justify-between gap-4">
                <dt className="font-mono text-[10px] uppercase tracking-technical text-slate">{spec.label}</dt>
                <dd className="truncate text-right text-[12px] text-steel">{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <div>
            {product.priceType !== 'QUOTE' && (
              <p className="font-mono text-[9px] uppercase tracking-technical text-slate">
                {product.priceType === 'FROM' ? 'From' : 'Price'}
              </p>
            )}
            <p className="font-display text-[26px] font-semibold leading-none tabular-nums tracking-display text-chalk">
              {product.priceType === 'QUOTE' ? 'On assessment' : formatNaira(product.priceKobo)}
            </p>
            {onSale && (
              <p className="mt-1 font-mono text-[10px] tabular-nums text-slate line-through">
                {formatNaira(product.compareAtKobo!)}
              </p>
            )}
          </div>
          <StockIndicator product={product} />
        </div>
      </div>
    </Link>
  );
};

/* ------------------------------------------------------------------ *
 * Service card
 * ------------------------------------------------------------------ */

export const ServiceCard = ({ service, index }: { service: Service; index?: string }) => (
  <Link
    href={`/repairs/${service.slug}`}
    className="group relative flex flex-col border border-hairline bg-gunmetal p-6 transition-colors duration-300 ease-mechanical hover:border-hairline-strong md:p-8"
  >
    <span
      className="pointer-events-none absolute -left-px -top-px h-3.5 w-3.5 border-l border-t border-volt opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      aria-hidden
    />
    <span
      className="pointer-events-none absolute -bottom-px -right-px h-3.5 w-3.5 border-b border-r border-volt opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      aria-hidden
    />

    <div className="flex items-start justify-between gap-4">
      {index && <span className="index-num">{index}</span>}
      {service.isFeatured && (
        <span className="border border-volt/40 px-2 py-1 font-mono text-[9px] uppercase tracking-technical text-volt">
          Most booked
        </span>
      )}
    </div>

    <h3 className="mt-6 font-display text-[30px] font-semibold uppercase leading-[0.98] tracking-display text-chalk transition-colors duration-200 group-hover:text-volt md:text-[34px]">
      {service.name}
    </h3>

    <p className="mt-4 text-[14px] leading-relaxed text-steel">{service.tagline}</p>

    <dl className="mt-7 grid grid-cols-2 gap-px border-t border-hairline pt-5">
      <div>
        <dt className="label-tech">Turnaround</dt>
        <dd className="mt-1.5 text-[13px] text-chalk">{service.turnaround || 'By arrangement'}</dd>
      </div>
      <div>
        <dt className="label-tech">Duration</dt>
        <dd className="mt-1.5 text-[13px] text-chalk">
          {service.durationMins ? `${Math.round(service.durationMins / 60)} hr${service.durationMins >= 120 ? 's' : ''}` : 'Varies'}
        </dd>
      </div>
    </dl>

    <div className="mt-7 flex items-end justify-between gap-4 border-t border-hairline pt-5">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-technical text-slate">
          {service.priceType === 'FIXED' ? 'Fixed price' : service.priceType === 'FROM' ? 'Starting from' : 'Quoted'}
        </p>
        <p className="mt-1 font-display text-[28px] font-semibold leading-none tabular-nums tracking-display text-chalk">
          {service.priceType === 'QUOTE' ? 'On assessment' : formatNaira(service.priceKobo)}
        </p>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-hairline-strong text-steel transition-colors duration-200 group-hover:border-volt group-hover:text-volt">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </span>
    </div>
  </Link>
);
