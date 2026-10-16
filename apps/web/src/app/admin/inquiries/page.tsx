'use client';

import { useCallback, useEffect, useState } from 'react';
import { INQUIRY_STATUSES, LABELS, formatDateTime, type Inquiry, type InquiryStatus } from '@arkvolt/shared';
import { adminApi } from '@/lib/api';
import {
  PageHeader, Panel, TableShell, Th, Td, StatusChip, EmptyState, LoadingRows,
  ErrorBanner, FilterBar, FilterChips, Pagination,
} from '@/components/admin/ui';

/** Enquiry inbox. Opening a row marks it read, which is what the admin means by "seen it". */
export default function AdminInquiriesPage() {
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [meta, setMeta] = useState({ page: 1, perPage: 25, total: 0, totalPages: 1 });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Inquiry | null>(null);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi.inquiries({ q: query, status, page });
        setRows(res.items);
        setMeta(res.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load enquiries');
      } finally {
        setLoading(false);
      }
    },
    [query, status],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const mark = async (inquiry: Inquiry, next: InquiryStatus) => {
    try {
      const updated = await adminApi.updateInquiry(inquiry.id, { status: next });
      setOpen(updated);
      await load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <>
      <PageHeader
        title="Enquiries"
        subtitle="Messages from the contact form, product pages and service pages. New ones are listed first."
      />

      <div className="px-5 py-8 lg:px-8">
        <Panel>
          <FilterBar query={query} onQuery={setQuery} placeholder="Search subject, name or message…">
            <FilterChips
              value={status}
              onChange={setStatus}
              options={[{ value: '', label: 'All' }, ...INQUIRY_STATUSES.map((s) => ({ value: s as string, label: LABELS.InquiryStatus[s] }))]}
            />
          </FilterBar>

          {error && <ErrorBanner message={error} onRetry={() => void load(meta.page)} />}
          {loading && <LoadingRows />}

          {!loading && !error && rows.length === 0 && (
            <EmptyState title="Inbox empty" body="Enquiries submitted through the website arrive here." />
          )}

          {!loading && rows.length > 0 && (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>Reference</Th>
                    <Th>From</Th>
                    <Th>Subject</Th>
                    <Th>Source</Th>
                    <Th>Status</Th>
                    <Th>Received</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inquiry) => (
                    <tr
                      key={inquiry.id}
                      onClick={() => {
                        setOpen(inquiry);
                        if (inquiry.status === 'NEW') void mark(inquiry, 'READ');
                      }}
                      className={`cursor-pointer transition-colors hover:bg-plate/60 ${
                        inquiry.status === 'NEW' ? 'bg-volt/[0.03]' : ''
                      }`}
                    >
                      <Td className="font-mono text-[11px] text-volt">{inquiry.ref}</Td>
                      <Td>
                        <span className="text-chalk">{inquiry.name}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-slate">{inquiry.phone}</span>
                      </Td>
                      <Td className="max-w-[280px] truncate text-chalk">{inquiry.subject}</Td>
                      <Td className="text-[12px]">{LABELS.InquirySource[inquiry.source]}</Td>
                      <Td><StatusChip status={inquiry.status} label={LABELS.InquiryStatus[inquiry.status]} /></Td>
                      <Td className="font-mono text-[11px] text-slate">{formatDateTime(inquiry.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
              <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={(p) => void load(p)} />
            </>
          )}
        </Panel>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={() => setOpen(null)} />
          <div className="relative flex h-full w-full max-w-[540px] flex-col overflow-y-auto border-l border-hairline bg-gunmetal">
            <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-hairline bg-gunmetal px-6 py-5">
              <div>
                <p className="font-mono text-[11px] tracking-wide text-volt">{open.ref}</p>
                <h2 className="mt-2 font-display text-[24px] font-semibold uppercase leading-tight tracking-display text-chalk">
                  {open.subject}
                </h2>
                <p className="mt-2 font-mono text-[10px] text-slate">{formatDateTime(open.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center border border-hairline text-steel hover:text-chalk"
                aria-label="Close"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </header>

            <div className="flex-1 space-y-8 p-6">
              <dl className="space-y-3">
                {[
                  ['From', open.name],
                  ['Phone', open.phone],
                  ['Email', open.email ?? '—'],
                  ['Source', LABELS.InquirySource[open.source]],
                  ...(open.relatedSlug ? ([['Related to', open.relatedSlug]] as const) : []),
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex gap-4">
                    <dt className="label-tech w-24 shrink-0 pt-0.5">{k}</dt>
                    <dd className="text-[12.5px] break-words leading-relaxed text-chalk">{v}</dd>
                  </div>
                ))}
              </dl>

              <section>
                <h3 className="font-mono text-[10px] uppercase tracking-technical text-volt">Message</h3>
                <p className="mt-3 whitespace-pre-wrap border-l border-hairline pl-4 text-[13.5px] leading-relaxed text-chalk">
                  {open.message}
                </p>
              </section>

              <section>
                <h3 className="font-mono text-[10px] uppercase tracking-technical text-volt">Reply</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={`https://wa.me/${open.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hi ${open.name.split(' ')[0]}, this is Arkvolt replying to your enquiry ${open.ref}.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary btn-sm"
                  >
                    Reply on WhatsApp
                  </a>
                  {open.email && (
                    <a
                      href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject} (${open.ref})`)}`}
                      className="btn-ghost btn-sm"
                    >
                      Reply by email
                    </a>
                  )}
                </div>
              </section>

              <section>
                <h3 className="font-mono text-[10px] uppercase tracking-technical text-volt">Triage</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {INQUIRY_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void mark(open, s)}
                      className={`chip transition-colors ${open.status === s ? 'chip-volt' : 'hover:border-steel hover:text-chalk'}`}
                    >
                      {LABELS.InquiryStatus[s]}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
