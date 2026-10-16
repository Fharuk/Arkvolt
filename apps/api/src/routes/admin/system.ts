import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import {
  AUDIT_ACTIONS,
  formatDateTime,
  settingsSchema,
  type AuditAction,
  type DashboardStats,
  type StoreSettings,
} from '@arkvolt/shared';
import { prisma } from '../../db';
import { diffObjects, recordAudit, summariseDiff } from '../../lib/audit';
import { asyncHandler, ok } from '../../lib/http';
import { toAuditEntry, toBooking, toOrder } from '../../lib/serialise';
import { getSettings, saveSettings } from '../../lib/settings';

export const adminSystemRouter = Router();

/* ================================================================== *
 * STORE SETTINGS
 * ================================================================== */

adminSystemRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    ok(res, await getSettings({ bypassCache: true }));
  }),
);

adminSystemRouter.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Check the highlighted fields.',
          details: parsed.error.issues.reduce<Record<string, string[]>>((acc, issue) => {
            const key = issue.path.join('.') || '_';
            (acc[key] ??= []).push(issue.message);
            return acc;
          }, {}),
        },
      });
      return;
    }

    const before = await getSettings({ bypassCache: true });
    const next: StoreSettings = {
      ...before,
      ...parsed.data,
      supportPhone: parsed.data.supportPhone || '',
      supportEmail: parsed.data.supportEmail || '',
      announcement: parsed.data.announcement || null,
      bankDetails: parsed.data.bankDetails || null,
      socials: parsed.data.socials,
    };

    const saved = await saveSettings(next);

    const diff = diffObjects(before as unknown as Record<string, unknown>, saved as unknown as Record<string, unknown>);
    await recordAudit({
      actor: req.actor!,
      action: 'SETTINGS_UPDATE',
      entity: 'Setting',
      entityId: 'singleton',
      summary: `Store settings updated · ${summariseDiff(diff, 4)}`,
      diff,
      req,
    });

    ok(res, saved);
  }),
);

/* ================================================================== *
 * AUDIT LOG — append-only, read and export only
 * ================================================================== */

adminSystemRouter.get(
  '/audit',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const perPage = Math.min(100, Math.max(10, Number(req.query.perPage ?? 30) || 30));
    const entity = String(req.query.entity ?? '').trim();
    const action = String(req.query.action ?? '').trim();
    const q = String(req.query.q ?? '').trim();

    const where: Prisma.AuditLogWhereInput = {
      ...(entity ? { entity } : {}),
      ...(action && (AUDIT_ACTIONS as readonly string[]).includes(action) ? { action: action as AuditAction } : {}),
      ...(q
        ? {
            OR: [
              { summary: { contains: q, mode: 'insensitive' } },
              { actorEmail: { contains: q, mode: 'insensitive' } },
              { entityId: { contains: q } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({
      data: rows.map(toAuditEntry),
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),
);

adminSystemRouter.get(
  '/audit/entities',
  asyncHandler(async (_req, res) => {
    const grouped = await prisma.auditLog.groupBy({ by: ['entity'], _count: { _all: true }, orderBy: { _count: { entity: 'desc' } } });
    ok(res, grouped.map((g) => ({ entity: g.entity, count: g._count._all })));
  }),
);

/**
 * CSV export of the audit trail. Written for a forensic paper trail: the IP and
 * user agent are included so a disputed change can be tied to a device.
 */
adminSystemRouter.get(
  '/audit/export',
  asyncHandler(async (req, res) => {
    const limit = Math.min(10_000, Math.max(100, Number(req.query.limit ?? 2000) || 2000));
    const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });

    const escape = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    const header = ['Timestamp', 'Actor', 'Email', 'Action', 'Entity', 'Entity ID', 'Summary', 'Changed fields', 'IP', 'User agent'];

    const body = rows.map((r) =>
      [
        r.createdAt.toISOString(),
        r.actorName,
        r.actorEmail,
        r.action,
        r.entity,
        r.entityId,
        r.summary,
        r.diff ? Object.keys(r.diff as Record<string, unknown>).join('; ') : '',
        r.ip,
        r.userAgent,
      ]
        .map(escape)
        .join(','),
    );

    await recordAudit({
      actor: req.actor!,
      action: 'EXPORT',
      entity: 'AuditLog',
      entityId: null,
      summary: `Exported ${rows.length} audit entries to CSV`,
      req,
    });

    const filename = `arkvolt-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send([header.map(escape).join(','), ...body].join('\r\n'));
  }),
);

/* ================================================================== *
 * DASHBOARD
 * ================================================================== */

const monthKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

adminSystemRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      orderCount,
      openOrders,
      completedOrders,
      cancelledOrders,
      revenueAgg,
      monthRevenueAgg,
      bookingCount,
      openBookings,
      emergencyBookings,
      inquiryCount,
      unreadInquiries,
      productCount,
      activeProducts,
      draftProducts,
      lowStockRows,
      titleRequestCount,
      openTitleRequests,
      recentOrders,
      recentBookings,
      revenueRows,
      topItemRows,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ['NEW', 'CONFIRMED', 'PREPARING', 'READY'] } } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.aggregate({ _sum: { totalKobo: true }, where: { status: { not: 'CANCELLED' } } }),
      prisma.order.aggregate({
        _sum: { totalKobo: true },
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonth } },
      }),
      prisma.repairBooking.count(),
      prisma.repairBooking.count({ where: { status: { in: ['NEW', 'CONTACTED', 'SCHEDULED', 'IN_PROGRESS', 'AWAITING_PARTS'] } } }),
      prisma.repairBooking.count({ where: { urgency: 'EMERGENCY', status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      prisma.inquiry.count(),
      prisma.inquiry.count({ where: { status: 'NEW' } }),
      prisma.product.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({ where: { status: 'DRAFT' } }),
      prisma.product.findMany({
        where: { status: 'ACTIVE', trackStock: true, stock: { lte: 3 } },
        select: { id: true, name: true, sku: true, stock: true },
        orderBy: { stock: 'asc' },
        take: 8,
      }),
      prisma.titleRequest.count(),
      prisma.titleRequest.count({ where: { status: { in: ['NEW', 'CONTACTED'] } } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { items: true } }),
      prisma.repairBooking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { service: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.$queryRaw<{ month: Date; total: bigint | number }[]>`
        SELECT date_trunc('month', "createdAt") AS month, COALESCE(SUM("totalKobo"), 0)::bigint AS total
        FROM orders
        WHERE "createdAt" >= ${twelveMonthsAgo} AND status <> 'CANCELLED'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.orderItem.groupBy({
        by: ['skuSnapshot', 'nameSnapshot'],
        _sum: { quantity: true, lineTotalKobo: true },
        orderBy: { _sum: { lineTotalKobo: 'desc' } },
        take: 6,
      }),
    ]);

    const byMonth = new Map(revenueRows.map((r) => [monthKey(new Date(r.month)), Number(r.total)]));
    const revenueSeries = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return {
        label: d.toLocaleDateString('en-NG', { month: 'short' }),
        valueKobo: byMonth.get(monthKey(d)) ?? 0,
      };
    });

    const stats: DashboardStats = {
      orders: {
        total: orderCount,
        open: openOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
      },
      revenueKobo: Number(revenueAgg._sum.totalKobo ?? 0),
      revenueThisMonthKobo: Number(monthRevenueAgg._sum.totalKobo ?? 0),
      bookings: { total: bookingCount, open: openBookings, emergency: emergencyBookings },
      inquiries: { total: inquiryCount, unread: unreadInquiries },
      products: {
        total: productCount,
        active: activeProducts,
        draft: draftProducts,
        lowStock: lowStockRows.length,
      },
      titleRequests: { total: titleRequestCount, open: openTitleRequests },
      recentOrders: recentOrders.map(toOrder),
      recentBookings: recentBookings.map(toBooking),
      revenueSeries,
      topProducts: topItemRows.map((r) => ({
        name: r.nameSnapshot,
        sku: r.skuSnapshot,
        units: r._sum.quantity ?? 0,
        revenueKobo: Number(r._sum.lineTotalKobo ?? 0),
      })),
    };

    res.status(200).json({ ...stats, lowStock: lowStockRows });
  }),
);

/* ================================================================== *
 * OPERATIONS EXPORT — the day sheet the technician works from
 * ================================================================== */

adminSystemRouter.get(
  '/export/orders.csv',
  asyncHandler(async (req, res) => {
    const rows = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 2000, include: { items: true } });
    const escape = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    const header = ['Ref', 'Placed', 'Customer', 'Phone', 'Fulfilment', 'Status', 'Payment', 'Items', 'Subtotal (₦)', 'Delivery (₦)', 'Total (₦)'];

    const body = rows.map((r) =>
      [
        r.ref,
        formatDateTime(r.createdAt.toISOString()),
        r.customerName,
        r.phone,
        r.fulfilment,
        r.status,
        r.paymentStatus,
        r.items.map((i) => `${i.quantity}× ${i.nameSnapshot}`).join(' | '),
        (r.subtotalKobo / 100).toFixed(2),
        (r.deliveryFeeKobo / 100).toFixed(2),
        (r.totalKobo / 100).toFixed(2),
      ]
        .map(escape)
        .join(','),
    );

    await recordAudit({
      actor: req.actor!,
      action: 'EXPORT',
      entity: 'Order',
      entityId: null,
      summary: `Exported ${rows.length} orders to CSV`,
      req,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="arkvolt-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send([header.map(escape).join(','), ...body].join('\r\n'));
  }),
);
