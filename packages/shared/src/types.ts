/**
 * ARKVOLT — shared domain types.
 * Single source of truth for the API, the storefront and the admin dashboard.
 * Nothing in here imports from Prisma or Next: it is deliberately framework-free
 * so it can be consumed by the Express service and the browser bundle alike.
 */

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

/** Minor units. ₦1 = 100 kobo. Never use floats for money. */
export type Kobo = number;

export type Currency = 'NGN';

export const PRODUCT_KINDS = ['SOFTWARE', 'HARDWARE', 'PART', 'SERVICE'] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const FULFILMENT_MODES = ['PICKUP', 'DELIVERY', 'ONSITE', 'REMOTE'] as const;
export type FulfilmentMode = (typeof FULFILMENT_MODES)[number];

/** The order pipeline. Sequential by design — it maps to how the admin actually works. */
export const ORDER_STATUSES = [
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['WHATSAPP_TRANSFER', 'BANK_TRANSFER', 'CASH_ON_DELIVERY'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['UNPAID', 'AWAITING_CONFIRMATION', 'PAID', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BOOKING_STATUSES = [
  'NEW',
  'CONTACTED',
  'SCHEDULED',
  'IN_PROGRESS',
  'AWAITING_PARTS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const URGENCIES = ['STANDARD', 'PRIORITY', 'EMERGENCY'] as const;
export type Urgency = (typeof URGENCIES)[number];

export const SERVICE_MODES = ['DROP_OFF', 'ONSITE', 'REMOTE', 'COURIER'] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export const INQUIRY_STATUSES = ['NEW', 'READ', 'REPLIED', 'CLOSED', 'SPAM'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_SOURCES = ['CONTACT', 'PRODUCT', 'SERVICE', 'TITLE_REQUEST', 'FOOTER'] as const;
export type InquirySource = (typeof INQUIRY_SOURCES)[number];

export const PRICE_TYPES = ['FIXED', 'FROM', 'QUOTE'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const DEVICE_CATEGORIES = [
  'LAPTOP',
  'DESKTOP',
  'ALL_IN_ONE',
  'CONSOLE',
  'PRINTER',
  'PHONE',
  'TABLET',
  'SERVER',
  'NETWORKING',
  'OTHER',
] as const;
export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

export const ISSUE_CATEGORIES = [
  'WONT_BOOT',
  'OVERHEATING',
  'SLOW_PERFORMANCE',
  'BLUE_SCREEN',
  'DATA_RECOVERY',
  'SCREEN_DAMAGE',
  'KEYBOARD_TRACKPAD',
  'BATTERY_POWER',
  'OS_CORRUPTION',
  'VIRUS_MALWARE',
  'STORAGE_UPGRADE',
  'RAM_UPGRADE',
  'CONNECTIVITY',
  'WATER_DAMAGE',
  'OTHER',
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

/* ------------------------------------------------------------------ *
 * Catalog
 * ------------------------------------------------------------------ */

export interface Category {
  id: string;
  name: string;
  slug: string;
  kind: ProductKind;
  description: string | null;
  sortOrder: number;
  productCount?: number;
}

/** A single row of the specification block on a product page. */
export interface SpecRow {
  label: string;
  value: string;
}

/** One step of the "install / setup procedure" block on a product page. */
export interface InstallStep {
  title: string;
  detail: string;
}

export interface RequirementGroup {
  label: string;
  items: string[];
}

export interface ProductImage {
  url: string;
  alt: string;
  /** Cloudinary public id, when the asset was uploaded through the admin. */
  publicId?: string;
  width?: number;
  height?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  kind: ProductKind;
  status: ProductStatus;
  categoryId: string;
  category?: Pick<Category, 'id' | 'name' | 'slug' | 'kind'>;
  tagline: string;
  shortDescription: string;
  description: string;
  priceKobo: Kobo;
  /** Struck-through reference price, when running a promotion. */
  compareAtKobo: Kobo | null;
  priceType: PriceType;
  stock: number;
  trackStock: boolean;
  isFeatured: boolean;
  sortOrder: number;
  images: ProductImage[];
  specs: SpecRow[];
  requirements: RequirementGroup[];
  installSteps: InstallStep[];
  included: string[];
  deliveryNotes: string | null;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListQuery {
  q?: string;
  category?: string;
  kind?: ProductKind;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
  featured?: boolean;
  inStock?: boolean;
}

export const PRODUCT_SORTS = ['featured', 'newest', 'price-asc', 'price-desc', 'name-asc'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/* ------------------------------------------------------------------ *
 * Repair services
 * ------------------------------------------------------------------ */

export interface Service {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  shortDescription: string;
  description: string;
  priceKobo: Kobo;
  priceType: PriceType;
  durationMins: number | null;
  turnaround: string;
  includes: string[];
  process: InstallStep[];
  faqs: { q: string; a: string }[];
  images: ProductImage[];
  status: ProductStatus;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Reference catalogue of titles (names only — no distribution artefacts)
 * ------------------------------------------------------------------ */

export interface TitleEntry {
  id: string;
  name: string;
  slug: string;
  /** Loose franchise/series grouping, e.g. "Assassin's Creed". */
  series: string | null;
  /** Coarse genre bucket used for filtering. */
  genre: Genre;
  platforms: string[];
}

export const GENRES = [
  'ACTION',
  'OPEN_WORLD',
  'SPORTS',
  'RACING',
  'SHOOTER',
  'FIGHTING',
  'HORROR',
  'RPG',
  'ADVENTURE',
  'STRATEGY',
  'FAMILY',
  'SIMULATION',
] as const;
export type Genre = (typeof GENRES)[number];

export interface TitleRequest {
  id: string;
  titleName: string;
  titleSlug: string | null;
  platform: string;
  deviceSpecs: string | null;
  customerName: string;
  phone: string;
  email: string | null;
  city: string | null;
  notes: string | null;
  status: BookingStatus;
  ref: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

export interface OrderItem {
  id: string;
  productId: string | null;
  nameSnapshot: string;
  skuSnapshot: string;
  slugSnapshot: string | null;
  unitPriceKobo: Kobo;
  quantity: number;
  lineTotalKobo: Kobo;
}

export interface Order {
  id: string;
  ref: string;
  customerName: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  fulfilment: FulfilmentMode;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  subtotalKobo: Kobo;
  deliveryFeeKobo: Kobo;
  discountKobo: Kobo;
  totalKobo: Kobo;
  notes: string | null;
  internalNotes: string | null;
  whatsappSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  unitPriceKobo: Kobo;
  quantity: number;
  imageUrl: string | null;
  stock: number;
  trackStock: boolean;
  kind: ProductKind;
}

/* ------------------------------------------------------------------ *
 * Repair bookings & inquiries
 * ------------------------------------------------------------------ */

export interface RepairBooking {
  id: string;
  ref: string;
  customerName: string;
  phone: string;
  email: string | null;
  serviceMode: ServiceMode;
  address: string | null;
  city: string | null;
  state: string | null;
  deviceCategory: DeviceCategory;
  deviceBrand: string;
  deviceModel: string;
  issueCategory: IssueCategory;
  issueDescription: string;
  urgency: Urgency;
  preferredDate: string | null;
  preferredSlot: string | null;
  serviceId: string | null;
  service?: Pick<Service, 'id' | 'name' | 'slug'> | null;
  estimatedKobo: Kobo | null;
  status: BookingStatus;
  technician: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Inquiry {
  id: string;
  ref: string;
  name: string;
  phone: string;
  email: string | null;
  subject: string;
  message: string;
  source: InquirySource;
  relatedSlug: string | null;
  status: InquiryStatus;
  handledAt: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ *
 * Settings, audit, dashboard
 * ------------------------------------------------------------------ */

export interface StoreSettings {
  storeName: string;
  tagline: string;
  whatsappNumber: string;
  supportPhone: string;
  supportEmail: string;
  workshopAddress: string;
  workshopHours: string;
  announcement: string | null;
  announcementEnabled: boolean;
  bankDetails: string | null;
  deliveryFeeKobo: Kobo;
  freeDeliveryThresholdKobo: Kobo;
  currency: Currency;
  socials: { label: string; href: string }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actorEmail: string;
  actorName: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  summary: string;
  diff: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export const AUDIT_ACTIONS = [
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATUS_CHANGE',
  'PUBLISH',
  'UNPUBLISH',
  'UPLOAD',
  'SETTINGS_UPDATE',
  'PASSWORD_CHANGE',
  'EXPORT',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface DashboardStats {
  orders: { total: number; open: number; completed: number; cancelled: number };
  revenueKobo: Kobo;
  revenueThisMonthKobo: Kobo;
  bookings: { total: number; open: number; emergency: number };
  inquiries: { total: number; unread: number };
  products: { total: number; active: number; draft: number; lowStock: number };
  titleRequests: { total: number; open: number };
  recentOrders: Order[];
  recentBookings: RepairBooking[];
  revenueSeries: { label: string; valueKobo: Kobo }[];
  topProducts: { name: string; sku: string; units: number; revenueKobo: Kobo }[];
}

/* ------------------------------------------------------------------ *
 * API envelope
 * ------------------------------------------------------------------ */

export interface ApiMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: ApiMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]> | undefined;
  };
}

/* ------------------------------------------------------------------ *
 * Label maps — one place, so UI copy never drifts from the enums
 * ------------------------------------------------------------------ */

export const LABELS = {
  ProductKind: {
    SOFTWARE: 'Software',
    HARDWARE: 'Hardware',
    PART: 'Component',
    SERVICE: 'Service',
  } satisfies Record<ProductKind, string>,
  OrderStatus: {
    NEW: 'New',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY: 'Ready to collect',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  } satisfies Record<OrderStatus, string>,
  PaymentStatus: {
    UNPAID: 'Unpaid',
    AWAITING_CONFIRMATION: 'Awaiting confirmation',
    PAID: 'Paid',
    REFUNDED: 'Refunded',
  } satisfies Record<PaymentStatus, string>,
  BookingStatus: {
    NEW: 'New',
    CONTACTED: 'Contacted',
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In progress',
    AWAITING_PARTS: 'Awaiting parts',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  } satisfies Record<BookingStatus, string>,
  Urgency: {
    STANDARD: 'Standard',
    PRIORITY: 'Priority',
    EMERGENCY: 'Emergency',
  } satisfies Record<Urgency, string>,
  ServiceMode: {
    DROP_OFF: 'Bring to workshop',
    ONSITE: 'On-site visit',
    REMOTE: 'Remote session',
    COURIER: 'Courier to us',
  } satisfies Record<ServiceMode, string>,
  DeviceCategory: {
    LAPTOP: 'Laptop',
    DESKTOP: 'Desktop / tower',
    ALL_IN_ONE: 'All-in-one',
    CONSOLE: 'Games console',
    PRINTER: 'Printer',
    PHONE: 'Phone',
    TABLET: 'Tablet',
    SERVER: 'Server / NAS',
    NETWORKING: 'Networking gear',
    OTHER: 'Other device',
  } satisfies Record<DeviceCategory, string>,
  IssueCategory: {
    WONT_BOOT: 'Will not power on / boot',
    OVERHEATING: 'Overheating or fan noise',
    SLOW_PERFORMANCE: 'Slow performance',
    BLUE_SCREEN: 'Blue screen / crashing',
    DATA_RECOVERY: 'Data loss or recovery',
    SCREEN_DAMAGE: 'Screen damage',
    KEYBOARD_TRACKPAD: 'Keyboard or trackpad',
    BATTERY_POWER: 'Battery or charging',
    OS_CORRUPTION: 'Operating system corruption',
    VIRUS_MALWARE: 'Virus or malware',
    STORAGE_UPGRADE: 'Storage upgrade',
    RAM_UPGRADE: 'Memory upgrade',
    CONNECTIVITY: 'Wi-Fi / networking',
    WATER_DAMAGE: 'Liquid damage',
    OTHER: 'Something else',
  } satisfies Record<IssueCategory, string>,
  InquirySource: {
    CONTACT: 'Contact form',
    PRODUCT: 'Product page',
    SERVICE: 'Service page',
    TITLE_REQUEST: 'Title request',
    FOOTER: 'Footer',
  } satisfies Record<InquirySource, string>,
  InquiryStatus: {
    NEW: 'New',
    READ: 'Read',
    REPLIED: 'Replied',
    CLOSED: 'Closed',
    SPAM: 'Spam',
  } satisfies Record<InquiryStatus, string>,
  FulfilmentMode: {
    PICKUP: 'Collect in person',
    DELIVERY: 'Courier delivery',
    ONSITE: 'On-site service',
    REMOTE: 'Remote session',
  } satisfies Record<FulfilmentMode, string>,
  PriceType: {
    FIXED: 'Fixed price',
    FROM: 'From',
    QUOTE: 'Quote on assessment',
  } satisfies Record<PriceType, string>,
  Genre: {
    ACTION: 'Action',
    OPEN_WORLD: 'Open world',
    SPORTS: 'Sports',
    RACING: 'Racing',
    SHOOTER: 'Shooter',
    FIGHTING: 'Fighting',
    HORROR: 'Horror',
    RPG: 'RPG',
    ADVENTURE: 'Adventure',
    STRATEGY: 'Strategy',
    FAMILY: 'Family',
    SIMULATION: 'Simulation',
  } satisfies Record<Genre, string>,
  AuditAction: {
    LOGIN: 'Signed in',
    LOGIN_FAILED: 'Failed sign-in',
    LOGOUT: 'Signed out',
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    STATUS_CHANGE: 'Status changed',
    PUBLISH: 'Published',
    UNPUBLISH: 'Unpublished',
    UPLOAD: 'Uploaded media',
    SETTINGS_UPDATE: 'Settings updated',
    PASSWORD_CHANGE: 'Password changed',
    EXPORT: 'Exported data',
  } satisfies Record<AuditAction, string>,
} as const;

/** Order/booking references are human-readable and read aloud over the phone. */
export const REF_PREFIX = {
  order: 'AV',
  booking: 'AVR',
  inquiry: 'AVQ',
  title: 'AVT',
} as const;
