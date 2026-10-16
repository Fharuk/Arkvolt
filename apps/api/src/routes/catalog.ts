import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { GENRES, listQuerySchema, type ProductSort } from '@arkvolt/shared';
import { prisma } from '../db';
import { asyncHandler, list, notFound, ok } from '../lib/http';
import { toCategory, toProduct, toService, toTitleEntry } from '../lib/serialise';
import { validate } from '../middleware/validate';

export const catalogRouter = Router();

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

catalogRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.category.findMany({
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
    });
    ok(res, rows.map(toCategory));
  }),
);

/* ------------------------------------------------------------------ *
 * Products
 * ------------------------------------------------------------------ */

const buildOrderBy = (sort: ProductSort): Prisma.ProductOrderByWithRelationInput[] => {
  switch (sort) {
    case 'newest':
      return [{ createdAt: 'desc' }];
    case 'price-asc':
      return [{ priceKobo: 'asc' }, { name: 'asc' }];
    case 'price-desc':
      return [{ priceKobo: 'desc' }, { name: 'asc' }];
    case 'name-asc':
      return [{ name: 'asc' }];
    case 'featured':
    default:
      return [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }];
  }
};

catalogRouter.get(
  '/products',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { q, page, perPage, sort, category, kind, featured, inStock } = req.query as unknown as {
      q?: string;
      page: number;
      perPage: number;
      sort: ProductSort;
      category?: string;
      kind?: Prisma.ProductWhereInput['kind'];
      featured?: boolean;
      inStock?: boolean;
    };

    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(kind ? { kind } : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(featured ? { isFeatured: true } : {}),
      ...(inStock ? { OR: [{ trackStock: false }, { stock: { gt: 0 } }] } : {}),
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { tagline: { contains: q, mode: 'insensitive' } },
                  { shortDescription: { contains: q, mode: 'insensitive' } },
                  { sku: { contains: q, mode: 'insensitive' } },
                  { tags: { array_contains: q } },
                ],
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: buildOrderBy(sort),
        skip: (page - 1) * perPage,
        take: perPage,
        include: { category: true },
      }),
      prisma.product.count({ where }),
    ]);

    list(res, rows.map(toProduct), { page, perPage, total });
  }),
);

catalogRouter.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const row = await prisma.product.findFirst({
      where: { slug: req.params.slug, status: { in: ['ACTIVE', 'DRAFT'] } },
      include: { category: true },
    });
    if (!row) throw notFound('That product is no longer available.');
    ok(res, toProduct(row));
  }),
);

catalogRouter.get(
  '/products/:slug/related',
  asyncHandler(async (req, res) => {
    const current = await prisma.product.findFirst({
      where: { slug: req.params.slug },
      select: { id: true, categoryId: true },
    });
    if (!current) throw notFound('That product is no longer available.');

    const rows = await prisma.product.findMany({
      where: { status: 'ACTIVE', categoryId: current.categoryId, NOT: { id: current.id } },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      take: 4,
      include: { category: true },
    });
    ok(res, rows.map(toProduct));
  }),
);

/* ------------------------------------------------------------------ *
 * Repair services
 * ------------------------------------------------------------------ */

catalogRouter.get(
  '/services',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.service.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });
    ok(res, rows.map(toService));
  }),
);

catalogRouter.get(
  '/services/:slug',
  asyncHandler(async (req, res) => {
    const row = await prisma.service.findUnique({ where: { slug: req.params.slug } });
    if (!row || row.status === 'ARCHIVED') throw notFound('That service is not available.');
    ok(res, toService(row));
  }),
);

/* ------------------------------------------------------------------ *
 * Title index
 *
 * A searchable reference list of titles we can prepare a machine for.
 * Names and metadata only. This endpoint backs the /titles page, which
 * funnels into a setup request rather than a purchase.
 * ------------------------------------------------------------------ */

catalogRouter.get(
  '/titles',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 120) : '';
    const genre = typeof req.query.genre === 'string' ? req.query.genre.toUpperCase() : '';
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const perPage = Math.min(120, Math.max(12, Number(req.query.perPage ?? 48) || 48));

    const where: Prisma.TitleEntryWhereInput = {
      ...(genre && (GENRES as readonly string[]).includes(genre) ? { genre: genre as never } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { series: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.titleEntry.findMany({ where, orderBy: [{ name: 'asc' }], skip: (page - 1) * perPage, take: perPage }),
      prisma.titleEntry.count({ where }),
    ]);

    list(res, rows.map(toTitleEntry), { page, perPage, total });
  }),
);

/** Franchise groups, so the titles page can offer a series rail rather than a wall of A–Z. */
catalogRouter.get(
  '/titles/series',
  asyncHandler(async (_req, res) => {
    const grouped = await prisma.titleEntry.groupBy({
      by: ['series'],
      _count: { _all: true },
      where: { series: { not: null } },
      orderBy: { _count: { series: 'desc' } },
      take: 18,
    });
    ok(
      res,
      grouped
        .filter((g): g is typeof g & { series: string } => Boolean(g.series))
        .map((g) => ({ series: g.series, count: g._count._all })),
    );
  }),
);
