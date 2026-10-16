import type {
  Category as CategoryRow,
  Order as OrderRow,
  OrderItem as OrderItemRow,
  Product as ProductRow,
  RepairBooking as BookingRow,
  Service as ServiceRow,
  TitleEntry as TitleEntryRow,
  AuditLog as AuditRow,
  Inquiry as InquiryRow,
  TitleRequest as TitleRequestRow,
  Prisma,
} from '@prisma/client';
import type {
  AuditEntry,
  Category,
  Inquiry,
  InstallStep,
  Order,
  OrderItem,
  Product,
  ProductImage,
  RepairBooking,
  RequirementGroup,
  Service,
  SpecRow,
  TitleEntry,
  TitleRequest,
} from '@arkvolt/shared';

/**
 * Prisma types every `Json` column as `Prisma.JsonValue`. These narrowers make
 * the cast explicit and total, so a malformed row degrades to an empty list
 * instead of throwing inside a React render three layers away.
 */
const asArray = <T>(value: Prisma.JsonValue | null | undefined): T[] =>
  Array.isArray(value) ? (value as unknown as T[]) : [];

const asObject = <T extends object>(value: Prisma.JsonValue | null | undefined): T | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as unknown as T) : null;

const iso = (d: Date): string => d.toISOString();

export const toCategory = (row: CategoryRow & { _count?: { products: number } }): Category => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  kind: row.kind,
  description: row.description || null,
  sortOrder: row.sortOrder,
  ...(row._count ? { productCount: row._count.products } : {}),
});

export const toProduct = (
  row: ProductRow & { category?: CategoryRow | null },
): Product => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  sku: row.sku,
  kind: row.kind,
  status: row.status,
  categoryId: row.categoryId,
  ...(row.category
    ? { category: { id: row.category.id, name: row.category.name, slug: row.category.slug, kind: row.category.kind } }
    : {}),
  tagline: row.tagline,
  shortDescription: row.shortDescription,
  description: row.description,
  priceKobo: row.priceKobo,
  compareAtKobo: row.compareAtKobo,
  priceType: row.priceType,
  stock: row.stock,
  trackStock: row.trackStock,
  isFeatured: row.isFeatured,
  sortOrder: row.sortOrder,
  images: asArray<ProductImage>(row.images),
  specs: asArray<SpecRow>(row.specs),
  requirements: asArray<RequirementGroup>(row.requirements),
  installSteps: asArray<InstallStep>(row.installSteps),
  included: asArray<string>(row.included),
  deliveryNotes: row.deliveryNotes || null,
  tags: asArray<string>(row.tags),
  metaTitle: row.metaTitle || null,
  metaDescription: row.metaDescription || null,
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

export const toService = (row: ServiceRow): Service => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  tagline: row.tagline,
  shortDescription: row.shortDescription,
  description: row.description,
  priceKobo: row.priceKobo,
  priceType: row.priceType,
  durationMins: row.durationMins,
  turnaround: row.turnaround,
  includes: asArray<string>(row.includes),
  process: asArray<InstallStep>(row.process),
  faqs: asArray<{ q: string; a: string }>(row.faqs),
  images: asArray<ProductImage>(row.images),
  status: row.status,
  isFeatured: row.isFeatured,
  sortOrder: row.sortOrder,
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

export const toTitleEntry = (row: TitleEntryRow): TitleEntry => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  series: row.series,
  genre: row.genre,
  platforms: asArray<string>(row.platforms),
});

export const toOrderItem = (row: OrderItemRow): OrderItem => ({
  id: row.id,
  productId: row.productId,
  nameSnapshot: row.nameSnapshot,
  skuSnapshot: row.skuSnapshot,
  slugSnapshot: row.slugSnapshot,
  unitPriceKobo: row.unitPriceKobo,
  quantity: row.quantity,
  lineTotalKobo: row.lineTotalKobo,
});

export const toOrder = (row: OrderRow & { items?: OrderItemRow[] }): Order => ({
  id: row.id,
  ref: row.ref,
  customerName: row.customerName,
  phone: row.phone,
  email: row.email,
  address: row.address,
  city: row.city,
  state: row.state,
  fulfilment: row.fulfilment,
  status: row.status,
  paymentMethod: row.paymentMethod,
  paymentStatus: row.paymentStatus,
  items: (row.items ?? []).map(toOrderItem),
  subtotalKobo: row.subtotalKobo,
  deliveryFeeKobo: row.deliveryFeeKobo,
  discountKobo: row.discountKobo,
  totalKobo: row.totalKobo,
  notes: row.notes,
  internalNotes: row.internalNotes,
  whatsappSentAt: row.whatsappSentAt ? iso(row.whatsappSentAt) : null,
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

export const toBooking = (
  row: BookingRow & { service?: { id: string; name: string; slug: string } | null },
): RepairBooking => ({
  id: row.id,
  ref: row.ref,
  customerName: row.customerName,
  phone: row.phone,
  email: row.email,
  serviceMode: row.serviceMode,
  address: row.address,
  city: row.city,
  state: row.state,
  deviceCategory: row.deviceCategory,
  deviceBrand: row.deviceBrand,
  deviceModel: row.deviceModel,
  issueCategory: row.issueCategory,
  issueDescription: row.issueDescription,
  urgency: row.urgency,
  preferredDate: row.preferredDate,
  preferredSlot: row.preferredSlot,
  serviceId: row.serviceId,
  service: row.service ?? null,
  estimatedKobo: row.estimatedKobo,
  status: row.status,
  technician: row.technician,
  internalNotes: row.internalNotes,
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

export const toInquiry = (row: InquiryRow): Inquiry => ({
  id: row.id,
  ref: row.ref,
  name: row.name,
  phone: row.phone,
  email: row.email,
  subject: row.subject,
  message: row.message,
  source: row.source,
  relatedSlug: row.relatedSlug,
  status: row.status,
  handledAt: row.handledAt ? iso(row.handledAt) : null,
  createdAt: iso(row.createdAt),
});

export const toTitleRequest = (row: TitleRequestRow): TitleRequest => ({
  id: row.id,
  titleName: row.titleName,
  titleSlug: row.titleSlug,
  platform: row.platform,
  deviceSpecs: row.deviceSpecs,
  customerName: row.customerName,
  phone: row.phone,
  email: row.email,
  city: row.city,
  notes: row.notes,
  status: row.status,
  ref: row.ref,
  createdAt: iso(row.createdAt),
});

export const toAuditEntry = (row: AuditRow): AuditEntry => ({
  id: row.id,
  actorEmail: row.actorEmail,
  actorName: row.actorName,
  action: row.action,
  entity: row.entity,
  entityId: row.entityId,
  summary: row.summary,
  diff: asObject<Record<string, unknown>>(row.diff),
  ip: row.ip,
  userAgent: row.userAgent,
  createdAt: iso(row.createdAt),
});
