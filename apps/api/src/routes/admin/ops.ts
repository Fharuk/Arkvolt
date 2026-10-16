import { Router } from 'express';
import { Prisma } from '@prisma/client';
import {
  bookingUpdateSchema,
  buildBookingMessage,
  buildOrderMessage,
  inquiryUpdateSchema,
  orderUpdateSchema,
  waLink,
} from '@arkvolt/shared';
import type { BookingStatus, OrderStatus } from '@arkvolt/shared';
import { prisma } from '../../db';
import { diffObjects, recordAudit, summariseDiff } from '../../lib/audit';
import { asyncHandler, notFound, ok, badRequest } from '../../lib/http';
import { toBooking, toInquiry, toOrder, toTitleRequest } from '../../lib/serialise';
import { getSettings } from '../../lib/settings';

export const adminOpsRouter = Router();

const paginate = (query: Record<string, unknown>) => {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const perPage = Math.min(100, Math.max(5, Number(query.perPage ?? 25) || 25));
  return { page, perPage, skip: (page - 1) * perPage };
};

/* ================================================================== *
 * ORDERS
 * ================================================================== */

adminOpsRouter.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const { page, perPage, skip } = paginate(req.query as Record<string, unknown>);
    const q = String(req.query.q ?? '').trim();
    const status = String(req.query.status ?? '').trim();
    const paymentStatus = String(req.query.paymentStatus ?? '').trim();

    const where: Prisma.OrderWhereInput = {
      ...(status ? { status: status as OrderStatus } : {}),
      ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
      ...(q
        ? {
            OR: [
              { ref: { contains: q, mode: 'insensitive' } },
              { customerName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: perPage, include: { items: true } }),
      prisma.order.count({ where }),
    ]);

    res.status(200).json({
      data: rows.map(toOrder),
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),
);

adminOpsRouter.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const row = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!row) throw notFound('Order not found');

    const settings = await getSettings();
    const order = toOrder(row);
    ok(res, { order, whatsappUrl: waLink(settings.whatsappNumber, buildOrderMessage(order, settings)) });
  }),
);

adminOpsRouter.patch(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const parsed = orderUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Check the submitted values.', undefined);
    const input = parsed.data;

    const before = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!before) throw notFound('Order not found');

    const data: Prisma.OrderUpdateInput = {};
    if (input.status) data.status = input.status;
    if (input.paymentStatus) data.paymentStatus = input.paymentStatus;
    if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes;
    if (input.deliveryFee !== undefined && input.deliveryFee !== '') {
      const feeKobo = Math.round(Number(input.deliveryFee) * 100);
      data.deliveryFeeKobo = feeKobo;
      // Total is always recomputed, never edited directly.
      data.totalKobo = before.subtotalKobo + feeKobo - before.discountKobo;
    }

    const row = await prisma.order.update({ where: { id: before.id }, data, include: { items: true } });

    const diff = diffObjects(
      { status: before.status, paymentStatus: before.paymentStatus, deliveryFeeKobo: before.deliveryFeeKobo, totalKobo: before.totalKobo, internalNotes: before.internalNotes },
      { status: row.status, paymentStatus: row.paymentStatus, deliveryFeeKobo: row.deliveryFeeKobo, totalKobo: row.totalKobo, internalNotes: row.internalNotes },
    );

    const statusChanged = before.status !== row.status;

    await recordAudit({
      actor: req.actor!,
      action: statusChanged ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'Order',
      entityId: row.id,
      summary: statusChanged
        ? `Order ${row.ref} status ${before.status} → ${row.status}`
        : `Updated order ${row.ref} · ${summariseDiff(diff)}`,
      diff,
      req,
    });

    ok(res, toOrder(row));
  }),
);

/** Marks that the order has been dispatched to WhatsApp, for response-time reporting. */
adminOpsRouter.post(
  '/orders/:id/whatsapp-sent',
  asyncHandler(async (req, res) => {
    const row = await prisma.order.update({
      where: { id: req.params.id },
      data: { whatsappSentAt: new Date() },
      include: { items: true },
    });
    await recordAudit({
      actor: req.actor!,
      action: 'UPDATE',
      entity: 'Order',
      entityId: row.id,
      summary: `WhatsApp hand-off recorded for ${row.ref}`,
      req,
    });
    ok(res, toOrder(row));
  }),
);

/* ================================================================== *
 * REPAIR BOOKINGS
 * ================================================================== */

adminOpsRouter.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const { page, perPage, skip } = paginate(req.query as Record<string, unknown>);
    const q = String(req.query.q ?? '').trim();
    const status = String(req.query.status ?? '').trim();

    const where: Prisma.RepairBookingWhereInput = {
      ...(status ? { status: status as BookingStatus } : {}),
      ...(q
        ? {
            OR: [
              { ref: { contains: q, mode: 'insensitive' } },
              { customerName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
              { deviceModel: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.repairBooking.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: perPage,
        include: { service: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.repairBooking.count({ where }),
    ]);

    res.status(200).json({
      data: rows.map(toBooking),
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),
);

adminOpsRouter.get(
  '/bookings/:id',
  asyncHandler(async (req, res) => {
    const row = await prisma.repairBooking.findUnique({
      where: { id: req.params.id },
      include: { service: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) throw notFound('Booking not found');

    const settings = await getSettings();
    const booking = toBooking(row);
    ok(res, { booking, whatsappUrl: waLink(settings.whatsappNumber, buildBookingMessage(booking, settings)) });
  }),
);

adminOpsRouter.patch(
  '/bookings/:id',
  asyncHandler(async (req, res) => {
    const parsed = bookingUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Check the submitted values.');
    const input = parsed.data;

    const before = await prisma.repairBooking.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Booking not found');

    const data: Prisma.RepairBookingUpdateInput = {};
    if (input.status) data.status = input.status;
    if (input.technician !== undefined) data.technician = input.technician;
    if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes;
    if (input.estimatedFee !== undefined && input.estimatedFee !== '') {
      data.estimatedKobo = Math.round(Number(input.estimatedFee) * 100);
    }

    const row = await prisma.repairBooking.update({
      where: { id: before.id },
      data,
      include: { service: { select: { id: true, name: true, slug: true } } },
    });

    const diff = diffObjects(
      { status: before.status, technician: before.technician, estimatedKobo: before.estimatedKobo, internalNotes: before.internalNotes },
      { status: row.status, technician: row.technician, estimatedKobo: row.estimatedKobo, internalNotes: row.internalNotes },
    );
    const statusChanged = before.status !== row.status;

    await recordAudit({
      actor: req.actor!,
      action: statusChanged ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'RepairBooking',
      entityId: row.id,
      summary: statusChanged
        ? `Booking ${row.ref} status ${before.status} → ${row.status}`
        : `Updated booking ${row.ref} · ${summariseDiff(diff)}`,
      diff,
      req,
    });

    ok(res, toBooking(row));
  }),
);

/* ================================================================== *
 * INQUIRIES
 * ================================================================== */

adminOpsRouter.get(
  '/inquiries',
  asyncHandler(async (req, res) => {
    const { page, perPage, skip } = paginate(req.query as Record<string, unknown>);
    const q = String(req.query.q ?? '').trim();
    const status = String(req.query.status ?? '').trim();
    const source = String(req.query.source ?? '').trim();

    const where: Prisma.InquiryWhereInput = {
      ...(status ? { status: status as never } : {}),
      ...(source ? { source: source as never } : {}),
      ...(q
        ? {
            OR: [
              { ref: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { subject: { contains: q, mode: 'insensitive' } },
              { message: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.inquiry.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: perPage }),
      prisma.inquiry.count({ where }),
    ]);

    res.status(200).json({
      data: rows.map(toInquiry),
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),
);

adminOpsRouter.patch(
  '/inquiries/:id',
  asyncHandler(async (req, res) => {
    const parsed = inquiryUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Check the submitted values.');

    const before = await prisma.inquiry.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Inquiry not found');

    const nextStatus = parsed.data.status ?? before.status;
    const row = await prisma.inquiry.update({
      where: { id: before.id },
      data: {
        status: nextStatus,
        handledAt: nextStatus === 'NEW' ? null : (before.handledAt ?? new Date()),
      },
    });

    await recordAudit({
      actor: req.actor!,
      action: 'STATUS_CHANGE',
      entity: 'Inquiry',
      entityId: row.id,
      summary: `Inquiry ${row.ref} (${row.subject}) → ${row.status}`,
      diff: { status: { from: before.status, to: row.status } },
      req,
    });
    ok(res, toInquiry(row));
  }),
);

/* ================================================================== *
 * TITLE SETUP REQUESTS
 * ================================================================== */

adminOpsRouter.get(
  '/title-requests',
  asyncHandler(async (req, res) => {
    const { page, perPage, skip } = paginate(req.query as Record<string, unknown>);
    const q = String(req.query.q ?? '').trim();
    const status = String(req.query.status ?? '').trim();

    const where: Prisma.TitleRequestWhereInput = {
      ...(status ? { status: status as BookingStatus } : {}),
      ...(q
        ? {
            OR: [
              { ref: { contains: q, mode: 'insensitive' } },
              { titleName: { contains: q, mode: 'insensitive' } },
              { customerName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.titleRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: perPage }),
      prisma.titleRequest.count({ where }),
    ]);

    res.status(200).json({
      data: rows.map(toTitleRequest),
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),
);

adminOpsRouter.patch(
  '/title-requests/:id',
  asyncHandler(async (req, res) => {
    const status = String((req.body as { status?: string }).status ?? '');
    if (!status) throw badRequest('Provide a status.');

    const before = await prisma.titleRequest.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Request not found');

    const row = await prisma.titleRequest.update({ where: { id: before.id }, data: { status: status as BookingStatus } });

    await recordAudit({
      actor: req.actor!,
      action: 'STATUS_CHANGE',
      entity: 'TitleRequest',
      entityId: row.id,
      summary: `Title request ${row.ref} (${row.titleName}) → ${status}`,
      diff: { status: { from: before.status, to: row.status } },
      req,
    });
    ok(res, toTitleRequest(row));
  }),
);

/* ================================================================== *
 * TITLE INDEX (the reference catalogue behind /titles)
 * ================================================================== */

adminOpsRouter.get(
  '/titles',
  asyncHandler(async (req, res) => {
    const { page, perPage, skip } = paginate(req.query as Record<string, unknown>);
    const q = String(req.query.q ?? '').trim();
    const genre = String(req.query.genre ?? '').trim();

    const where: Prisma.TitleEntryWhereInput = {
      ...(genre ? { genre: genre as never } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.titleEntry.findMany({ where, orderBy: { name: 'asc' }, skip, take: perPage }),
      prisma.titleEntry.count({ where }),
    ]);

    res.status(200).json({
      data: rows,
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),
);

adminOpsRouter.patch(
  '/titles/:id',
  asyncHandler(async (req, res) => {
    const input = req.body as { name?: string; genre?: string; series?: string | null };
    const before = await prisma.titleEntry.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Title not found');

    const row = await prisma.titleEntry.update({
      where: { id: before.id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.genre ? { genre: input.genre as never } : {}),
        ...(input.series !== undefined ? { series: input.series } : {}),
      },
    });

    await recordAudit({
      actor: req.actor!,
      action: 'UPDATE',
      entity: 'TitleEntry',
      entityId: row.id,
      summary: `Updated title entry “${row.name}”`,
      diff: diffObjects(
        { name: before.name, genre: before.genre, series: before.series },
        { name: row.name, genre: row.genre, series: row.series },
      ),
      req,
    });
    ok(res, row);
  }),
);
