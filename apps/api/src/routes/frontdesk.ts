import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  bookingSchema,
  buildBookingMessage,
  buildInquiryMessage,
  buildTitleRequestMessage,
  generateRef,
  inquirySchema,
  slugify,
  titleRequestSchema,
  waLink,
} from '@arkvolt/shared';
import { prisma } from '../db';
import { asyncHandler, badRequest, notFound, ok } from '../lib/http';
import { toBooking, toInquiry, toTitleRequest } from '../lib/serialise';
import { getSettings } from '../lib/settings';
import { logger } from '../lib/logger';
import { validate } from '../middleware/validate';

export const frontDeskRouter = Router();

/** Bookings, inquiries and title requests all open a WhatsApp thread — same abuse profile as checkout. */
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many submissions. Please call or message us directly.' } },
});

/* ------------------------------------------------------------------ *
 * Repair bookings
 * ------------------------------------------------------------------ */

frontDeskRouter.post(
  '/bookings',
  submitLimiter,
  validate(bookingSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('@arkvolt/shared').BookingInput;

    const existing = await prisma.repairBooking.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { service: { select: { id: true, name: true, slug: true } } },
    });

    const settings = await getSettings();

    if (existing) {
      const booking = toBooking(existing);
      ok(res, { booking, whatsappUrl: waLink(settings.whatsappNumber, buildBookingMessage(booking, settings)), duplicate: true });
      return;
    }

    /* A booking may optionally reference a service package. Validate it exists
     * so a stale client cannot attach an arbitrary id. */
    let service: { id: string; name: string } | null = null;
    if (input.serviceId) {
      service = await prisma.service.findFirst({
        where: { id: input.serviceId, status: 'ACTIVE' },
        select: { id: true, name: true },
      });
      if (!service) throw badRequest('That service package is no longer offered.', { serviceId: ['Unavailable'] });
    }

    if (input.serviceMode !== 'REMOTE' && !input.address && !input.city) {
      throw badRequest('Tell us where the machine is so we can plan the visit.', {
        address: ['Add an address or at least a city'],
      });
    }

    const row = await prisma.repairBooking.create({
      data: {
        ref: generateRef('booking'),
        customerName: input.customerName,
        phone: input.phone,
        email: input.email || null,
        serviceMode: input.serviceMode,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        deviceCategory: input.deviceCategory,
        deviceBrand: input.deviceBrand,
        deviceModel: input.deviceModel,
        issueCategory: input.issueCategory,
        issueDescription: input.issueDescription,
        urgency: input.urgency,
        preferredDate: input.preferredDate || null,
        preferredSlot: input.preferredSlot || null,
        serviceId: service?.id ?? null,
        status: 'NEW',
        idempotencyKey: input.idempotencyKey,
      },
      include: { service: { select: { id: true, name: true, slug: true } } },
    });

    const booking = toBooking(row);
    logger.info('Repair booking created', {
      ref: booking.ref,
      urgency: booking.urgency,
      device: `${booking.deviceBrand} ${booking.deviceModel}`,
    });

    ok(res, { booking, whatsappUrl: waLink(settings.whatsappNumber, buildBookingMessage(booking, settings)), duplicate: false }, 201);
  }),
);

frontDeskRouter.get(
  '/bookings/:ref',
  asyncHandler(async (req, res) => {
    const row = await prisma.repairBooking.findUnique({
      where: { ref: String(req.params.ref).toUpperCase().trim() },
      include: { service: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) throw notFound('We could not find a booking with that reference.');
    ok(res, { ...toBooking(row), internalNotes: null });
  }),
);

/* ------------------------------------------------------------------ *
 * General inquiries
 * ------------------------------------------------------------------ */

frontDeskRouter.post(
  '/inquiries',
  submitLimiter,
  validate(inquirySchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('@arkvolt/shared').InquiryInput;

    const existing = await prisma.inquiry.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    const settings = await getSettings();

    if (existing) {
      const inquiry = toInquiry(existing);
      ok(res, { inquiry, whatsappUrl: waLink(settings.whatsappNumber, buildInquiryMessage(inquiry, settings)), duplicate: true });
      return;
    }

    /* Link the inquiry to the product it was raised from, when the slug resolves. */
    let relatedSlug: string | null = input.relatedSlug || null;
    if (relatedSlug) {
      const found =
        (await prisma.product.findUnique({ where: { slug: relatedSlug }, select: { slug: true } })) ??
        (await prisma.service.findUnique({ where: { slug: relatedSlug }, select: { slug: true } }));
      relatedSlug = found?.slug ?? null;
    }

    const row = await prisma.inquiry.create({
      data: {
        ref: generateRef('inquiry'),
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        subject: input.subject,
        message: input.message,
        source: input.source,
        relatedSlug,
        status: 'NEW',
        idempotencyKey: input.idempotencyKey,
      },
    });

    const inquiry = toInquiry(row);
    logger.info('Inquiry created', { ref: inquiry.ref, source: inquiry.source });

    ok(res, { inquiry, whatsappUrl: waLink(settings.whatsappNumber, buildInquiryMessage(inquiry, settings)), duplicate: false }, 201);
  }),
);

/* ------------------------------------------------------------------ *
 * Title setup requests
 *
 * The customer asks us to prepare a machine for a specific title. The
 * deliverable is the technician's time, not a binary: we quote the setup,
 * verify their hardware against the requirement sheet, and hand over a
 * configured machine.
 * ------------------------------------------------------------------ */

frontDeskRouter.post(
  '/title-requests',
  submitLimiter,
  validate(titleRequestSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('@arkvolt/shared').TitleRequestInput;

    const existing = await prisma.titleRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    const settings = await getSettings();

    if (existing) {
      const request = toTitleRequest(existing);
      ok(res, { request, whatsappUrl: waLink(settings.whatsappNumber, buildTitleRequestMessage(request, settings)), duplicate: true });
      return;
    }

    /* Resolve the requested name against the title index so admin sees which
     * franchise this belongs to and how many people have asked for it. */
    const slug = input.titleSlug || slugify(input.titleName);
    const entry = await prisma.titleEntry.findFirst({
      where: { OR: [{ slug }, { name: { equals: input.titleName, mode: 'insensitive' } }] },
      select: { id: true },
    });

    const row = await prisma.titleRequest.create({
      data: {
        ref: generateRef('title'),
        titleName: input.titleName,
        titleSlug: entry ? slug : null,
        titleEntryId: entry?.id ?? null,
        platform: input.platform,
        deviceSpecs: input.deviceSpecs || null,
        customerName: input.customerName,
        phone: input.phone,
        email: input.email || null,
        city: input.city || null,
        notes: input.notes || null,
        status: 'NEW',
        idempotencyKey: input.idempotencyKey,
      },
    });

    const request = toTitleRequest(row);
    logger.info('Title setup request created', { ref: request.ref, title: request.titleName });

    ok(res, { request, whatsappUrl: waLink(settings.whatsappNumber, buildTitleRequestMessage(request, settings)), duplicate: false }, 201);
  }),
);
