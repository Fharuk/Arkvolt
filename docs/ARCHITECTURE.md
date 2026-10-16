# ARKVOLT — Architecture

How the system is put together, and why. Written for whoever maintains this
next: the decisions here are deliberate, and most of them exist to prevent a
specific failure.

---

## 1. Shape of the system

```
        Browser
           │  same origin: https://arkvolt.ng
           ▼
  ┌──────────────────────────┐
  │  Vercel — Next.js 14     │   server components read the API directly
  │  storefront + /admin     │   client components fetch relative /api/*
  └───────────┬──────────────┘
              │  rewrites /api/* and /uploads/* → ARKVOLT_API_URL
              ▼
  ┌──────────────────────────┐
  │  Render — Express API    │   stateless, session in an httpOnly cookie
  └───────────┬──────────────┘
              │  Prisma
              ▼
  ┌──────────────┐     ┌──────────────┐
  │  PostgreSQL  │     │  Cloudinary  │  images, transformations at the edge
  └──────────────┘     └──────────────┘
```

**Why the proxy, not direct calls to the API host.** The session cookie stays
first-party, so `SameSite=Lax` is enough and there is no CORS preflight on every
request. It also means the browser never needs to know where the API lives — one
environment variable on the frontend moves the whole backend.

**Why Express on Render and not serverless.** Prisma needs a persistent
connection pool; a busy Next deployment would open one pool per lambda and
exhaust Postgres. A single long-lived process also keeps rate limiting and the
in-memory settings cache meaningful.

---

## 2. Money

- **Everything is stored in kobo** (integer, `Int`), never in floats. Naira
  appears only at the edges: the admin form types naira and the API converts
  (`nairaToKobo`), the storefront formats with `formatNaira`.
- **Prices are never trusted from the client.** Checkout sends product ids and
  quantities only; the server re-reads price, stock and status, and computes the
  subtotal itself.
- **No card data exists anywhere.** There is no gateway. Checkout writes an order
  and hands the customer to WhatsApp; the dashboard records what a human
  confirmed.
- Delivery is `subtotal + deliveryFee − discount`, recomputed on every order
  patch so a manual edit cannot leave a stale total behind.

---

## 3. Data model

Twelve models; the ones that carry decisions:

| Model | Notes |
| --- | --- |
| `AdminUser` | One row in normal use. `lastLoginAt` is shown in the dashboard. |
| `Product` | Unified across software, hardware and parts via `kind`. JSON columns for `specs`, `requirements`, `installSteps`, `included`, `images`. |
| `Service` | Repair work. Separate table, not a `Product`, because a service has `durationMins`, `turnaround`, `process`, `faqs` and is booked rather than shipped. |
| `TitleEntry` | The game reference index: name, slug, series, genre, platforms. No URLs, no files, no licence claims. |
| `Order` / `OrderItem` | Line items snapshot name, SKU and unit price at purchase, so renaming a product never rewrites history. |
| `RepairBooking` | Machine, fault, urgency, preferred slot, plus the operator's `estimatedFeeKobo`. |
| `Inquiry` | Contact-form messages, with a source so the form they came from is known. |
| `TitleRequest` | A customer asking for a title to be set up. |
| `AuditLog` | Append-only. See §6. |
| `Setting` | Key/value storefront configuration, read through a 15-second cache. |

Deliberate choices worth not undoing:

- **JSON columns for structured lists.** Specs, requirements and steps are
  displayed as entered and never queried individually, so normalising them would
  add five tables and buy nothing.
- **Archiving instead of cascade deletes.** Deleting a product that appears on an
  order sets it to `ARCHIVED` and leaves the order intact. The same applies to
  services with bookings. The API returns `{ ok, archived }` so the dashboard can
  say what actually happened.
- **References are human-readable**: `AV-YYMM-XXXXXX` for orders, `AVR-` bookings,
  `AVQ-` enquiries, `AVT-` title requests. The alphabet excludes `B/8`, `I/1`,
  `O/0`, `S/5`, `Z/2` so a reference cannot be misread over the phone.

---

## 4. API surface

Public, rate-limited by route group:

```
GET  /health
GET  /api/catalog/products      /api/catalog/products/:slug
GET  /api/catalog/services      /api/catalog/services/:slug
GET  /api/catalog/categories    /api/catalog/titles
GET  /api/settings
POST /api/orders                       (12/hour, idempotent)
GET  /api/orders/:ref                  (public view, internal notes stripped)
POST /api/bookings                     (20/hour)
POST /api/inquiries
POST /api/title-requests
```

Admin, all behind `requireAuth` + `requireSameOrigin`, 240 requests/minute:

```
POST   /api/admin/auth/login | logout | bootstrap | change-password
GET    /api/admin/auth/me

GET    /api/admin/categories            POST/PATCH/DELETE  …/categories[/:id]
GET    /api/admin/products              POST/PATCH/DELETE  …/products[/:id]
POST   /api/admin/products/:id/publish
POST   /api/admin/products/:id/stock    { delta } | { absolute }
GET    /api/admin/services              POST/PATCH/DELETE  …/services[/:id]

GET    /api/admin/orders                GET/PATCH /api/admin/orders/:id
POST   /api/admin/orders/:id/whatsapp-sent
GET    /api/admin/bookings              GET/PATCH /api/admin/bookings/:id
GET    /api/admin/inquiries             PATCH     /api/admin/inquiries/:id
GET    /api/admin/title-requests        PATCH     /api/admin/title-requests/:id
GET    /api/admin/titles                PATCH     /api/admin/titles/:id

GET/PUT /api/admin/settings
GET    /api/admin/stats
GET    /api/admin/audit  /audit/entities  /audit/export
GET    /api/admin/export/orders.csv
POST   /api/admin/media                 DELETE /api/admin/media?publicId=
```

Conventions:

- `{ data, meta? }` on success, `{ error: { code, message, details? } }` on
  failure. `details` is field-keyed and feeds the forms directly.
- List endpoints accept `q`, filters, `page`, `perPage` and return
  `meta: { page, perPage, total, totalPages }`. **Display counts come from
  `meta.total`, never from the length of a capped array.**
- Status changes are recorded as `STATUS_CHANGE` with the from/to diff, so the
  activity log distinguishes "edited the copy" from "marked it paid".

Validation is zod, defined once in `packages/shared`, and reused by the API
middleware, the public forms and the dashboard editors. One schema, one error
format, everywhere.

---

## 5. Frontend

- **Server components fetch the API directly** using an absolute base
  (`ARKVOLT_API_URL`); relative URLs are invalid in server-side `fetch`, which is
  why `lib/api.ts` routes everything through `baseUrl()`.
- **Client components fetch relative `/api/*`**, which the browser sends to the
  Next origin and the rewrite proxies onward.
- **Search-param filtering on the store page uses explicit casts, not zod** —
  parsing an untrusted URL with a mutation schema would reject legitimate
  combinations and is the wrong tool.
- **Cart state lives in `localStorage`** (`arkvolt.cart.v1`) with a context and
  reducer, hydrated after mount to avoid a hydration mismatch, and synced across
  tabs. Prices in it are display-only.
- **The dashboard uses drawers, not routes, for record detail.** Closing a drawer
  returns to the same queue position, same filters, same page — which is what an
  operator processing twenty orders actually needs.
- Route-level metadata, JSON-LD and breadcrumbs on every public detail page.
- **Public reads degrade instead of failing.** Every aggregate read — settings,
  categories, product and service lists, titles — falls back to an empty or
  default value when the API is *unreachable*, and logs a warning. This matters
  most at build time: without it, a Vercel build that coincides with a Render
  restart or a cold instance fails outright, and the shop cannot be deployed for
  a reason that has nothing to do with the change. Only transport failures fall
  back; an HTTP 4xx/5xx from the API is still thrown, so real breakage stays
  visible instead of hiding behind an empty catalogue.

### Design system

Deliberately industrial, not "SaaS-modern": no gradients anywhere, no
glassmorphism, no rounded icon tiles, no emoji, no three-column filler.

| Token | Value |
| --- | --- |
| Surfaces | `#08090B` → `#0D0E12` → `#14161B`, hairline `#1E2128` |
| Accent | volt cyan `#00D4FF`, on under 3% of pixels |
| Type | Barlow Condensed 600/700 uppercase display, DM Sans body, JetBrains Mono for SKUs, specs, prices, status |
| Status colour | amber / crimson / jade — semantic only, never decorative |
| Motifs | `+` grid-field, bracket corners, `index-num`, `Fig. NN` captions, `spec-table`, hairline rules |

Fonts are self-hosted (18 woff2 files, `next/font/local`) — no third-party
request on first paint. Photography is a real workshop; if a photo is not
credible as ARKVOLT's own bench, it does not go on the site.

---

## 6. Security and the audit log

- bcrypt cost 12; dummy-hash comparison on unknown emails so response time
  cannot be used to enumerate administrators.
- JWT HS256, `httpOnly` + `SameSite=Lax` + `Secure` in production, twelve hours.
- `requireSameOrigin` rejects cross-site writes even with a valid cookie: the
  `Origin` header must match the host or appear in `CORS_ORIGINS`. **This is the
  variable that breaks a misconfigured production deploy** — the browser's origin
  is the Vercel domain, never the Render one.
- Public writes are rate-limited per address; checkout is idempotent per key;
  stock is decremented with a `stock >= quantity` guard inside a transaction.
- Helmet, compression, `trust proxy` for real client IPs behind Render's proxy.

**Audit log.** Every state change writes one row: actor id/email/name, action,
entity, entity id, a human summary, a field-level diff, IP, user agent, and a
timestamp. `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `EXPORT` and `PASSWORD_CHANGE` are
recorded alongside catalogue edits. There is no update or delete endpoint for
audit rows — the API simply does not expose one. CSV exports write their own
`EXPORT` entry before streaming, so even reading the data is attributable.

---

## 7. Known limits

Honest notes for the next engineer:

- **Single administrator.** The schema supports more accounts and the audit log
  distinguishes them, but there is no invitation flow — a second account is
  created directly in the database.
- **Software delivery is manual and has no artefact trail.** The dashboard
  records that an order was completed, not what was sent.
- **Email is not sent by the system.** Replies are `wa.me` and `mailto:` links
  opened by the operator. Adding a provider means adding one module in
  `apps/api/src/lib` and a template per event.
- **`prisma db push` in the Render build** is convenient but has no history.
  Switch to `prisma migrate deploy` once the schema is frozen (`docs/DEPLOYMENT.md` §5).
- **Local uploads exist for development only.** In production, missing Cloudinary
  credentials are a hard error rather than a silent write to a filesystem that
  Render will wipe on the next deploy.
