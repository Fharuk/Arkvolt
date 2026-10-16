import type { ReactNode } from 'react';

/**
 * Section headers carry an index numeral, a hairline, and a compressed
 * display headline. The numbering is not decoration: it gives the page a
 * reading order the way a spec sheet does.
 */
export const SectionHeading = ({
  index,
  eyebrow,
  title,
  lede,
  action,
  align = 'left',
}: {
  index?: string;
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  action?: ReactNode;
  align?: 'left' | 'between';
}) => (
  <div
    className={`flex flex-col gap-6 ${
      align === 'between' ? 'md:flex-row md:items-end md:justify-between' : ''
    }`}
  >
    <div className="max-w-2xl">
      {(index || eyebrow) && (
        <div className="mb-5 flex items-center gap-4">
          {index && <span className="index-num">{index}</span>}
          {index && <span className="h-px w-8 bg-hairline-strong" aria-hidden />}
          {eyebrow && <span className="eyebrow-muted">{eyebrow}</span>}
        </div>
      )}
      <h2 className="font-display text-d-md font-semibold uppercase tracking-display text-chalk">{title}</h2>
      {lede && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-steel">{lede}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/** A section wrapper with consistent vertical rhythm. */
export const Section = ({
  children,
  className = '',
  as: Tag = 'section',
  id,
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
  id?: string;
}) => (
  <Tag id={id} className={`py-20 md:py-28 ${className}`}>
    {children}
  </Tag>
);

/**
 * Technical-drawing corner brackets. Used on media frames and feature panels
 * to signal "this is a framed object" rather than "this is a card".
 */
export const Bracket = ({
  children,
  className = '',
  size = 'sm',
}: {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'lg';
}) => <div className={`bracket ${size === 'lg' ? 'bracket-lg' : ''} ${className}`}>{children}</div>;
