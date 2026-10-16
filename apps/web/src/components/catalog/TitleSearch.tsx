'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GENRES, LABELS, type Genre, type TitleEntry } from '@arkvolt/shared';

/**
 * The title index is a reference tool, so it is built like one: instant
 * client-side filtering over a cached index, keyboard navigable, and results
 * that state what they are — a request form, not a checkout.
 *
 * The whole index is a few hundred rows of text, so it is fetched once and
 * filtered in memory. Zero network round-trips per keystroke.
 */

interface IndexedTitle extends TitleEntry {
  haystack: string;
}

const PER_PAGE = 60;

export const TitleSearch = ({
  variant = 'page',
  limit,
}: {
  variant?: 'page' | 'panel';
  limit?: number;
}) => {
  const [all, setAll] = useState<IndexedTitle[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<Genre | 'ALL'>('ALL');
  const [visible, setVisible] = useState(PER_PAGE);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // Fetch the full index in one call, then filter locally.
        const res = await fetch('/api/catalog/titles?perPage=120&page=1');
        if (!res.ok) throw new Error('bad response');
        const first = (await res.json()) as { data: TitleEntry[]; meta: { totalPages: number } };

        let rows = first.data;
        for (let page = 2; page <= Math.min(first.meta.totalPages, 6); page += 1) {
          const next = await fetch(`/api/catalog/titles?perPage=120&page=${page}`);
          if (!next.ok) break;
          const payload = (await next.json()) as { data: TitleEntry[] };
          rows = rows.concat(payload.data);
        }

        if (!cancelled) {
          setAll(
            rows.map((t) => ({
              ...t,
              haystack: `${t.name} ${t.series ?? ''}`.toLowerCase(),
            })),
          );
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    if (!all) return [];
    const needle = query.trim().toLowerCase();
    return all.filter((t) => {
      if (genre !== 'ALL' && t.genre !== genre) return false;
      if (!needle) return true;
      return t.haystack.includes(needle);
    });
  }, [all, query, genre]);

  // Reset pagination whenever the filter changes, or the user is left
  // looking at an empty list on page 4 of a 3-result search.
  useEffect(() => setVisible(PER_PAGE), [query, genre]);

  const shown = limit ? results.slice(0, limit) : results.slice(0, visible);
  const genresPresent = useMemo(() => {
    if (!all) return [] as Genre[];
    const present = new Set(all.map((t) => t.genre));
    return GENRES.filter((g) => present.has(g));
  }, [all]);

  const isPanel = variant === 'panel';

  return (
    <div className={isPanel ? 'border border-hairline bg-void' : ''}>
      {/* Search + filter bar */}
      <div className={isPanel ? 'border-b border-hairline p-5' : ''}>
        <div className="relative">
          <label htmlFor="title-search" className="sr-only">
            Search titles
          </label>
          <svg
            viewBox="0 0 18 18"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate"
            fill="none"
            aria-hidden
          >
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M12.5 12.5 16 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
          </svg>
          <input
            id="title-search"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or franchise — try “Far Cry” or “Assassin”"
            autoComplete="off"
            className="field pl-11"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 font-mono text-[10px] uppercase tracking-technical text-slate hover:text-chalk"
            >
              Clear
            </button>
          )}
        </div>

        {!isPanel && genresPresent.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGenre('ALL')}
              className={`chip transition-colors ${genre === 'ALL' ? 'chip-volt' : 'hover:border-steel hover:text-chalk'}`}
            >
              All
            </button>
            {genresPresent.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(g)}
                className={`chip transition-colors ${genre === g ? 'chip-volt' : 'hover:border-steel hover:text-chalk'}`}
              >
                {LABELS.Genre[g]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className={isPanel ? 'p-2' : 'mt-8'}>
        {failed && (
          <div className="border border-hairline bg-plate p-8 text-center">
            <p className="text-[14px] text-steel">The title index could not be loaded.</p>
            <p className="mt-2 text-[12px] text-slate">
              Message us the title directly and we will quote the setup.
            </p>
          </div>
        )}

        {!failed && all === null && (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        )}

        {!failed && all !== null && results.length === 0 && (
          <div className={isPanel ? 'p-6' : 'border border-hairline p-10'}>
            <p className="font-display text-2xl uppercase tracking-display text-steel">
              Not in the index
            </p>
            <p className="mt-3 max-w-md text-[13px] leading-relaxed text-steel">
              That does not mean we cannot help — the index covers what we have prepared before, not
              everything that exists. Send us the title and your machine specification and we will
              tell you whether it will run and what setup would cost.
            </p>
            <Link
              href={`/titles/request?title=${encodeURIComponent(query)}`}
              className="btn-primary btn-sm mt-6"
            >
              Request “{query || 'this title'}”
            </Link>
          </div>
        )}

        {!failed && shown.length > 0 && (
          <>
            <ul className={isPanel ? '' : 'grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-3'}>
              {shown.map((title) => (
                <li key={title.id} className={isPanel ? 'border-b border-hairline last:border-b-0' : 'bg-void'}>
                  <Link
                    href={`/titles/request?title=${encodeURIComponent(title.name)}`}
                    className={`group flex items-center justify-between gap-4 transition-colors duration-200 ${
                      isPanel ? 'px-4 py-3.5 hover:bg-plate' : 'p-5 hover:bg-gunmetal'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] text-chalk transition-colors group-hover:text-volt">
                        {title.name}
                      </span>
                      {title.series && (
                        <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-technical text-slate">
                          {title.series}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {!isPanel && (
                        <span className="font-mono text-[9px] uppercase tracking-technical text-slate">
                          {LABELS.Genre[title.genre]}
                        </span>
                      )}
                      <svg viewBox="0 0 16 16" className="h-3 w-3 text-slate transition-colors group-hover:text-volt" fill="none" aria-hidden>
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className={`flex items-center justify-between gap-4 ${isPanel ? 'border-t border-hairline px-4 py-4' : 'mt-8'}`}>
              <p className="font-mono text-[10px] tabular-nums uppercase tracking-technical text-slate">
                {results.length} {results.length === 1 ? 'title' : 'titles'}
                {limit && results.length > limit ? ` · showing ${limit}` : ''}
              </p>

              {limit && results.length > limit ? (
                <Link href="/titles" className="btn-quiet btn-sm">
                  View all
                </Link>
              ) : (
                !limit &&
                visible < results.length && (
                  <button type="button" onClick={() => setVisible((v) => v + PER_PAGE)} className="btn-ghost btn-sm">
                    Show more
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
