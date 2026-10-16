import type { SVGProps } from 'react';

/**
 * The ARKVOLT mark, redrawn as geometry.
 *
 * The supplied logo was a 1024px raster of a chrome shield on a light
 * gradient. It could not scale to a favicon, carried no contrast on dark
 * surfaces, and depended on a photographic render for its "metal". This is
 * the same idea — shield frame, inner ring broken by a volt spine, 'A' at
 * the centre — expressed as strokes, so it works at 16px and at 400px, on
 * dark, in one colour, and as a browser icon.
 */
export const Mark = ({ title = 'Arkvolt', ...props }: SVGProps<SVGSVGElement> & { title?: string }) => (
  <svg viewBox="0 0 64 64" role="img" aria-label={title} fill="none" {...props}>
    <title>{title}</title>

    {/* Outer shield: open at the top and bottom where the volt spine passes through. */}
    <path
      d="M20 4h24l16 16v24L44 60H20L4 44V20L20 4Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="miter"
    />

    {/* Inner ring, broken at the cardinal points. */}
    <g stroke="currentColor" strokeWidth="1.5" opacity="0.5">
      <path d="M32 12a20 20 0 0 1 20 20" />
      <path d="M52 32a20 20 0 0 1-20 20" />
      <path d="M32 52a20 20 0 0 1-20-20" />
      <path d="M12 32a20 20 0 0 1 20-20" />
    </g>

    {/* The 'A' — apex carrying the volt. */}
    <path d="M32 20 42 44h-6.5L32 35.5 28.5 44H22L32 20Z" fill="currentColor" />

    {/* Volt spine: the one element that lights up. */}
    <path d="M32 0v10M32 54v10" stroke="var(--volt, #00D4FF)" strokeWidth="2" className="volt-spine" />
  </svg>
);

/** Horizontal lockup for headers, footers and documents. */
export const Wordmark = ({
  className = '',
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) => (
  <span className={`inline-flex items-center gap-3 ${className}`}>
    <Mark className="h-7 w-7 shrink-0 text-chalk" />
    <span className="flex flex-col leading-none">
      <span className="font-display text-[19px] font-bold uppercase leading-none tracking-[0.02em] text-chalk">
        Arkvolt
      </span>
      {showTagline && (
        <span className="mt-1 font-mono text-[9px] uppercase tracking-technical text-slate">
          Systems &amp; Supply
        </span>
      )}
    </span>
  </span>
);
