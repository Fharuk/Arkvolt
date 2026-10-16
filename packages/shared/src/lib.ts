import type { CartLine, Order, RepairBooking, StoreSettings, TitleRequest, Inquiry } from './types';
import { LABELS, REF_PREFIX } from './types';

/* ------------------------------------------------------------------ *
 * Money
 * All money is stored in kobo (minor units). Formatting lives here so the
 * storefront, the admin dashboard and the WhatsApp receipt never disagree.
 * ------------------------------------------------------------------ */

export const koboToNaira = (kobo: number): number => Math.round(kobo) / 100;

export const nairaToKobo = (naira: number): number => Math.round(naira * 100);

const ngn = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const ngnExact = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `₦145,000` — no decimals when the amount is whole, which it usually is. */
export const formatNaira = (kobo: number): string =>
  kobo % 100 === 0 ? ngn.format(kobo / 100) : ngnExact.format(kobo / 100);

/** `145,000` — for table cells where the ₦ is in the column header. */
export const formatAmount = (kobo: number): string =>
  new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(kobo / 100);

export const formatPrice = (
  kobo: number,
  priceType: 'FIXED' | 'FROM' | 'QUOTE',
): string => {
  if (priceType === 'QUOTE') return 'Price on assessment';
  const base = formatNaira(kobo);
  return priceType === 'FROM' ? `From ${base}` : base;
};

export const cartSubtotal = (lines: CartLine[]): number =>
  lines.reduce((sum, l) => sum + l.unitPriceKobo * l.quantity, 0);

export const cartCount = (lines: CartLine[]): number =>
  lines.reduce((sum, l) => sum + l.quantity, 0);

/* ------------------------------------------------------------------ *
 * Reference numbers
 * ------------------------------------------------------------------ */

const REF_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY3479';

/**
 * Human-readable and unambiguous when read down a phone line:
 * no B/8, I/1, O/0, S/5, Z/2 confusions. AV-4K7P2M-83
 */
export const generateRef = (kind: keyof typeof REF_PREFIX, now: Date = new Date()): string => {
  const stamp = `${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  let body = '';
  for (let i = 0; i < 6; i += 1) {
    body += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  return `${REF_PREFIX[kind]}-${stamp}-${body}`;
};

/* ------------------------------------------------------------------ *
 * WhatsApp hand-off
 * The checkout does not take payment. It composes a precise, complete
 * message and opens WhatsApp so the admin can confirm and settle it.
 * ------------------------------------------------------------------ */

export const waLink = (phone: string, message: string): string =>
  `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

const nairaLine = (kobo: number) => formatNaira(kobo);

export const buildOrderMessage = (order: Order, settings: Pick<StoreSettings, 'storeName'>): string => {
  const l: string[] = [];
  l.push(`*NEW ORDER — ${settings.storeName}*`);
  l.push(`Ref: ${order.ref}`);
  l.push('');
  l.push('*Items*');
  for (const item of order.items) {
    l.push(`• ${item.nameSnapshot} (${item.skuSnapshot}) × ${item.quantity} — ${nairaLine(item.lineTotalKobo)}`);
  }
  l.push('');
  if (order.discountKobo > 0) l.push(`Discount — -${nairaLine(order.discountKobo)}`);
  if (order.deliveryFeeKobo > 0) l.push(`Delivery — ${nairaLine(order.deliveryFeeKobo)}`);
  l.push(`*Total — ${nairaLine(order.totalKobo)}*`);
  l.push('');
  l.push('*Customer*');
  l.push(`Name: ${order.customerName}`);
  l.push(`Phone: ${order.phone}`);
  if (order.email) l.push(`Email: ${order.email}`);
  l.push(`Fulfilment: ${LABELS.FulfilmentMode[order.fulfilment]}`);
  if (order.address) l.push(`Address: ${[order.address, order.city, order.state].filter(Boolean).join(', ')}`);
  if (order.notes) l.push(`Notes: ${order.notes}`);
  l.push('');
  l.push('Please confirm availability and payment details.');
  return l.join('\n');
};

export const buildBookingMessage = (
  booking: RepairBooking,
  settings: Pick<StoreSettings, 'storeName'>,
): string => {
  const l: string[] = [];
  l.push(`*REPAIR BOOKING — ${settings.storeName}*`);
  l.push(`Ref: ${booking.ref}`);
  l.push('');
  l.push('*Device*');
  l.push(`${LABELS.DeviceCategory[booking.deviceCategory]} — ${booking.deviceBrand} ${booking.deviceModel}`);
  l.push(`Fault: ${LABELS.IssueCategory[booking.issueCategory]}`);
  l.push(`Priority: ${LABELS.Urgency[booking.urgency]}`);
  l.push('');
  l.push('*Reported fault*');
  l.push(booking.issueDescription);
  l.push('');
  l.push('*Service*');
  l.push(`Mode: ${LABELS.ServiceMode[booking.serviceMode]}`);
  if (booking.service) l.push(`Package: ${booking.service.name}`);
  if (booking.preferredDate) {
    l.push(`Preferred: ${booking.preferredDate}${booking.preferredSlot ? ` — ${booking.preferredSlot}` : ''}`);
  }
  if (booking.address) l.push(`Address: ${[booking.address, booking.city, booking.state].filter(Boolean).join(', ')}`);
  l.push('');
  l.push('*Customer*');
  l.push(`Name: ${booking.customerName}`);
  l.push(`Phone: ${booking.phone}`);
  if (booking.email) l.push(`Email: ${booking.email}`);
  l.push('');
  l.push('Please confirm the appointment slot.');
  return l.join('\n');
};

export const buildTitleRequestMessage = (
  req: Pick<TitleRequest, 'titleName' | 'platform' | 'deviceSpecs' | 'customerName' | 'phone' | 'city' | 'notes' | 'ref'>,
  settings: Pick<StoreSettings, 'storeName'>,
): string => {
  const l: string[] = [];
  l.push(`*TITLE SETUP REQUEST — ${settings.storeName}*`);
  l.push(`Ref: ${req.ref}`);
  l.push('');
  l.push(`Title: ${req.titleName}`);
  l.push(`Platform: ${req.platform}`);
  if (req.deviceSpecs) l.push(`My PC: ${req.deviceSpecs}`);
  l.push('');
  l.push(`Name: ${req.customerName}`);
  l.push(`Phone: ${req.phone}`);
  if (req.city) l.push(`City: ${req.city}`);
  if (req.notes) l.push(`Notes: ${req.notes}`);
  l.push('');
  l.push('Please send me a setup quote and the requirements checklist.');
  return l.join('\n');
};

export const buildInquiryMessage = (
  inquiry: Pick<Inquiry, 'name' | 'phone' | 'subject' | 'message' | 'ref'>,
  settings: Pick<StoreSettings, 'storeName'>,
): string => {
  const l: string[] = [];
  l.push(`*ENQUIRY — ${settings.storeName}*`);
  l.push(`Ref: ${inquiry.ref}`);
  l.push('');
  l.push(`Subject: ${inquiry.subject}`);
  l.push(`From: ${inquiry.name} (${inquiry.phone})`);
  l.push('');
  l.push(inquiry.message);
  return l.join('\n');
};

/** Shown on the order page and in admin: a copyable plain-text receipt. */
export const orderToPlainText = (order: Order): string =>
  buildOrderMessage(order, { storeName: 'ARKVOLT' }).replace(/\*/g, '');

/* ------------------------------------------------------------------ *
 * Formatting helpers
 * ------------------------------------------------------------------ */

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

export const relativeTime = (iso: string, now: Date = new Date()): string => {
  const diff = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60_000);
  const rtf = new Intl.RelativeTimeFormat('en-NG', { numeric: 'auto' });
  if (mins < 60) return rtf.format(Math.sign(diff) * mins, 'minute');
  const hours = Math.round(mins / 60);
  if (hours < 24) return rtf.format(Math.sign(diff) * hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(Math.sign(diff) * days, 'day');
  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(Math.sign(diff) * months, 'month');
  return rtf.format(Math.sign(diff) * Math.round(months / 12), 'year');
};

/** `1.4 GB` */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
};

export const truncate = (value: string, max: number): string =>
  value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
