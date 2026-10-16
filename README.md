# ARKVOLT

Software storefront, repair bench booking and back-office for a one-engineer
IT hardware business in Lagos. Customers browse, build a basket and hand off to
WhatsApp to confirm payment; the owner runs everything — catalogue, orders,
bookings, enquiries, settings — from a private dashboard, without touching code.

| | |
| --- | --- |
| **Stack** | Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · Express · PostgreSQL · Prisma · Cloudinary |
| **Money** | Naira only. No gateway: cards are a promise to buy, payment is confirmed on WhatsApp |
| **Deploys to** | Vercel (storefront + dashboard) and Render (API + database) |

---

## What is in here

```
arkvolt/
├── apps/
│   ├── api/                     Express + Prisma service
│   │   ├── prisma/              schema, migrations, seed, titles index
│   │   └── src/
│   │       ├── routes/          public: catalog · orders · frontdesk
│   │       │                    admin:  auth · products · ops · system · media
│   │       ├── lib/             audit log, media, JWT, settings cache, http
│   │       └── middleware/      auth, validation, rate limits
│   └── web/                     Next.js storefront + dashboard
│       └── src/
│           ├── app/             public routes + /admin routes
│           ├── components/      site chrome, catalogue, forms, admin primitives
│           └── lib/             typed API client, cart store, fonts
├── packages/shared/             types, zod schemas, money/date/WhatsApp helpers
└── docs/                        operator guide, deployment, architecture
```

### Routes

**Public** — `/` · `/store` · `/store/[slug]` · `/repairs` · `/repairs/[slug]` ·
`/titles` · `/titles/request` · `/book` · `/cart` · `/checkout` ·
`/order` · `/order/[ref]` · `/contact` · `/about`

**Dashboard** (`noindex`, session required) — `/admin` · `/admin/orders` ·
`/admin/bookings` · `/admin/inquiries` · `/admin/titles` · `/admin/products` ·
`/admin/products/new` · `/admin/products/[id]` · `/admin/services` ·
`/admin/categories` · `/admin/settings` · `/admin/audit`

---

## Running it locally

**Requirements:** Node 20+, PostgreSQL 15+, and npm (workspaces).

```bash
# 1. install everything
npm install

# 2. configure the API
cp apps/api/.env.example apps/api/.env     # then edit DATABASE_URL and JWT_SECRET

# 3. create the schema and load the starting catalogue
npm run db:generate
npm run db:push
npm run db:seed            # 8 categories, 6 services, 6 products, 126 titles, settings, admin

# 4. point the storefront at the API
cp apps/web/.env.local.example apps/web/.env.local

# 5. run both apps
npm run dev                # API on :4000, storefront on :3000
```

Open <http://localhost:3000> for the store and <http://localhost:3000/admin> for
the dashboard. The seeded administrator comes from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` in `apps/api/.env`.

> The storefront never calls the API host directly from the browser. Next's
> rewrite proxies `/api/*` to `ARKVOLT_API_URL`, which keeps the session cookie
> first-party and removes the CORS preflight from every request — in production
> too.

---

## How the business works

1. **The basket is an intent, not a payment.** Checkout re-reads every price and
   stock level server-side, writes an order with a reference like
   `AV-2610-KM4TR9`, and renders a WhatsApp button with the whole order already
   written out — reference, lines, total, delivery.
2. **The owner confirms on WhatsApp.** Money changes hands there. The dashboard
   records the outcome: status, payment status, delivery fee, internal notes.
3. **Software is delivered manually.** There is no download library, no licence
   key store. Delivery is a person sending a person their files and settings.
4. **Repair work is quoted, not sold.** Services carry a "from" price; the real
   number is agreed after the machine has been seen. Bookings capture the
   machine, the fault, the urgency and the preferred slot.
5. **Titles are a reference, not a shop.** The 126-title index exists so a
   customer can point at what they want and receive a labour quote. Nothing
   about it is a claim of licensing — the storefront says so on `/titles` and
   `/about`.

---

## Security posture

- Single administrator, bcrypt cost 12, JWT HS256 in an `httpOnly`, `SameSite=Lax`
  cookie, twelve-hour sessions, rotating login audit entries including failures.
- Admin writes require the `Origin` header to match an allow-list, on top of the
  session cookie — so a stolen cookie is not enough for a cross-site write.
- Public endpoints are rate-limited: 12 checkouts and 20 front-desk submissions
  per hour per address, 240 requests/minute for the dashboard.
- Checkout is idempotent per key, re-prices every line from the database, and
  decrements stock inside a transaction with a `stock >= quantity` guard, so two
  buyers cannot take the last unit.
- Everything that changes state writes an append-only audit row: actor, IP,
  user agent, field-level diff. There is no endpoint that edits or deletes one.

---

## Documentation

| Document | For |
| --- | --- |
| [`docs/ADMIN-GUIDE.md`](docs/ADMIN-GUIDE.md) | The owner. Day-to-day operation, written without jargon |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Vercel + Render + Cloudinary, and the go-live checklist |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Data model, API surface, money handling, design system |

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | API and storefront together |
| `npm run build` | Shared types → API → storefront, in order |
| `npm run typecheck` | `tsc --noEmit` across all three workspaces |
| `npm run db:seed` | Idempotent catalogue + settings + administrator |
| `npm run db:studio` | Prisma Studio against your database |
| `npm run setup` | install → generate → push → seed, from nothing |
