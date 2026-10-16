'use client';

import { useCallback, useEffect, useState } from 'react';
import { LABELS, PRODUCT_KINDS, type Category } from '@arkvolt/shared';
import { adminApi, ApiRequestError } from '@/lib/api';
import { PageHeader, Panel, TableShell, Th, Td, EmptyState, LoadingRows, ErrorBanner, Field, toFieldErrors } from '@/components/admin/ui';

export default function AdminCategoriesPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({ name: '', kind: 'PART', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await adminApi.categories());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setSaving(true);
    setErrors({});
    try {
      await adminApi.createCategory({ ...draft, slug: undefined, sortOrder: rows.length });
      setDraft({ name: '', kind: 'PART', description: '' });
      await load();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(toFieldErrors(err));
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category: Category) => {
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    try {
      await adminApi.deleteCategory(category.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that category');
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Categories group the catalogue and drive the filters on the store page. A category cannot be deleted while products still sit in it."
      />

      <div className="grid gap-8 px-5 py-8 lg:grid-cols-[1.6fr_1fr] lg:px-8">
        <Panel title={`${rows.length} categories`}>
          {error && <ErrorBanner message={error} onRetry={() => void load()} />}
          {loading && <LoadingRows />}
          {!loading && rows.length === 0 && (
            <EmptyState title="No categories" body="Create your first category on the right to start grouping products." />
          )}

          {!loading && rows.length > 0 && (
            <TableShell>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Slug</Th>
                  <Th>Products</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-plate/60">
                    <Td>
                      <span className="text-chalk">{c.name}</span>
                      {c.description && <span className="mt-0.5 block max-w-[320px] truncate text-[11.5px] text-slate">{c.description}</span>}
                    </Td>
                    <Td className="text-[12px]">{LABELS.ProductKind[c.kind]}</Td>
                    <Td className="font-mono text-[11px] text-slate">{c.slug}</Td>
                    <Td numeric className="text-chalk">{c.productCount ?? 0}</Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => void remove(c)}
                        disabled={(c.productCount ?? 0) > 0}
                        title={(c.productCount ?? 0) > 0 ? 'Move the products out first' : 'Delete'}
                        className="font-mono text-[10px] uppercase tracking-technical text-slate transition-colors hover:text-crimson disabled:cursor-not-allowed disabled:opacity-30"
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

        <Panel title="Add a category">
          <div className="space-y-5 p-5">
            <Field label="Name" required error={errors.name}>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="field" placeholder="Cooling & Fans" />
            </Field>

            <Field label="Type" error={errors.kind}>
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className="field appearance-none bg-plate">
                {PRODUCT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {LABELS.ProductKind[k]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Description" hint="Shown under the heading on the store page.">
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} className="field resize-y" />
            </Field>

            <button type="button" onClick={() => void create()} disabled={saving || !draft.name.trim()} className="btn-primary w-full justify-center">
              {saving ? 'Creating…' : 'Create category'}
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
