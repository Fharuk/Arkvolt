'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LABELS, PRICE_TYPES, PRODUCT_STATUSES, formatNaira,
  type Service, type PriceType, type ProductStatus, type InstallStep,
} from '@arkvolt/shared';
import { adminApi, ApiRequestError } from '@/lib/api';
import {
  PageHeader, Panel, TableShell, Th, Td, LoadingRows, ErrorBanner, Field,
  toFieldErrors, StatusChip, EmptyState,
} from '@/components/admin/ui';

type Faq = { q: string; a: string };

type Draft = {
  name: string;
  slug: string;
  tagline: string;
  shortDescription: string;
  description: string;
  turnaround: string;
  durationMins: string;
  price: string;
  priceType: PriceType;
  includes: string[];
  process: InstallStep[];
  faqs: Faq[];
  status: ProductStatus;
  isFeatured: boolean;
  images: { url: string; alt: string }[];
};

const emptyDraft = (): Draft => ({
  name: '',
  slug: '',
  tagline: '',
  shortDescription: '',
  description: '',
  turnaround: '',
  durationMins: '',
  price: '',
  priceType: 'FROM',
  includes: [''],
  process: [],
  faqs: [],
  status: 'ACTIVE',
  isFeatured: false,
  images: [],
});

const fromService = (s: Service): Draft => ({
  name: s.name,
  slug: s.slug,
  tagline: s.tagline,
  shortDescription: s.shortDescription,
  description: s.description,
  turnaround: s.turnaround,
  durationMins: s.durationMins === null ? '' : String(s.durationMins),
  price: String(s.priceKobo / 100),
  priceType: s.priceType,
  includes: s.includes.length ? s.includes : [''],
  process: s.process ?? [],
  faqs: s.faqs ?? [],
  status: s.status,
  isFeatured: s.isFeatured,
  images: s.images.map((i) => ({ url: i.url, alt: i.alt ?? '' })),
});

/**
 * Repair services.
 *
 * A price here is a "from" figure — the booking flow collects the detail needed
 * for a real quote. Requirements a customer must meet go in the tagline or
 * short description, which the service page renders in its side rail.
 */
export default function AdminServicesPage() {
  const [rows, setRows] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await adminApi.services());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEditor = (service: Service) => {
    setErrors({});
    setError(null);
    setEditingId(service.id);
    setDraft(fromService(service));
  };

  const startNew = () => {
    setEditingId('new');
    setDraft(emptyDraft());
    setErrors({});
    setError(null);
  };

  const close = () => {
    setEditingId(null);
    setDraft(null);
    setErrors({});
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: '' }));
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || !draft) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).slice(0, 4).map((f) => adminApi.upload(f, 'services')));
      set('images', [...draft.images, ...uploaded.map((u) => ({ url: u.url, alt: draft.name }))].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!draft || !editingId) return;
    setSaving(true);
    setErrors({});
    setError(null);

    const body = {
      name: draft.name,
      slug: draft.slug || undefined,
      tagline: draft.tagline,
      shortDescription: draft.shortDescription,
      description: draft.description,
      price: Number(draft.price || 0),
      priceType: draft.priceType,
      durationMins: draft.durationMins === '' ? '' : Number(draft.durationMins),
      turnaround: draft.turnaround,
      includes: draft.includes.map((s) => s.trim()).filter(Boolean),
      process: draft.process.filter((p) => p.title.trim()),
      faqs: draft.faqs.filter((f) => f.q.trim() && f.a.trim()),
      status: draft.status,
      isFeatured: draft.isFeatured,
      images: draft.images,
    };

    try {
      if (editingId === 'new') {
        const created = await adminApi.createService(body);
        setEditingId(created.id);
        setDraft(fromService(created));
      } else {
        const updated = await adminApi.updateService(editingId, body);
        setDraft(fromService(updated));
      }
      await load();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(toFieldErrors(err));
        setError(err.message);
      } else {
        setError('Could not save that service.');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (service: Service) => {
    if (!window.confirm(`Delete "${service.name}"? Services already used by a booking are archived instead.`)) return;
    try {
      const result = await adminApi.deleteService(service.id);
      if (result.archived) window.alert('This service is referenced by an existing booking, so it was archived rather than deleted. It is hidden from the storefront but the booking history stays intact.');
      if (editingId === service.id) close();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that service');
    }
  };

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="Bookable repair and setup work. Prices are “from” figures shown across the site; the real quote is agreed on WhatsApp or at the bench."
        actions={
          <button type="button" onClick={startNew} className="btn-primary btn-sm">
            New service
          </button>
        }
      />

      <div className="grid items-start gap-8 px-5 py-8 lg:grid-cols-[1.5fr_1fr] lg:px-8">
        <Panel title={`${rows.length} services`}>
          {error && !draft && <ErrorBanner message={error} onRetry={() => void load()} />}
          {loading && <LoadingRows />}
          {!loading && rows.length === 0 && (
            <EmptyState title="No services" body="Add the work you take on — diagnostics, upgrades, board-level repair, in-home setup." action={<button type="button" onClick={startNew} className="btn-primary btn-sm">New service</button>} />
          )}

          {!loading && rows.length > 0 && (
            <TableShell>
              <thead>
                <tr>
                  <Th>Service</Th>
                  <Th>From</Th>
                  <Th>Turnaround</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openEditor(s)}
                    className={`cursor-pointer transition-colors hover:bg-plate/60 ${editingId === s.id ? 'bg-plate/60' : ''}`}
                  >
                    <Td>
                      <span className="text-chalk">{s.name}</span>
                      <span className="mt-0.5 block max-w-[380px] truncate text-[11.5px] text-slate">{s.tagline}</span>
                    </Td>
                    <Td numeric className="text-chalk">
                      {s.priceType === 'FROM' ? 'From ' : ''}
                      {formatNaira(s.priceKobo)}
                    </Td>
                    <Td className="text-[12px] text-steel">{s.turnaround || '—'}</Td>
                    <Td><StatusChip status={s.status} /></Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void remove(s); }}
                        className="font-mono text-[10px] uppercase tracking-technical text-slate transition-colors hover:text-crimson"
                      >
                        Delete
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Panel>

        {!draft ? (
          <Panel title="Editing">
            <div className="p-5">
              <p className="text-[12.5px] leading-relaxed text-slate">
                Pick a service to edit its copy, starting price, turnaround and inclusions — or
                create a new one. Changes appear on the storefront, the repairs index and the
                booking form as soon as they are saved.
              </p>
              <ul className="mt-5 space-y-2.5">
                {rows.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 bg-volt" aria-hidden />
                    <span className="text-[12px] text-steel">{s.name}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={startNew} className="btn-ghost btn-sm mt-6">
                New service
              </button>
            </div>
          </Panel>
        ) : (
          <Panel
            title={editingId === 'new' ? 'New service' : `Editing — ${draft.name || 'untitled'}`}
            action={
              <button type="button" onClick={close} className="font-mono text-[10px] uppercase tracking-technical text-slate hover:text-chalk">
                Close
              </button>
            }
          >
            <div className="space-y-5 p-5">
              {error && <ErrorBanner message={error} />}
              {editingId === 'new' && (
                <p className="border border-volt/30 bg-volt/[0.04] px-3.5 py-3 text-[12px] leading-relaxed text-steel">
                  Saving creates the service straight away. Untick “Bookable” below if you want to
                  draft it privately before it appears on the site.
                </p>
              )}

              <Field label="Name" required error={errors.name}>
                <input value={draft.name} onChange={(e) => set('name', e.target.value)} className="field" placeholder="Laptop board-level repair" />
              </Field>

              <Field label="URL slug" hint="Leave blank and one is generated from the name. Changing this breaks old links.">
                <input value={draft.slug} onChange={(e) => set('slug', e.target.value)} className="field font-mono text-[12px]" placeholder="laptop-board-repair" />
              </Field>

              <Field label="Tagline" error={errors.tagline} hint="One line, shown under the name in listings.">
                <input value={draft.tagline} onChange={(e) => set('tagline', e.target.value)} className="field" placeholder="Short circuits, liquid damage, dead rails." />
              </Field>

              <Field label="Short description" error={errors.shortDescription} hint="Two lines maximum on cards and in search results.">
                <textarea value={draft.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} rows={2} className="field resize-y" />
              </Field>

              <Field label="Full description" error={errors.description}>
                <textarea value={draft.description} onChange={(e) => set('description', e.target.value)} rows={5} className="field resize-y" />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Starting price (₦)" required error={errors.price}>
                  <input type="number" min={0} value={draft.price} onChange={(e) => set('price', e.target.value)} className="field" placeholder="15000" />
                </Field>
                <Field label="Price display" error={errors.priceType}>
                  <select value={draft.priceType} onChange={(e) => set('priceType', e.target.value as PriceType)} className="field appearance-none bg-plate">
                    {PRICE_TYPES.map((p) => (
                      <option key={p} value={p}>{LABELS.PriceType[p]}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Turnaround" hint="Plain language: “2–4 hours on the bench”.">
                  <input value={draft.turnaround} onChange={(e) => set('turnaround', e.target.value)} className="field" />
                </Field>
                <Field label="Duration (minutes)" hint="Used for appointment scheduling. Leave blank if open-ended.">
                  <input type="number" min={15} max={2880} step={15} value={draft.durationMins} onChange={(e) => set('durationMins', e.target.value)} className="field" placeholder="90" />
                </Field>
              </div>

              {/* Inclusions ------------------------------------------------- */}
              <div className="border-t border-hairline pt-5">
                <p className="field-label">What&apos;s included</p>
                <div className="space-y-2">
                  {draft.includes.map((line, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={line}
                        onChange={(e) => {
                          const next = [...draft.includes];
                          next[i] = e.target.value;
                          set('includes', next);
                        }}
                        className="field"
                        placeholder="Thermal paste replacement"
                      />
                      <button
                        type="button"
                        aria-label="Remove line"
                        onClick={() => set('includes', draft.includes.filter((_, j) => j !== i))}
                        className="btn-ghost btn-sm shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {draft.includes.length < 20 && (
                    <button type="button" onClick={() => set('includes', [...draft.includes, ''])} className="btn-ghost btn-sm">
                      + Add line
                    </button>
                  )}
                </div>
              </div>

              {/* Procedure -------------------------------------------------- */}
              <div className="border-t border-hairline pt-5">
                <p className="field-label">Procedure</p>
                <div className="space-y-3">
                  {draft.process.map((step, i) => (
                    <div key={i} className="border border-hairline bg-plate/40 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="index-num">{String(i + 1).padStart(2, '0')}</span>
                        <button
                          type="button"
                          onClick={() => set('process', draft.process.filter((_, j) => j !== i))}
                          className="font-mono text-[10px] uppercase tracking-technical text-slate hover:text-crimson"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        value={step.title}
                        onChange={(e) => {
                          const next = [...draft.process];
                          next[i] = { ...next[i]!, title: e.target.value };
                          set('process', next);
                        }}
                        className="field mt-3"
                        placeholder="Intake inspection"
                      />
                      <textarea
                        value={step.detail}
                        onChange={(e) => {
                          const next = [...draft.process];
                          next[i] = { ...next[i]!, detail: e.target.value };
                          set('process', next);
                        }}
                        rows={2}
                        className="field mt-2 resize-y text-[12.5px]"
                        placeholder="What happens at this stage, and how long it takes."
                      />
                    </div>
                  ))}
                  {draft.process.length < 12 && (
                    <button type="button" onClick={() => set('process', [...draft.process, { title: '', detail: '' }])} className="btn-ghost btn-sm">
                      + Add step
                    </button>
                  )}
                </div>
              </div>

              {/* FAQs ------------------------------------------------------- */}
              <div className="border-t border-hairline pt-5">
                <p className="field-label">Questions</p>
                <div className="space-y-3">
                  {draft.faqs.map((faq, i) => (
                    <div key={i} className="space-y-2 border border-hairline bg-plate/40 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="index-num">{String(i + 1).padStart(2, '0')}</span>
                        <button
                          type="button"
                          onClick={() => set('faqs', draft.faqs.filter((_, j) => j !== i))}
                          className="font-mono text-[10px] uppercase tracking-technical text-slate hover:text-crimson"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        value={faq.q}
                        onChange={(e) => {
                          const next = [...draft.faqs];
                          next[i] = { ...next[i]!, q: e.target.value };
                          set('faqs', next);
                        }}
                        className="field"
                        placeholder="Do you replace the screen too?"
                      />
                      <textarea
                        value={faq.a}
                        onChange={(e) => {
                          const next = [...draft.faqs];
                          next[i] = { ...next[i]!, a: e.target.value };
                          set('faqs', next);
                        }}
                        rows={2}
                        className="field resize-y text-[12.5px]"
                      />
                    </div>
                  ))}
                  {draft.faqs.length < 12 && (
                    <button type="button" onClick={() => set('faqs', [...draft.faqs, { q: '', a: '' }])} className="btn-ghost btn-sm">
                      + Add question
                    </button>
                  )}
                </div>
              </div>

              {/* Imagery ---------------------------------------------------- */}
              <div className="border-t border-hairline pt-5">
                <p className="field-label">Imagery</p>
                <div className="flex flex-wrap gap-2">
                  {draft.images.map((img, i) => (
                    <div key={img.url} className="relative h-20 w-28 border border-hairline bg-void">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove image"
                        onClick={() => set('images', draft.images.filter((_, j) => j !== i))}
                        className="absolute right-0 top-0 bg-void/85 px-1.5 py-0.5 font-mono text-[10px] text-chalk hover:text-crimson"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <label className="btn-ghost btn-sm mt-3 cursor-pointer">
                  {uploading ? 'Uploading…' : 'Add images'}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void upload(e.target.files)} disabled={uploading || draft.images.length >= 6} />
                </label>
                <p className="mt-2 text-[11px] text-slate">Up to 6 images. First image is the cover.</p>
              </div>

              <div className="flex flex-wrap gap-5 border-t border-hairline pt-5">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={draft.status === 'ACTIVE'}
                    onChange={(e) => set('status', e.target.checked ? 'ACTIVE' : 'DRAFT')}
                    className="h-4 w-4 accent-[#00D4FF]"
                  />
                  <span className="text-[12.5px] text-chalk">Bookable</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={draft.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="h-4 w-4 accent-[#00D4FF]" />
                  <span className="text-[12.5px] text-chalk">Feature on the repairs page</span>
                </label>
                {draft.status === 'ARCHIVED' && (
                  <span className="self-center">
                    <StatusChip status="ARCHIVED" />
                  </span>
                )}
              </div>

              <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary w-full justify-center">
                {saving ? 'Saving…' : editingId === 'new' ? 'Create service' : 'Save service'}
              </button>
              {editingId !== 'new' && (
                <a href={`/repairs/${draft.slug}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm w-full justify-center">
                  View on the site ↗
                </a>
              )}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
