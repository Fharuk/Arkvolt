import { z } from 'zod';
import {
  AUDIT_ACTIONS,
  BOOKING_STATUSES,
  DEVICE_CATEGORIES,
  FULFILMENT_MODES,
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  ISSUE_CATEGORIES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRICE_TYPES,
  PRODUCT_KINDS,
  PRODUCT_SORTS,
  PRODUCT_STATUSES,
  SERVICE_MODES,
  URGENCIES,
} from './types';

/* ------------------------------------------------------------------ *
 * Field primitives
 * ------------------------------------------------------------------ */

const slug = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only');

/**
 * Nigerian mobile numbers land in many shapes: 0803…, +234803…, 234 803 …,
 * with or without spaces, dashes or dots. Normalise everything to 234XXXXXXXXXX
 * before it is validated, stored or handed to a wa.me link.
 */
export const normalisePhone = (input: string): string => {
  const digits = input.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  if (digits.startsWith('+234')) return `234${digits.slice(4)}`;
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  return digits;
};

export const phone = z
  .string()
  .trim()
  .min(7, 'Enter a phone number')
  .transform(normalisePhone)
  .refine((v) => /^\d{10,15}$/.test(v), 'Enter a valid phone number, e.g. 0803 000 0000');

export const email = z.string().trim().toLowerCase().email('Enter a valid email address');

const naira = z.coerce.number().min(0).max(100_000_000);

const shortText = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label} is required`).max(max, `${label} is too long`);

/* ------------------------------------------------------------------ *
 * Cart / order
 * ------------------------------------------------------------------ */

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(50),
});

export const checkoutSchema = z.object({
  customerName: shortText(2, 120, 'Full name'),
  phone,
  email: z.union([email, z.literal('')]).optional(),
  fulfilment: z.enum(FULFILMENT_MODES),
  address: z.string().trim().max(400).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  state: z.string().trim().max(80).optional().or(z.literal('')),
  paymentMethod: z.enum(PAYMENT_METHODS).default('WHATSAPP_TRANSFER'),
  notes: z.string().trim().max(600).optional().or(z.literal('')),
  items: z.array(cartLineSchema).min(1, 'Your cart is empty'),
  /** Set by the client so the same submission is never double-booked. */
  idempotencyKey: z.string().min(8).max(80),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/* ------------------------------------------------------------------ *
 * Repair booking
 * ------------------------------------------------------------------ */

export const bookingSchema = z.object({
  customerName: shortText(2, 120, 'Full name'),
  phone,
  email: z.union([email, z.literal('')]).optional(),
  serviceMode: z.enum(SERVICE_MODES),
  address: z.string().trim().max(400).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  state: z.string().trim().max(80).optional().or(z.literal('')),
  deviceCategory: z.enum(DEVICE_CATEGORIES),
  deviceBrand: shortText(1, 60, 'Brand'),
  deviceModel: shortText(1, 120, 'Model'),
  issueCategory: z.enum(ISSUE_CATEGORIES),
  issueDescription: shortText(10, 1500, 'Description'),
  urgency: z.enum(URGENCIES).default('STANDARD'),
  preferredDate: z.string().trim().max(20).optional().or(z.literal('')),
  preferredSlot: z.string().trim().max(40).optional().or(z.literal('')),
  serviceId: z.string().trim().max(60).optional().or(z.literal('')),
  idempotencyKey: z.string().min(8).max(80),
});

export type BookingInput = z.infer<typeof bookingSchema>;

/* ------------------------------------------------------------------ *
 * Inquiry / title request
 * ------------------------------------------------------------------ */

export const inquirySchema = z.object({
  name: shortText(2, 120, 'Name'),
  phone,
  email: z.union([email, z.literal('')]).optional(),
  subject: shortText(3, 160, 'Subject'),
  message: shortText(10, 2000, 'Message'),
  source: z.enum(INQUIRY_SOURCES).default('CONTACT'),
  relatedSlug: z.string().trim().max(160).optional().or(z.literal('')),
  idempotencyKey: z.string().min(8).max(80),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export const titleRequestSchema = z.object({
  titleName: shortText(1, 160, 'Title'),
  titleSlug: z.string().trim().max(160).optional().or(z.literal('')),
  platform: shortText(1, 60, 'Platform'),
  deviceSpecs: z.string().trim().max(400).optional().or(z.literal('')),
  customerName: shortText(2, 120, 'Full name'),
  phone,
  email: z.union([email, z.literal('')]).optional(),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  idempotencyKey: z.string().min(8).max(80),
});

export type TitleRequestInput = z.infer<typeof titleRequestSchema>;

/* ------------------------------------------------------------------ *
 * Admin: auth
 * ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email,
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(12, 'Use at least 12 characters')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/\d/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/* ------------------------------------------------------------------ *
 * Admin: catalog writes
 * ------------------------------------------------------------------ */

export const specRowSchema = z.object({ label: shortText(1, 60, 'Label'), value: shortText(1, 160, 'Value') });
export const installStepSchema = z.object({
  title: shortText(1, 120, 'Step title'),
  detail: shortText(1, 800, 'Step detail'),
});
export const requirementGroupSchema = z.object({
  label: shortText(1, 80, 'Group label'),
  items: z.array(z.string().trim().min(1).max(300)).max(24),
});
export const productImageSchema = z.object({
  url: z.string().trim().min(1),
  alt: z.string().trim().max(200).default(''),
  publicId: z.string().trim().max(200).optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

export const productSchema = z.object({
  name: shortText(2, 160, 'Product name'),
  slug: slug.optional(),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9][A-Z0-9\-_.]*$/, 'Use uppercase letters, numbers, dash, dot or underscore'),
  kind: z.enum(PRODUCT_KINDS),
  status: z.enum(PRODUCT_STATUSES).default('DRAFT'),
  categoryId: z.string().min(1, 'Choose a category'),
  tagline: z.string().trim().max(180).default(''),
  shortDescription: z.string().trim().max(400).default(''),
  description: z.string().trim().max(8000).default(''),
  price: naira,
  compareAtPrice: z.union([naira, z.literal('')]).optional(),
  priceType: z.enum(PRICE_TYPES).default('FIXED'),
  stock: z.coerce.number().int().min(0).max(100_000).default(0),
  trackStock: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  images: z.array(productImageSchema).max(12).default([]),
  specs: z.array(specRowSchema).max(40).default([]),
  requirements: z.array(requirementGroupSchema).max(8).default([]),
  installSteps: z.array(installStepSchema).max(30).default([]),
  included: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  deliveryNotes: z.string().trim().max(1200).default(''),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  metaTitle: z.string().trim().max(200).default(''),
  metaDescription: z.string().trim().max(320).default(''),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;

export const serviceSchema = z.object({
  name: shortText(2, 160, 'Service name'),
  slug: slug.optional(),
  tagline: z.string().trim().max(180).default(''),
  shortDescription: z.string().trim().max(400).default(''),
  description: z.string().trim().max(8000).default(''),
  price: naira,
  priceType: z.enum(PRICE_TYPES).default('FROM'),
  durationMins: z.union([z.coerce.number().int().min(15).max(2880), z.literal('')]).optional(),
  turnaround: z.string().trim().max(120).default(''),
  includes: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  process: z.array(installStepSchema).max(20).default([]),
  faqs: z.array(z.object({ q: shortText(1, 200, 'Question'), a: shortText(1, 900, 'Answer') })).max(20).default([]),
  images: z.array(productImageSchema).max(6).default([]),
  status: z.enum(PRODUCT_STATUSES).default('ACTIVE'),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

export const categorySchema = z.object({
  name: shortText(2, 80, 'Category name'),
  slug: slug.optional(),
  kind: z.enum(PRODUCT_KINDS),
  description: z.string().trim().max(400).default(''),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const settingsSchema = z.object({
  storeName: shortText(1, 80, 'Store name'),
  tagline: z.string().trim().max(200).default(''),
  whatsappNumber: phone,
  supportPhone: z.union([phone, z.literal('')]).optional(),
  supportEmail: z.union([email, z.literal('')]).optional(),
  workshopAddress: z.string().trim().max(400).default(''),
  workshopHours: z.string().trim().max(300).default(''),
  announcement: z.string().trim().max(240).default(''),
  announcementEnabled: z.boolean().default(false),
  bankDetails: z.string().trim().max(600).default(''),
  deliveryFee: naira.default(0),
  freeDeliveryThreshold: naira.default(0),
  socials: z
    .array(z.object({ label: shortText(1, 40, 'Label'), href: z.string().trim().url('Enter a full URL') }))
    .max(8)
    .default([]),
});

/* ------------------------------------------------------------------ *
 * Admin: pipeline updates
 * ------------------------------------------------------------------ */

export const orderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  deliveryFee: z.union([naira, z.literal('')]).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
});

export const bookingUpdateSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  technician: z.string().trim().max(80).optional(),
  estimatedFee: z.union([naira, z.literal('')]).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
});

export const inquiryUpdateSchema = z.object({
  status: z.enum(INQUIRY_STATUSES).optional(),
});

export const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24),
  sort: z.enum(PRODUCT_SORTS).default('featured'),
  category: z.string().trim().max(120).optional(),
  kind: z.enum(PRODUCT_KINDS).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  featured: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
  entity: z.string().trim().max(40).optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Flatten a ZodError into the `details` shape carried by ApiError. */
export const fieldErrors = (err: z.ZodError): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
};

export const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
