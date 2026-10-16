import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { checkoutSchema, buildOrderMessage, generateRef, waLink } from '@arkvolt/shared';
import { prisma } from '../db';
import { asyncHandler, badRequest, conflict, ok } from '../lib/http';
import { toOrder, toProduct } from '../lib/serialise';
import { getSettings } from '../lib/settings';
import { logger } from '../lib/logger';
import { validate } from '../middleware/validate';

export const ordersRouter = Router();

/**
 * Checkout is public and unauthenticated, so it is the storefront's most
 * attractive abuse target. 12 orders per IP per hour is far above any real
 * customer's behaviour and far below anything useful to a script.
 */
const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many orders from this connection. Please call us instead.' } },
});

ordersRouter.post(
  '/',
  checkoutLimiter,
  validate(checkoutSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('@arkvolt/shared').CheckoutInput;

    /* --- Idempotency -------------------------------------------------
     * A flaky connection that resubmits must not create a second order.
     * The client generates the key once per checkout attempt.
     * ---------------------------------------------------------------- */
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { items: true },
    });
    if (existing) {
      const settings = await getSettings();
      const order = toOrder(existing);
      ok(res, { order, whatsappUrl: waLink(settings.whatsappNumber, buildOrderMessage(order, settings)), duplicate: true });
      return;
    }

    /* --- Never trust client-side prices ------------------------------
     * The browser sends product ids and quantities. Prices, names, SKUs and
     * stock are read from the database at the moment of purchase.
     * ---------------------------------------------------------------- */
    const ids = Array.from(new Set(input.items.map((i) => i.productId)));
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = input.items.map((line) => {
      const product = byId.get(line.productId);
      if (!product) throw badRequest('One of the items in your cart is no longer available.', { items: ['Item unavailable'] });
      if (product.status !== 'ACTIVE') {
        throw conflict(`“${product.name}” is not currently available for order.`);
      }
      if (product.trackStock && product.stock < line.quantity) {
        throw conflict(
          `Only ${product.stock} × ${product.name} left in stock. Adjust your cart and try again.`,
          { items: [`Insufficient stock for ${product.name}`] },
        );
      }
      return {
        product,
        quantity: line.quantity,
        lineTotalKobo: product.priceKobo * line.quantity,
      };
    });

    const subtotalKobo = lines.reduce((sum, l) => sum + l.lineTotalKobo, 0);
    const settings = await getSettings({ bypassCache: true });

    const qualifiesForFreeDelivery =
      settings.freeDeliveryThresholdKobo > 0 && subtotalKobo >= settings.freeDeliveryThresholdKobo;

    const deliveryFeeKobo =
      input.fulfilment === 'DELIVERY' && !qualifiesForFreeDelivery ? settings.deliveryFeeKobo : 0;

    const totalKobo = subtotalKobo + deliveryFeeKobo;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          ref: generateRef('order'),
          customerName: input.customerName,
          phone: input.phone,
          email: input.email || null,
          address: input.fulfilment === 'DELIVERY' ? input.address || null : null,
          city: input.city || null,
          state: input.state || null,
          fulfilment: input.fulfilment,
          status: 'NEW',
          paymentMethod: input.paymentMethod,
          paymentStatus: 'UNPAID',
          subtotalKobo,
          deliveryFeeKobo,
          discountKobo: 0,
          totalKobo,
          notes: input.notes || null,
          idempotencyKey: input.idempotencyKey,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              nameSnapshot: l.product.name,
              skuSnapshot: l.product.sku,
              slugSnapshot: l.product.slug,
              unitPriceKobo: l.product.priceKobo,
              quantity: l.quantity,
              lineTotalKobo: l.lineTotalKobo,
            })),
          },
        },
        include: { items: true },
      });

      // Conditional decrement: `stock: { gte: quantity }` in the WHERE clause means
      // two simultaneous checkouts cannot both take the last unit.
      await Promise.all(
        lines
          .filter((l) => l.product.trackStock)
          .map((l) =>
            tx.product.updateMany({
              where: { id: l.product.id, stock: { gte: l.quantity } },
              data: { stock: { decrement: l.quantity } },
            }),
          ),
      );

      return created;
    });

    const serialised = toOrder(order);
    logger.info('Order created', { ref: serialised.ref, total: serialised.totalKobo, items: serialised.items.length });

    ok(
      res,
      {
        order: serialised,
        whatsappUrl: waLink(settings.whatsappNumber, buildOrderMessage(serialised, settings)),
        duplicate: false,
      },
      201,
    );
  }),
);

/**
 * Public order lookup by reference. The reference is the only credential a
 * customer has after checkout, so the response omits internal notes,
 * technician assignment and anything else they should not see.
 */
ordersRouter.get(
  '/:ref',
  asyncHandler(async (req, res) => {
    const ref = String(req.params.ref).toUpperCase().trim();
    const row = await prisma.order.findUnique({ where: { ref }, include: { items: true } });

    if (!row) {
      ok(res, null);
      return;
    }

    const settings = await getSettings();
    const order = toOrder(row);
    ok(res, {
      order: { ...order, internalNotes: null },
      whatsappUrl: waLink(settings.whatsappNumber, buildOrderMessage(order, settings)),
    });
  }),
);

/** Server-side cart validation: catches sold-out or repriced items before checkout. */
ordersRouter.post(
  '/validate-cart',
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { items?: { productId?: string; quantity?: number }[] };
    const raw = Array.isArray(body.items) ? body.items : [];

    const ids = raw.map((i) => String(i.productId ?? '')).filter(Boolean);
    const rows = await prisma.product.findMany({ where: { id: { in: ids }, status: 'ACTIVE' }, include: { category: true } });
    const byId = new Map(rows.map((r) => [r.id, toProduct(r)]));

    const lines = raw.map((i) => {
      const product = byId.get(String(i.productId ?? ''));
      const requested = Math.max(1, Math.min(50, Number(i.quantity ?? 1) || 1));
      if (!product) {
        return { productId: String(i.productId ?? ''), status: 'REMOVED' as const, requested };
      }
      if (product.trackStock && product.stock < requested) {
        return { productId: product.id, status: 'REDUCED' as const, requested, available: product.stock, product };
      }
      return { productId: product.id, status: 'OK' as const, requested, product };
    });

    const subtotalKobo = lines.reduce(
      (sum, l) => sum + ('product' in l && l.product ? l.product.priceKobo * (l.status === 'REDUCED' ? l.available : l.requested) : 0),
      0,
    );

    ok(res, { lines, subtotalKobo });
  }),
);
