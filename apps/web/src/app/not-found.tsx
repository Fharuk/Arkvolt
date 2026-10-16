import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';

export default function NotFound() {
  return (
    <section className="noise relative flex min-h-[70vh] items-center justify-center overflow-hidden border-b border-hairline">
      <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />

      <div className="shell relative z-[2] py-24 text-center">
        <Mark className="mx-auto h-11 w-11 text-slate" />

        <p className="mt-8 font-mono text-[11px] uppercase tracking-technical text-volt">
          Error 404
        </p>

        <h1 className="mx-auto mt-6 max-w-3xl font-display text-d-lg font-bold uppercase tracking-display text-chalk">
          No such page
        </h1>

        <p className="mx-auto mt-7 max-w-md text-[15px] leading-relaxed text-steel">
          The link is wrong, or the thing it pointed at has been removed. The workshop is still here.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            Back to the homepage
          </Link>
          <Link href="/store" className="btn-ghost">
            Browse the store
          </Link>
          <Link href="/contact" className="btn-quiet">
            Ask us directly
          </Link>
        </div>
      </div>
    </section>
  );
}
