import type {
  ApiError,
  ApiListResponse,
  BookingInput,
  CartLine,
  Category,
  CheckoutInput,
  DashboardStats,
  Inquiry,
  InquiryInput,
  Order,
  Product,
  ProductKind,
  ProductListQuery,
  ProductSort,
  RepairBooking,
  Service,
  ApiMeta,
  StoreSettings,
  TitleEntry,
  TitleRequest,
  TitleRequestInput,
} from '@arkvolt/shared';

/* ------------------------------------------------------------------ *
 * Transport
 *
 * Every call goes through `request`. Three jobs in one place: unwrap the
 * { data } envelope, turn an error payload into a typed ApiError subclass
 * with field-level detail the forms can render, and attach the session
 * cookie for admin calls.
 * ------------------------------------------------------------------ */

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, string[]>;

  constructor(status: number, payload: ApiError | null, fallback: string) {
    super(payload?.error?.message ?? fallback);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = payload?.error?.code ?? 'UNKNOWN';
    this.details = payload?.error?.details ?? {};
  }

  /** First message for a given field, for inline form errors. */
  field(name: string): string | undefined {
    return this.details[name]?.[0];
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  /** Next fetch caching. Default: no-store, because stock and status change. */
  revalidate?: number | false;
  tags?: string[];
  signal?: AbortSignal;
}

/**
 * Two different worlds, one client.
 *
 * In the browser, requests go to a relative `/api/...` on the page's own
 * origin, which Next rewrites to the Express service. That keeps the session
 * cookie first-party and avoids a CORS preflight on every call.
 *
 * On the server, `fetch` requires an absolute URL — the rewrites do not apply
 * to outbound requests made during rendering. Those calls go straight to the
 * API origin, which also skips a pointless proxy hop.
 */
const baseUrl = (): string => {
  if (typeof window !== 'undefined') return '';
  return (
    process.env.ARKVOLT_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://127.0.0.1:4000'
  ).replace(/\/$/, '');
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, revalidate = false, tags, signal } = options;
  const url = `${baseUrl()}${path}`;

  /**
   * Server-side reads happen inside `next build` and ISR renders. A socket that
   * never answers would hang the build; ten seconds is far longer than a warm
   * API takes and short enough that a cold one fails fast and visibly.
   * Browser calls are left alone — an operator waiting on a cold Render
   * instance should not be cut off.
   */
  const effectiveSignal =
    signal ?? (typeof window === 'undefined' ? AbortSignal.timeout(10_000) : undefined);

  const init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    signal: effectiveSignal,
  };

  if (typeof window === 'undefined') {
    init.next = revalidate === false ? { revalidate: 0 } : { revalidate, tags };
  }

  const res = await fetch(url, init);

  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    throw new ApiRequestError(res.status, payload as ApiError | null, `Request failed (${res.status})`);
  }

  // List endpoints return { data, meta }; single-resource endpoints return { data }.
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

/* ------------------------------------------------------------------ *
 * Resilience for public reads
 *
 * These run during static generation and background revalidation. If the API
 * is unreachable at that exact moment — a cold instance, a restart mid-deploy
 * — a thrown transport error fails the whole build, or 500s the page. For a
 * shopfront, a slightly stale section beats a dead page.
 *
 * Only *transport* failures fall back. An HTTP error from the API is a bug and
 * is still thrown, so real breakage stays visible instead of hiding behind an
 * empty store.
 * ------------------------------------------------------------------ */

export const FALLBACK_SETTINGS: StoreSettings = {
  storeName: 'ARKVOLT',
  tagline: 'Software supply and hardware repair.',
  whatsappNumber: '2349030438653',
  supportPhone: '',
  supportEmail: '',
  workshopAddress: 'Computer Village, Ikeja, Lagos',
  workshopHours: 'Monday to Saturday, 9am – 6pm',
  announcement: null,
  announcementEnabled: false,
  bankDetails: null,
  deliveryFeeKobo: 350_000,
  freeDeliveryThresholdKobo: 15_000_000,
  currency: 'NGN',
  socials: [{ label: 'WhatsApp', href: 'https://wa.me/2349030438653' }],
};

const EMPTY_META: ApiMeta = { page: 1, perPage: 0, total: 0, totalPages: 1 };

const isTransportFailure = (err: unknown): boolean => {
  if (err instanceof ApiRequestError) return false;
  const name = (err as { name?: string } | null)?.name;
  return name === 'AbortError' || name === 'TimeoutError' || err instanceof TypeError;
};

const resilient = async <T>(promise: Promise<T>, fallback: T, label: string): Promise<T> => {
  try {
    return await promise;
  } catch (err) {
    if (!isTransportFailure(err)) throw err;
    console.warn(
      `[arkvolt] ${label}: API unreachable (${(err as Error)?.message ?? 'fetch failed'}). Rendering without it.`,
    );
    return fallback;
  }
};

const qs = (params: Record<string, string | number | boolean | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== false) search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : '';
};

/* ------------------------------------------------------------------ *
 * Public endpoints
 * ------------------------------------------------------------------ */

export const api = {
  async settings(): Promise<StoreSettings> {
    return resilient(
      request<StoreSettings>('/api/settings', { revalidate: 60, tags: ['settings'] }),
      FALLBACK_SETTINGS,
      'settings',
    );
  },

  async categories(): Promise<Category[]> {
    return resilient(
      request<Category[]>('/api/catalog/categories', { revalidate: 120, tags: ['catalog'] }),
      [],
      'categories',
    );
  },

  async products(query: ProductListQuery = {}): Promise<{ items: Product[]; meta: ApiListResponse<Product>['meta'] }> {
    const path = `/api/catalog/products${qs({
      q: query.q,
      category: query.category,
      kind: query.kind,
      sort: query.sort,
      page: query.page,
      perPage: query.perPage,
      featured: query.featured,
      inStock: query.inStock,
    })}`;
    const load = async () => {
      const res = await fetch(`${baseUrl()}${path}`, {
        credentials: 'include',
        next: { revalidate: 60, tags: ['catalog'] },
        signal: typeof window === 'undefined' ? AbortSignal.timeout(10_000) : undefined,
      });
      if (!res.ok) throw new ApiRequestError(res.status, (await res.json().catch(() => null)) as ApiError | null, 'Could not load products');
      const payload = (await res.json()) as ApiListResponse<Product>;
      return { items: payload.data, meta: payload.meta };
    };
    return resilient(load(), { items: [] as Product[], meta: EMPTY_META }, 'products');
  },

  async product(slug: string): Promise<Product> {
    return request<Product>(`/api/catalog/products/${encodeURIComponent(slug)}`, {
      revalidate: 60,
      tags: ['catalog', `product:${slug}`],
    });
  },

  async relatedProducts(slug: string): Promise<Product[]> {
    return resilient(
      request<Product[]>(`/api/catalog/products/${encodeURIComponent(slug)}/related`, { revalidate: 60 }),
      [],
      'related products',
    );
  },

  async services(): Promise<Service[]> {
    return resilient(
      request<Service[]>('/api/catalog/services', { revalidate: 120, tags: ['services'] }),
      [],
      'services',
    );
  },

  async service(slug: string): Promise<Service> {
    return request<Service>(`/api/catalog/services/${encodeURIComponent(slug)}`, {
      revalidate: 120,
      tags: ['services', `service:${slug}`],
    });
  },

  async titles(params: { q?: string; genre?: string; page?: number; perPage?: number } = {}): Promise<{
    items: TitleEntry[];
    meta: ApiListResponse<TitleEntry>['meta'];
  }> {
    const path = `/api/catalog/titles${qs({ ...params })}`;
    const load = async () => {
      const res = await fetch(`${baseUrl()}${path}`, {
        next: { revalidate: 300, tags: ['titles'] },
        signal: typeof window === 'undefined' ? AbortSignal.timeout(10_000) : undefined,
      });
      if (!res.ok) throw new ApiRequestError(res.status, null, 'Could not load titles');
      const payload = (await res.json()) as ApiListResponse<TitleEntry>;
      return { items: payload.data, meta: payload.meta };
    };
    return resilient(load(), { items: [] as TitleEntry[], meta: EMPTY_META }, 'titles');
  },

  async titleSeries(): Promise<{ series: string; count: number }[]> {
    return resilient(
      request<{ series: string; count: number }[]>('/api/catalog/titles/series', { revalidate: 300 }),
      [],
      'title series',
    );
  },

  async submitCheckout(input: CheckoutInput): Promise<{ order: Order; whatsappUrl: string; duplicate: boolean }> {
    return request('/api/orders', { method: 'POST', body: input });
  },

  async validateCart(
    items: { productId: string; quantity: number }[],
  ): Promise<{ lines: unknown[]; subtotalKobo: number }> {
    return request('/api/orders/validate-cart', { method: 'POST', body: { items } });
  },

  async lookupOrder(ref: string): Promise<{ order: Order; whatsappUrl: string } | null> {
    return request<{ order: Order; whatsappUrl: string } | null>(`/api/orders/${encodeURIComponent(ref)}`);
  },

  async submitBooking(input: BookingInput): Promise<{ booking: RepairBooking; whatsappUrl: string }> {
    return request('/api/bookings', { method: 'POST', body: input });
  },

  async submitInquiry(input: InquiryInput): Promise<{ inquiry: Inquiry; whatsappUrl: string }> {
    return request('/api/inquiries', { method: 'POST', body: input });
  },

  async submitTitleRequest(input: TitleRequestInput): Promise<{ request: TitleRequest; whatsappUrl: string }> {
    return request('/api/title-requests', { method: 'POST', body: input });
  },
};

/* ------------------------------------------------------------------ *
 * Admin endpoints
 * ------------------------------------------------------------------ */

export interface AdminUserSummary {
  id: string;
  email: string;
  name: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuditEntryDto {
  id: string;
  actorEmail: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  diff: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface Paged<T> {
  items: T[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
}

const paged = async <T>(path: string): Promise<Paged<T>> => {
  const res = await fetch(`${baseUrl()}${path}`, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) throw new ApiRequestError(res.status, (await res.json().catch(() => null)) as ApiError | null, 'Request failed');
  const payload = (await res.json()) as ApiListResponse<T>;
  return { items: payload.data, meta: payload.meta };
};

export const adminApi = {
  async login(email: string, password: string): Promise<{ user: AdminUserSummary }> {
    return request('/api/admin/auth/login', { method: 'POST', body: { email, password } });
  },

  async logout(): Promise<void> {
    await request('/api/admin/auth/logout', { method: 'POST' });
  },

  async me(): Promise<AdminUserSummary> {
    return request('/api/admin/auth/me');
  },

  /** First-run only: creates the administrator from ADMIN_EMAIL / ADMIN_PASSWORD. */
  async bootstrap(): Promise<{ user: AdminUserSummary }> {
    return request('/api/admin/auth/bootstrap', { method: 'POST' });
  },

  async changePassword(input: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<void> {
    await request('/api/admin/auth/change-password', { method: 'POST', body: input });
  },

  stats: () => request<DashboardStats & { lowStock: { id: string; name: string; sku: string; stock: number }[] }>('/api/admin/stats'),

  products: (params: { q?: string; status?: string; kind?: string; category?: string; page?: number; perPage?: number; sort?: ProductSort } = {}) =>
    paged<Product>(`/api/admin/products${qs({ ...params })}`),

  product: (id: string) => request<Product>(`/api/admin/products/${id}`),

  createProduct: (body: unknown) => request<Product>('/api/admin/products', { method: 'POST', body }),

  updateProduct: (id: string, body: unknown) => request<Product>(`/api/admin/products/${id}`, { method: 'PATCH', body }),

  publishProduct: (id: string) => request<Product>(`/api/admin/products/${id}/publish`, { method: 'POST' }),

  adjustStock: (id: string, body: { delta?: number; absolute?: number }) =>
    request<Product>(`/api/admin/products/${id}/stock`, { method: 'POST', body }),

  deleteProduct: (id: string) => request<{ ok: boolean; archived: boolean }>(`/api/admin/products/${id}`, { method: 'DELETE' }),

  categories: () => request<Category[]>('/api/admin/categories'),
  createCategory: (body: unknown) => request<Category>('/api/admin/categories', { method: 'POST', body }),
  updateCategory: (id: string, body: unknown) => request<Category>(`/api/admin/categories/${id}`, { method: 'PATCH', body }),
  deleteCategory: (id: string) => request<{ ok: boolean }>(`/api/admin/categories/${id}`, { method: 'DELETE' }),

  services: () => request<Service[]>('/api/admin/services'),
  createService: (body: unknown) => request<Service>('/api/admin/services', { method: 'POST', body }),
  updateService: (id: string, body: unknown) => request<Service>(`/api/admin/services/${id}`, { method: 'PATCH', body }),
  deleteService: (id: string) => request<{ ok: boolean; archived: boolean }>(`/api/admin/services/${id}`, { method: 'DELETE' }),

  orders: (params: { q?: string; status?: string; paymentStatus?: string; page?: number; perPage?: number } = {}) =>
    paged<Order>(`/api/admin/orders${qs({ ...params })}`),
  order: (id: string) => request<{ order: Order; whatsappUrl: string }>(`/api/admin/orders/${id}`),
  updateOrder: (id: string, body: unknown) => request<Order>(`/api/admin/orders/${id}`, { method: 'PATCH', body }),
  markWhatsappSent: (id: string) => request<Order>(`/api/admin/orders/${id}/whatsapp-sent`, { method: 'POST' }),

  bookings: (params: { q?: string; status?: string; page?: number } = {}) =>
    paged<RepairBooking>(`/api/admin/bookings${qs({ ...params })}`),
  booking: (id: string) => request<{ booking: RepairBooking; whatsappUrl: string }>(`/api/admin/bookings/${id}`),
  updateBooking: (id: string, body: unknown) => request<RepairBooking>(`/api/admin/bookings/${id}`, { method: 'PATCH', body }),

  inquiries: (params: { q?: string; status?: string; page?: number } = {}) =>
    paged<Inquiry>(`/api/admin/inquiries${qs({ ...params })}`),
  updateInquiry: (id: string, body: unknown) => request<Inquiry>(`/api/admin/inquiries/${id}`, { method: 'PATCH', body }),

  titleRequests: (params: { q?: string; status?: string; page?: number } = {}) =>
    paged<TitleRequest>(`/api/admin/title-requests${qs({ ...params })}`),
  updateTitleRequest: (id: string, body: unknown) => request<TitleRequest>(`/api/admin/title-requests/${id}`, { method: 'PATCH', body }),

  titles: (params: { q?: string; genre?: string; page?: number; perPage?: number } = {}) =>
    paged<TitleEntry & { id: string }>(`/api/admin/titles${qs({ ...params })}`),
  updateTitle: (id: string, body: unknown) => request<TitleEntry>(`/api/admin/titles/${id}`, { method: 'PATCH', body }),

  settings: () => request<StoreSettings>('/api/admin/settings'),
  saveSettings: (body: unknown) => request<StoreSettings>('/api/admin/settings', { method: 'PUT', body }),

  audit: (params: { q?: string; entity?: string; action?: string; page?: number; perPage?: number } = {}) =>
    paged<AuditEntryDto>(`/api/admin/audit${qs({ ...params })}`),
  auditEntities: () => request<{ entity: string; count: number }[]>('/api/admin/audit/entities'),

  upload: async (file: File, folder = 'products'): Promise<{ url: string; publicId: string; width?: number; height?: number }> => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    const res = await fetch(`${baseUrl()}/api/admin/media`, { method: 'POST', body: form, credentials: 'include' });
    if (!res.ok) throw new ApiRequestError(res.status, (await res.json().catch(() => null)) as ApiError | null, 'Upload failed');
    return ((await res.json()) as { data: { url: string; publicId: string; width?: number; height?: number } }).data;
  },

  deleteMedia: (publicId: string) =>
    request<{ ok: boolean }>(`/api/admin/media?publicId=${encodeURIComponent(publicId)}`, { method: 'DELETE' }),
};

/* ------------------------------------------------------------------ *
 * Cart helpers shared by the cart and checkout pages
 * ------------------------------------------------------------------ */

export const toCartLines = (
  products: { id: string; slug: string; name: string; sku: string; priceKobo: number; images: { url: string }[]; stock: number; trackStock: boolean; kind: ProductKind }[],
  quantities: Record<string, number>,
): CartLine[] =>
  products
    .filter((p) => (quantities[p.id] ?? 0) > 0)
    .map((p) => ({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      unitPriceKobo: p.priceKobo,
      quantity: quantities[p.id] ?? 1,
      imageUrl: p.images[0]?.url ?? null,
      stock: p.stock,
      trackStock: p.trackStock,
      kind: p.kind,
    }));
