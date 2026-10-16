import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { categorySchema, listQuerySchema, productSchema, serviceSchema, slugify } from '@arkvolt/shared';
import type { CategoryInput, ProductInput, ProductSort, ServiceInput } from '@arkvolt/shared';
import { prisma } from '../../db';
import { diffObjects, recordAudit, summariseDiff } from '../../lib/audit';
import { asyncHandler, badRequest, conflict, list, notFound, ok } from '../../lib/http';
import { toCategory, toProduct, toService } from '../../lib/serialise';
import { validate } from '../../middleware/validate';

export const adminCatalogRouter = Router();

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

/** Guarantees uniqueness without the ugly `name-2` suffix. */
const uniqueSlug = async (
  base: string,
  table: 'product' | 'service',
  excludeId?: string,
): Promise<string> => {
  const root = slugify(base) || 'item';
  for (let i = 0; i < 25; i += 1) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const existing =
      table === 'product'
        ? await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await prisma.service.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
};

const normaliseProductInput = (input: ProductInput) => ({
  name: input.name,
  sku: input.sku,
  kind: input.kind,
  status: input.status,
  categoryId: input.categoryId,
  tagline: input.tagline,
  shortDescription: input.shortDescription,
  description: input.description,
  priceKobo: Math.round(input.price * 100),
  compareAtKobo:
    input.compareAtPrice === '' || input.compareAtPrice === undefined ? null : Math.round(Number(input.compareAtPrice) * 100),
  priceType: input.priceType,
  stock: input.stock,
  trackStock: input.trackStock,
  isFeatured: input.isFeatured,
  sortOrder: input.sortOrder,
  images: input.images as unknown as Prisma.InputJsonValue,
  specs: input.specs as unknown as Prisma.InputJsonValue,
  requirements: input.requirements as unknown as Prisma.InputJsonValue,
  installSteps: input.installSteps as unknown as Prisma.InputJsonValue,
  included: input.included as unknown as Prisma.InputJsonValue,
  tags: input.tags as unknown as Prisma.InputJsonValue,
  deliveryNotes: input.deliveryNotes,
  metaTitle: input.metaTitle,
  metaDescription: input.metaDescription,
});

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

adminCatalogRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.category.findMany({
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    ok(res, rows.map(toCategory));
  }),
);

adminCatalogRouter.post(
  '/categories',
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const input = req.body as CategoryInput;
    const slug = await uniqueSlug(input.slug || input.name, 'product');

    const row = await prisma.category.create({
      data: { name: input.name, slug, kind: input.kind, description: input.description, sortOrder: input.sortOrder },
    });

    await recordAudit({
      actor: req.actor!,
      action: 'CREATE',
      entity: 'Category',
      entityId: row.id,
      summary: `Created category “${row.name}”`,
      req,
    });
    ok(res, toCategory(row), 201);
  }),
);

adminCatalogRouter.patch(
  '/categories/:id',
  validate(categorySchema.partial()),
  asyncHandler(async (req, res) => {
    const before = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Category not found');

    const input = req.body as Partial<CategoryInput>;
    const row = await prisma.category.update({
      where: { id: before.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug ? { slug: slugify(input.slug) } : {}),
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });

    await recordAudit({
      actor: req.actor!,
      action: 'UPDATE',
      entity: 'Category',
      entityId: row.id,
      summary: `Updated category “${row.name}” — ${summariseDiff(diffObjects(before as never, row as never))}`,
      diff: diffObjects(before as never, row as never),
      req,
    });
    ok(res, toCategory(row));
  }),
);

adminCatalogRouter.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const row = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true } } },
    });
    if (!row) throw notFound('Category not found');
    if (row._count.products > 0) {
      throw conflict(
        `“${row.name}” still holds ${row._count.products} product${row._count.products === 1 ? '' : 's'}. Move them first.`,
      );
    }

    await prisma.category.delete({ where: { id: row.id } });
    await recordAudit({
      actor: req.actor!,
      action: 'DELETE',
      entity: 'Category',
      entityId: row.id,
      summary: `Deleted category “${row.name}”`,
      req,
    });
    ok(res, { ok: true });
  }),
);

/* ------------------------------------------------------------------ *
 * Products
 * ------------------------------------------------------------------ */

const ADMIN_SORT: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  featured: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
  newest: [{ createdAt: 'desc' }],
  'price-asc': [{ priceKobo: 'asc' }],
  'price-desc': [{ priceKobo: 'desc' }],
  'name-asc': [{ name: 'asc' }],
};

adminCatalogRouter.get(
  '/products',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { q, page, perPage, sort, category, kind, status } = req.query as unknown as {
      q?: string;
      page: number;
      perPage: number;
      sort: ProductSort;
      category?: string;
      kind?: Prisma.ProductWhereInput['kind'];
      status?: Prisma.ProductWhereInput['status'];
    };

    const where: Prisma.ProductWhereInput = {
      ...(status ? { status } : {}),
      ...(kind ? { kind } : {}),
      ...(category ? { categoryId: category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { tagline: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: ADMIN_SORT[sort] ?? ADMIN_SORT.featured,
        skip: (page - 1) * perPage,
        take: perPage,
        include: { category: true },
      }),
      prisma.product.count({ where }),
    ]);

    list(res, rows.map(toProduct), { page, perPage, total });
  }),
);

adminCatalogRouter.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const row = await prisma.product.findUnique({ where: { id: req.params.id }, include: { category: true } });
    if (!row) throw notFound('Product not found');
    ok(res, toProduct(row));
  }),
);

adminCatalogRouter.post(
  '/products',
  validate(productSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as ProductInput;

    const category = await prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } });
    if (!category) throw badRequest('Choose a valid category.', { categoryId: ['Unknown category'] });

    const slug = await uniqueSlug(input.slug || input.name, 'product');
    const row = await prisma.product.create({
      data: { slug, ...normaliseProductInput(input) },
      include: { category: true },
    });

    await recordAudit({
      actor: req.actor!,
      action: 'CREATE',
      entity: 'Product',
      entityId: row.id,
      summary: `Created ${row.kind.toLowerCase()} “${row.name}” (${row.sku})`,
      diff: { created: { from: null, to: { name: row.name, sku: row.sku, priceKobo: row.priceKobo, status: row.status } } },
      req,
    });

    ok(res, toProduct(row), 201);
  }),
);

adminCatalogRouter.patch(
  '/products/:id',
  validate(productSchema.partial()),
  asyncHandler(async (req, res) => {
    const before = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Product not found');

    const input = req.body as Partial<ProductInput>;

    /* Partial updates arrive field-by-field from the dashboard, so each block is
     * assembled conditionally. Never spread raw input into Prisma. */
    const data: Prisma.ProductUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.kind !== undefined) data.kind = input.kind;
    if (input.status !== undefined) data.status = input.status;
    if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };
    if (input.tagline !== undefined) data.tagline = input.tagline;
    if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription;
    if (input.description !== undefined) data.description = input.description;
    if (input.price !== undefined) data.priceKobo = Math.round(input.price * 100);
    if (input.compareAtPrice !== undefined) {
      data.compareAtKobo = input.compareAtPrice === '' ? null : Math.round(Number(input.compareAtPrice) * 100);
    }
    if (input.priceType !== undefined) data.priceType = input.priceType;
    if (input.stock !== undefined) data.stock = input.stock;
    if (input.trackStock !== undefined) data.trackStock = input.trackStock;
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.images !== undefined) data.images = input.images as unknown as Prisma.InputJsonValue;
    if (input.specs !== undefined) data.specs = input.specs as unknown as Prisma.InputJsonValue;
    if (input.requirements !== undefined) data.requirements = input.requirements as unknown as Prisma.InputJsonValue;
    if (input.installSteps !== undefined) data.installSteps = input.installSteps as unknown as Prisma.InputJsonValue;
    if (input.included !== undefined) data.included = input.included as unknown as Prisma.InputJsonValue;
    if (input.tags !== undefined) data.tags = input.tags as unknown as Prisma.InputJsonValue;
    if (input.deliveryNotes !== undefined) data.deliveryNotes = input.deliveryNotes;
    if (input.metaTitle !== undefined) data.metaTitle = input.metaTitle;
    if (input.metaDescription !== undefined) data.metaDescription = input.metaDescription;
    if (input.slug) data.slug = await uniqueSlug(input.slug, 'product', before.id);

    const row = await prisma.product.update({ where: { id: before.id }, data, include: { category: true } });

    const diff = diffObjects(before as never, row as never);
    const statusChanged = before.status !== row.status;

    await recordAudit({
      actor: req.actor!,
      action: statusChanged ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'Product',
      entityId: row.id,
      summary: `Updated “${row.name}”${statusChanged ? ` — status ${before.status} → ${row.status}` : ''}${diff ? ` · ${summariseDiff(diff)}` : ''}`,
      diff,
      req,
    });

    ok(res, toProduct(row));
  }),
);

/** Publishes or unpublishes in one click from the products table. */
adminCatalogRouter.post(
  '/products/:id/publish',
  asyncHandler(async (req, res) => {
    const before = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Product not found');

    const publish = before.status !== 'ACTIVE';
    const row = await prisma.product.update({
      where: { id: before.id },
      data: { status: publish ? 'ACTIVE' : 'DRAFT' },
      include: { category: true },
    });

    await recordAudit({
      actor: req.actor!,
      action: publish ? 'PUBLISH' : 'UNPUBLISH',
      entity: 'Product',
      entityId: row.id,
      summary: `${publish ? 'Published' : 'Unpublished'} “${row.name}”`,
      diff: { status: { from: before.status, to: row.status } },
      req,
    });
    ok(res, toProduct(row));
  }),
);

/** Adds stock without opening the full editor — the common case on a busy day. */
adminCatalogRouter.post(
  '/products/:id/stock',
  asyncHandler(async (req, res) => {
    const body = req.body as { delta?: unknown; absolute?: unknown };
    const before = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Product not found');

    let next: number;
    if (typeof body.absolute === 'number' || typeof body.absolute === 'string') {
      next = Math.max(0, Math.round(Number(body.absolute)));
      if (!Number.isFinite(next)) throw badRequest('Enter a valid stock figure.');
    } else {
      const delta = Math.round(Number(body.delta));
      if (!Number.isFinite(delta) || delta === 0) throw badRequest('Enter a stock adjustment.');
      next = Math.max(0, before.stock + delta);
    }

    const row = await prisma.product.update({
      where: { id: before.id },
      data: { stock: next },
      include: { category: true },
    });

    await recordAudit({
      actor: req.actor!,
      action: 'UPDATE',
      entity: 'Product',
      entityId: row.id,
      summary: `Stock for “${row.name}” ${before.stock} → ${next}`,
      diff: { stock: { from: before.stock, to: next } },
      req,
    });
    ok(res, toProduct(row));
  }),
);

adminCatalogRouter.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const row = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!row) throw notFound('Product not found');

    /* A product that appears on any order is archived, never deleted: the order
     * history must keep its snapshots and referential integrity. The audit line
     * records which path was taken. */
    const usedOnOrders = await prisma.orderItem.count({ where: { productId: row.id } });

    if (usedOnOrders > 0) {
      const archived = await prisma.product.update({ where: { id: row.id }, data: { status: 'ARCHIVED' } });
      await recordAudit({
        actor: req.actor!,
        action: 'UNPUBLISH',
        entity: 'Product',
        entityId: row.id,
        summary: `Archived “${row.name}” (appears on ${usedOnOrders} order line${usedOnOrders === 1 ? '' : 's'})`,
        diff: { status: { from: row.status, to: archived.status } },
        req,
      });
      ok(res, { ok: true, archived: true, ordersAffected: usedOnOrders });
      return;
    }

    await prisma.product.delete({ where: { id: row.id } });
    await recordAudit({
      actor: req.actor!,
      action: 'DELETE',
      entity: 'Product',
      entityId: row.id,
      summary: `Deleted product “${row.name}” (${row.sku})`,
      req,
    });
    ok(res, { ok: true, archived: false });
  }),
);

/* ------------------------------------------------------------------ *
 * Services
 * ------------------------------------------------------------------ */

const normaliseServiceInput = (input: ServiceInput) => ({
  name: input.name,
  tagline: input.tagline,
  shortDescription: input.shortDescription,
  description: input.description,
  priceKobo: Math.round(input.price * 100),
  priceType: input.priceType,
  durationMins: input.durationMins === '' || input.durationMins === undefined ? null : Number(input.durationMins),
  turnaround: input.turnaround,
  includes: input.includes as unknown as Prisma.InputJsonValue,
  process: input.process as unknown as Prisma.InputJsonValue,
  faqs: input.faqs as unknown as Prisma.InputJsonValue,
  images: input.images as unknown as Prisma.InputJsonValue,
  status: input.status,
  isFeatured: input.isFeatured,
  sortOrder: input.sortOrder,
});

adminCatalogRouter.get(
  '/services',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.service.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    ok(res, rows.map(toService));
  }),
);

adminCatalogRouter.post(
  '/services',
  validate(serviceSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as ServiceInput;
    const slug = await uniqueSlug(input.slug || input.name, 'service');
    const row = await prisma.service.create({ data: { slug, ...normaliseServiceInput(input) } });

    await recordAudit({
      actor: req.actor!,
      action: 'CREATE',
      entity: 'Service',
      entityId: row.id,
      summary: `Created service “${row.name}”`,
      req,
    });
    ok(res, toService(row), 201);
  }),
);

adminCatalogRouter.patch(
  '/services/:id',
  validate(serviceSchema.partial()),
  asyncHandler(async (req, res) => {
    const before = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Service not found');

    const input = req.body as Partial<ServiceInput>;
    const patch = normaliseServiceInput({ ...input } as ServiceInput);

    const data: Prisma.ServiceUpdateInput = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null) continue;
      if (!(key in input) && key !== 'status' && key !== 'isFeatured' && key !== 'sortOrder') continue;
      (data as Record<string, unknown>)[key] = value;
    }
    if (input.slug) data.slug = await uniqueSlug(input.slug, 'service', before.id);

    const row = await prisma.service.update({ where: { id: before.id }, data });
    const diff = diffObjects(before as never, row as never);

    await recordAudit({
      actor: req.actor!,
      action: 'UPDATE',
      entity: 'Service',
      entityId: row.id,
      summary: `Updated service “${row.name}”${diff ? ` · ${summariseDiff(diff)}` : ''}`,
      diff,
      req,
    });
    ok(res, toService(row));
  }),
);

adminCatalogRouter.delete(
  '/services/:id',
  asyncHandler(async (req, res) => {
    const row = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!row) throw notFound('Service not found');

    if (row._count.bookings > 0) {
      const archived = await prisma.service.update({ where: { id: row.id }, data: { status: 'ARCHIVED' } });
      await recordAudit({
        actor: req.actor!,
        action: 'UNPUBLISH',
        entity: 'Service',
        entityId: row.id,
        summary: `Archived service “${row.name}” (used by ${row._count.bookings} booking${row._count.bookings === 1 ? '' : 's'})`,
        diff: { status: { from: row.status, to: archived.status } },
        req,
      });
      ok(res, { ok: true, archived: true });
      return;
    }

    await prisma.service.delete({ where: { id: row.id } });
    await recordAudit({
      actor: req.actor!,
      action: 'DELETE',
      entity: 'Service',
      entityId: row.id,
      summary: `Deleted service “${row.name}”`,
      req,
    });
    ok(res, { ok: true, archived: false });
  }),
);
