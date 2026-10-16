'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  PRICE_TYPES, PRODUCT_KINDS, PRODUCT_STATUSES, LABELS,
  type Category, type Product,
} from '@arkvolt/shared';
import { adminApi, ApiRequestError } from '@/lib/api';
import { PageHeader, Panel, Field, toFieldErrors, ErrorBanner } from '@/components/admin/ui';

/* ------------------------------------------------------------------ *
 * Product editor
 *
 * The form is long because a product genuinely has a lot of structured
 * detail — specifications, requirements, an install procedure. Rather than
 * hide that behind vague "advanced" toggles, it is presented as a set of
 * repeatable row editors, which is how an owner actually thinks about a
 * spec sheet.
 * ------------------------------------------------------------------ */

interface RepeatRow {
  a: string;
  b: string;
}

interface Draft {
  name: string;
  slug: string;
  sku: string;
  kind: string;
  status: string;
  categoryId: string;
  tagline: string;
  shortDescription: string;
  description: string;
  price: string;
  compareAtPrice: string;
  priceType: string;
  stock: string;
  trackStock: boolean;
  isFeatured: boolean;
  sortOrder: string;
  deliveryNotes: string;
  metaTitle: string;
  metaDescription: string;
  tags: string;
  includedText: string;
  images: { url: string; alt: string; publicId?: string }[];
  specs: RepeatRow[];
  requirements: { label: string; itemsText: string }[];
  installSteps: RepeatRow[];
}

const emptyDraft = (categoryId: string): Draft => ({
  name: '',
  slug: '',
  sku: '',
  kind: 'PART',
  status: 'DRAFT',
  categoryId,
  tagline: '',
  shortDescription: '',
  description: '',
  price: '',
  compareAtPrice: '',
  priceType: 'FIXED',
  stock: '0',
  trackStock: true,
  isFeatured: false,
  sortOrder: '0',
  deliveryNotes: '',
  metaTitle: '',
  metaDescription: '',
  tags: '',
  includedText: '',
  images: [],
  specs: [{ a: '', b: '' }],
  requirements: [{ label: 'Your machine must have', itemsText: '' }],
  installSteps: [{ a: '', b: '' }],
});

const fromProduct = (p: Product): Draft => ({
  name: p.name,
  slug: p.slug,
  sku: p.sku,
  kind: p.kind,
  status: p.status,
  categoryId: p.categoryId,
  tagline: p.tagline,
  shortDescription: p.shortDescription,
  description: p.description,
  price: String(p.priceKobo / 100),
  compareAtPrice: p.compareAtKobo ? String(p.compareAtKobo / 100) : '',
  priceType: p.priceType,
  stock: String(p.stock),
  trackStock: p.trackStock,
  isFeatured: p.isFeatured,
  sortOrder: String(p.sortOrder),
  deliveryNotes: p.deliveryNotes ?? '',
  metaTitle: p.metaTitle ?? '',
  metaDescription: p.metaDescription ?? '',
  tags: p.tags.join(', '),
  includedText: p.included.join('\n'),
  images: p.images.map((i) => ({ url: i.url, alt: i.alt, publicId: i.publicId })),
  specs: p.specs.length ? p.specs.map((s) => ({ a: s.label, b: s.value })) : [{ a: '', b: '' }],
  requirements: p.requirements.length
    ? p.requirements.map((r) => ({ label: r.label, itemsText: r.items.join('\n') }))
    : [{ label: '', itemsText: '' }],
  installSteps: p.installSteps.length
    ? p.installSteps.map((s) => ({ a: s.title, b: s.detail }))
    : [{ a: '', b: '' }],
});

export const ProductEditor = ({ productId }: { productId?: string }) => {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(Boolean(productId));

  useEffect(() => {
    adminApi
      .categories()
      .then((cats) => {
        setCategories(cats);
        if (!productId) setDraft(emptyDraft(cats[0]?.id ?? ''));
      })
      .catch(() => setBanner('Could not load categories.'));
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    adminApi
      .product(productId)
      .then((p) => setDraft(fromProduct(p)))
      .catch((err: Error) => setBanner(err.message))
      .finally(() => setLoading(false));
  }, [productId]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setBanner(null);
    try {
      const uploaded: { url: string; alt: string; publicId?: string }[] = [];
      for (const file of Array.from(files).slice(0, 6)) {
        const asset = await adminApi.upload(file, 'products');
        uploaded.push({ url: asset.url, alt: '', publicId: asset.publicId });
      }
      setDraft((d) => (d ? { ...d, images: [...d.images, ...uploaded] } : d));
    } catch (err) {
      setBanner(err instanceof ApiRequestError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (publish = false) => {
    if (!draft) return;
    setSaving(true);
    setBanner(null);
    setErrors({});

    const payload = {
      name: draft.name,
      ...(draft.slug ? { slug: draft.slug } : {}),
      sku: draft.sku,
      kind: draft.kind,
      status: publish ? 'ACTIVE' : draft.status,
      categoryId: draft.categoryId,
      tagline: draft.tagline,
      shortDescription: draft.shortDescription,
      description: draft.description,
      price: Number(draft.price || 0),
      compareAtPrice: draft.compareAtPrice === '' ? '' : Number(draft.compareAtPrice),
      priceType: draft.priceType,
      stock: Number(draft.stock || 0),
      trackStock: draft.trackStock,
      isFeatured: draft.isFeatured,
      sortOrder: Number(draft.sortOrder || 0),
      deliveryNotes: draft.deliveryNotes,
      metaTitle: draft.metaTitle,
      metaDescription: draft.metaDescription,
      tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
      included: draft.includedText.split('\n').map((t) => t.trim()).filter(Boolean),
      images: draft.images.map((i) => ({ url: i.url, alt: i.alt, ...(i.publicId ? { publicId: i.publicId } : {}) })),
      specs: draft.specs.filter((s) => s.a.trim() && s.b.trim()).map((s) => ({ label: s.a.trim(), value: s.b.trim() })),
      requirements: draft.requirements
        .filter((r) => r.label.trim())
        .map((r) => ({ label: r.label.trim(), items: r.itemsText.split('\n').map((x) => x.trim()).filter(Boolean) })),
      installSteps: draft.installSteps
        .filter((s) => s.a.trim() && s.b.trim())
        .map((s) => ({ title: s.a.trim(), detail: s.b.trim() })),
    };

    try {
      if (productId) await adminApi.updateProduct(productId, payload);
      else {
        const created = await adminApi.createProduct(payload);
        router.replace(`/admin/products/${created.id}`);
      }
      router.refresh();
      setBanner(productId ? 'Saved.' : null);
      if (productId) setDraft((d) => (d ? { ...d, status: publish ? 'ACTIVE' : d.status } : d));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(toFieldErrors(err));
        setBanner(err.message);
      } else {
        setBanner('Could not save. Check the highlighted fields.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !draft) {
    return (
      <>
        <PageHeader title="Loading…" />
        <div className="p-8">
          <div className="skeleton h-64" />
        </div>
      </>
    );
  }

  const rowsEditor = (
    rows: RepeatRow[],
    key: 'specs' | 'installSteps',
    labelA: string,
    labelB: string,
    placeholderA: string,
    placeholderB: string,
  ) => (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-start gap-3">
          <input
            value={row.a}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { a: e.target.value, b: row.b };
              set(key, next);
            }}
            placeholder={placeholderA}
            className="field flex-1"
            aria-label={`${labelA} ${i + 1}`}
          />
          <input
            value={row.b}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { a: row.a, b: e.target.value };
              set(key, next);
            }}
            placeholder={placeholderB}
            className="field flex-[1.6]"
            aria-label={`${labelB} ${i + 1}`}
          />
          <button
            type="button"
            onClick={() => set(key, rows.filter((_, idx) => idx !== i))}
            className="flex h-[46px] w-11 shrink-0 items-center justify-center border border-hairline text-slate transition-colors hover:border-crimson hover:text-crimson"
            aria-label={`Remove row ${i + 1}`}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      ))}
      <button type="button" onClick={() => set(key, [...rows, { a: '', b: '' }])} className="btn-ghost btn-sm">
        + Add row
      </button>
    </div>
  );

  return (
    <>
      <PageHeader
        title={productId ? 'Edit product' : 'New product'}
        subtitle={
          productId
            ? 'Changes are published the moment you save. Every edit is recorded in the activity log with the fields that changed.'
            : 'Create the listing here. Save as a draft, review it on the storefront, then publish when it is ready.'
        }
        actions={
          <>
            <button type="button" onClick={() => void save(false)} disabled={saving} className="btn-ghost btn-sm">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => void save(true)} disabled={saving} className="btn-primary btn-sm">
              Save &amp; publish
            </button>
          </>
        }
      />

      <div className="px-5 py-8 lg:px-8">
        {banner && <div className="mb-6"><ErrorBanner message={banner} /></div>}

        <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-8">
            <Panel title="Identity">
              <div className="space-y-5 p-5">
                <Field label="Product name" required error={errors.name}>
                  <input value={draft.name} onChange={(e) => set('name', e.target.value)} className="field" placeholder="1TB NVMe Gen4 SSD — Supplied & Fitted" />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="SKU" required error={errors.sku} hint="Uppercase. Used on order lines and in reports.">
                    <input value={draft.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} className="field font-mono" placeholder="AV-STO-1TBNVME" />
                  </Field>
                  <Field label="URL slug" error={errors.slug} hint={productId ? 'Changing this breaks existing links.' : 'Leave blank to generate from the name.'}>
                    <input value={draft.slug} onChange={(e) => set('slug', e.target.value)} className="field font-mono" placeholder="arkvolt-nvme-1tb-gen4" />
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Type" error={errors.kind}>
                    <select value={draft.kind} onChange={(e) => set('kind', e.target.value)} className="field appearance-none bg-plate">
                      {PRODUCT_KINDS.map((k) => (
                        <option key={k} value={k}>{LABELS.ProductKind[k]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Category" required error={errors.categoryId}>
                    <select value={draft.categoryId} onChange={(e) => set('categoryId', e.target.value)} className="field appearance-none bg-plate">
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select value={draft.status} onChange={(e) => set('status', e.target.value)} className="field appearance-none bg-plate">
                      {PRODUCT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.toLowerCase()}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Tagline" hint="One line. Appears on the storefront card.">
                  <input value={draft.tagline} onChange={(e) => set('tagline', e.target.value)} className="field" />
                </Field>

                <Field label="Short description" hint="Appears in search results and social previews.">
                  <textarea value={draft.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} rows={2} className="field resize-y" />
                </Field>

                <Field label="Full description" hint="Blank line between paragraphs. Do not use this space for specification — there is a table for that.">
                  <textarea value={draft.description} onChange={(e) => set('description', e.target.value)} rows={8} className="field resize-y" />
                </Field>
              </div>
            </Panel>

            <Panel title="Specification">
              <div className="p-5">
                <p className="mb-4 text-[12px] leading-relaxed text-slate">
                  Label on the left, value on the right. Rendered as the specification table on the product page.
                </p>
                {rowsEditor(draft.specs, 'specs', 'Label', 'Value', 'Capacity', '1 TB')}
              </div>
            </Panel>

            <Panel title="Compatibility requirements">
              <div className="space-y-5 p-5">
                <p className="text-[12px] leading-relaxed text-slate">
                  These are a genuine pre-purchase filter, not marketing. Stated clearly they prevent
                  the wrong purchase and the support call that follows it.
                </p>

                {draft.requirements.map((group, i) => (
                  <div key={i} className="space-y-3 border border-hairline p-4">
                    <div className="flex gap-3">
                      <input
                        value={group.label}
                        onChange={(e) => {
                          const next = [...draft.requirements];
                          next[i] = { label: e.target.value, itemsText: group.itemsText };
                          set('requirements', next);
                        }}
                        placeholder="Group heading, e.g. Your machine must have"
                        className="field flex-1"
                        aria-label={`Requirement group ${i + 1} heading`}
                      />
                      <button
                        type="button"
                        onClick={() => set('requirements', draft.requirements.filter((_, idx) => idx !== i))}
                        className="flex h-[46px] w-11 shrink-0 items-center justify-center border border-hairline text-slate hover:border-crimson hover:text-crimson"
                        aria-label={`Remove requirement group ${i + 1}`}
                      >
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </button>
                    </div>
                    <textarea
                      value={group.itemsText}
                      onChange={(e) => {
                        const next = [...draft.requirements];
                        next[i] = { label: group.label, itemsText: e.target.value };
                        set('requirements', next);
                      }}
                      rows={4}
                      placeholder={'One requirement per line\nAn M.2 M-key slot on the motherboard\nPCIe 3.0 slots are supported'}
                      className="field resize-y"
                      aria-label={`Requirement group ${i + 1} items`}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => set('requirements', [...draft.requirements, { label: '', itemsText: '' }])}
                  className="btn-ghost btn-sm"
                >
                  + Add requirement group
                </button>
              </div>
            </Panel>

            <Panel title="Procedure">
              <div className="p-5">
                <p className="mb-4 text-[12px] leading-relaxed text-slate">
                  Step title, then what actually happens. Three to five steps reads best; more than
                  that and nobody finishes it.
                </p>
                {rowsEditor(draft.installSteps, 'installSteps', 'Step title', 'What happens', 'Model check', 'We confirm your machine has a free M.2 slot…')}
              </div>
            </Panel>

            <Panel title="What is included">
              <div className="p-5">
                <Field label="One item per line">
                  <textarea value={draft.includedText} onChange={(e) => set('includedText', e.target.value)} rows={5} className="field resize-y" placeholder={'1TB PCIe 4.0 NVMe drive\nFitting at our bench\nFull data migration'} />
                </Field>
              </div>
            </Panel>
          </div>

          {/* Side column */}
          <div className="space-y-8 xl:sticky xl:top-24 xl:self-start">
            <Panel title="Pricing">
              <div className="space-y-5 p-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Price (₦)" required error={errors.price} hint="Whole naira, no symbols.">
                    <input type="number" min={0} value={draft.price} onChange={(e) => set('price', e.target.value)} className="field" />
                  </Field>
                  <Field label="Compare at (₦)" hint="Optional. Shows a struck-through price.">
                    <input type="number" min={0} value={draft.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} className="field" />
                  </Field>
                </div>

                <Field label="Price display">
                  <select value={draft.priceType} onChange={(e) => set('priceType', e.target.value)} className="field appearance-none bg-plate">
                    {PRICE_TYPES.map((t) => (
                      <option key={t} value={t}>{LABELS.PriceType[t]}</option>
                    ))}
                  </select>
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Stock quantity">
                    <input type="number" min={0} value={draft.stock} onChange={(e) => set('stock', e.target.value)} className="field" disabled={!draft.trackStock} />
                  </Field>
                  <Field label="Sort order" hint="Lower numbers appear first.">
                    <input type="number" min={0} value={draft.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className="field" />
                  </Field>
                </div>

                <div className="space-y-3 border-t border-hairline pt-5">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={draft.trackStock} onChange={(e) => set('trackStock', e.target.checked)} className="h-4 w-4 accent-[#00D4FF]" />
                    <span className="text-[13px] text-chalk">Track stock</span>
                  </label>
                  <p className="pl-7 text-[11px] leading-relaxed text-slate">
                    Untracked items never sell out — suitable for made-to-order work.
                  </p>

                  <label className="flex cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={draft.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="h-4 w-4 accent-[#00D4FF]" />
                    <span className="text-[13px] text-chalk">Feature on the homepage</span>
                  </label>
                </div>
              </div>
            </Panel>

            <Panel title="Images">
              <div className="space-y-4 p-5">
                {draft.images.length > 0 && (
                  <ul className="grid grid-cols-3 gap-px bg-hairline">
                    {draft.images.map((image, i) => (
                      <li key={image.url + i} className="relative aspect-square bg-plate">
                        <Image src={image.url} alt={image.alt} fill sizes="140px" className="object-cover" />
                        <button
                          type="button"
                          onClick={() => set('images', draft.images.filter((_, idx) => idx !== i))}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center border border-hairline bg-void/90 text-slate hover:text-crimson"
                          aria-label={`Remove image ${i + 1}`}
                        >
                          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
                            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-hairline-strong px-4 py-8 text-center transition-colors hover:border-volt">
                  <input type="file" accept="image/*" multiple onChange={(e) => void upload(e.target.files)} className="sr-only" disabled={uploading} />
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate" fill="none" aria-hidden>
                    <path d="M12 16V4m0 0L7 9m5-5 5 5M3 17v3h18v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
                  </svg>
                  <span className="font-mono text-[10px] uppercase tracking-technical text-steel">
                    {uploading ? 'Uploading…' : 'Choose images'}
                  </span>
                  <span className="text-[10px] text-slate">JPG, PNG, WebP or AVIF · max 8MB each</span>
                </label>

                <p className="text-[11px] leading-relaxed text-slate">
                  Images go to Cloudinary when it is configured, and to local storage otherwise. The
                  first image is used on the storefront card and as the social preview.
                </p>
              </div>
            </Panel>

            <Panel title="Delivery & metadata">
              <div className="space-y-5 p-5">
                <Field label="Delivery notes" hint="Shown on the product page under Delivery.">
                  <textarea value={draft.deliveryNotes} onChange={(e) => set('deliveryNotes', e.target.value)} rows={3} className="field resize-y" />
                </Field>
                <Field label="Tags" hint="Comma separated. Used for search and related links.">
                  <input value={draft.tags} onChange={(e) => set('tags', e.target.value)} className="field" placeholder="nvme, ssd, upgrade" />
                </Field>
                <Field label="Meta title" hint="Leave blank to use the product name.">
                  <input value={draft.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} className="field" />
                </Field>
                <Field label="Meta description" hint="Up to 320 characters.">
                  <textarea value={draft.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} rows={2} className="field resize-y" />
                </Field>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
};
