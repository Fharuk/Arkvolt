'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LABELS, PRODUCT_KINDS, PRODUCT_SORTS, formatNaira, type Category, type Product } from '@arkvolt/shared';
import { adminApi } from '@/lib/api';
import {
  PageHeader, Panel, TableShell, Th, Td, StatusChip, EmptyState, LoadingRows,
  ErrorBanner, FilterBar, FilterChips, Pagination,
} from '@/components/admin/ui';

export default function AdminProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState({ page: 1, perPage: 25, total: 0, totalPages: 1 });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi.products({ q: query, status, kind, page, sort: 'featured' });
        setRows(res.items);
        setMeta(res.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load products');
      } finally {
        setLoading(false);
      }
    },
    [query, status, kind],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  useEffect(() => {
    adminApi.categories().then(setCategories).catch(() => undefined);
  }, []);

  const togglePublish = async (product: Product) => {
    setBusy(product.id);
    try {
      await adminApi.publishProduct(product.id);
      await load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change status');
    } finally {
      setBusy(null);
    }
  };

  /** Inline stock edit — the most frequent action on a busy day. */
  const setStock = async (product: Product, absolute: number) => {
    if (absolute === product.stock) return;
    setBusy(product.id);
    try {
      await adminApi.adjustStock(product.id, { absolute });
      await load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not adjust stock');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (product: Product) => {
    const usedOnOrders = product.status === 'ARCHIVED';
    if (
      !window.confirm(
        usedOnOrders
          ? `"${product.name}" is already archived. Permanently delete it?`
          : `Remove "${product.name}"?\n\nIf it appears on any order it will be archived rather than deleted, so order history stays intact.`,
      )
    ) {
      return;
    }
    setBusy(product.id);
    try {
      const result = await adminApi.deleteProduct(product.id);
      if (result.archived) {
        window.alert('That product appears on existing orders, so it has been archived instead of deleted.');
      }
      await load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that product');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="The catalogue the storefront reads. Nothing here needs a developer — edit, publish, restock and archive from this screen."
        actions={
          <>
            <Link href="/admin/products/new" className="btn-primary btn-sm">
              Add product
            </Link>
            <Link href="/admin/categories" className="btn-ghost btn-sm">
              Categories
            </Link>
          </>
        }
      />

      <div className="px-5 py-8 lg:px-8">
        <Panel>
          <FilterBar query={query} onQuery={setQuery} placeholder="Search name, SKU or tagline…">
            <FilterChips
              value={kind}
              onChange={setKind}
              options={[{ value: '', label: 'All types' }, ...PRODUCT_KINDS.map((k) => ({ value: k as string, label: LABELS.ProductKind[k] }))]}
            />
            <FilterChips
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'Any status' },
                { value: 'ACTIVE', label: 'Published' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
            />
            <select
              value={meta.perPage}
              onChange={() => undefined}
              className="hidden"
              aria-hidden
              tabIndex={-1}
            >
              {PRODUCT_SORTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </FilterBar>

          {error && <ErrorBanner message={error} onRetry={() => void load(meta.page)} />}
          {loading && <LoadingRows />}

          {!loading && !error && rows.length === 0 && (
            <EmptyState
              title="No products match"
              body="Adjust the filters, or add your first product to get the storefront populated."
              action={
                <Link href="/admin/products/new" className="btn-primary btn-sm">
                  Add product
                </Link>
              }
            />
          )}

          {!loading && rows.length > 0 && (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th>Category</Th>
                    <Th>Price</Th>
                    <Th>Stock</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-plate/60">
                      <Td>
                        <Link href={`/admin/products/${product.id}`} className="group">
                          <span className="block text-[13.5px] text-chalk group-hover:text-volt">{product.name}</span>
                          <span className="mt-0.5 block font-mono text-[10px] text-slate">
                            {product.sku}
                            {product.isFeatured && <span className="ml-2 text-volt">· FEATURED</span>}
                          </span>
                        </Link>
                      </Td>
                      <Td className="text-[12px]">{product.category?.name ?? '—'}</Td>
                      <Td numeric>
                        <span className="text-chalk">{formatNaira(product.priceKobo)}</span>
                        {product.compareAtKobo && (
                          <span className="mt-0.5 block font-mono text-[10px] text-slate line-through">
                            {formatNaira(product.compareAtKobo)}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {product.trackStock ? (
                          <input
                            type="number"
                            min={0}
                            defaultValue={product.stock}
                            disabled={busy === product.id}
                            onBlur={(e) => void setStock(product, Number(e.target.value))}
                            className={`w-20 border border-hairline bg-plate px-2 py-1.5 font-mono text-[12px] tabular-nums ${
                              product.stock === 0 ? 'text-crimson' : product.stock <= 3 ? 'text-amber' : 'text-chalk'
                            }`}
                            aria-label={`Stock for ${product.name}`}
                          />
                        ) : (
                          <span className="font-mono text-[11px] text-slate">Untracked</span>
                        )}
                      </Td>
                      <Td>
                        <StatusChip status={product.status} label={product.status.toLowerCase()} />
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void togglePublish(product)}
                            disabled={busy === product.id}
                            className="font-mono text-[10px] uppercase tracking-technical text-steel transition-colors hover:text-volt disabled:opacity-40"
                          >
                            {product.status === 'ACTIVE' ? 'Unpublish' : 'Publish'}
                          </button>
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="font-mono text-[10px] uppercase tracking-technical text-steel transition-colors hover:text-chalk"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => void remove(product)}
                            disabled={busy === product.id}
                            className="font-mono text-[10px] uppercase tracking-technical text-slate transition-colors hover:text-crimson disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
              <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={(p) => void load(p)} />
            </>
          )}
        </Panel>

        <p className="mt-6 font-mono text-[10px] uppercase leading-relaxed tracking-technical text-slate/70">
          Products that appear on an order are archived rather than deleted — order history always
          keeps its own copy of the name, SKU and price that was charged.
        </p>
      </div>
    </>
  );
}
