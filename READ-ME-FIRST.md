# ARKVOLT — WEBSITE, API & DASHBOARD

Snapshot taken 16 October 2026

---

## WHAT THIS IS

A production software storefront, repair-booking site and back-office for
ARKVOLT — software supply and hardware repair, Lagos. Customers browse, build a
basket and hand off to WhatsApp to confirm payment. The owner runs the
catalogue, orders, bookings, enquiries and settings from a private dashboard,
without touching code.

Stack: Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion, Express,
PostgreSQL, Prisma, Cloudinary. Deploys to Vercel (frontend) and Render (API and
database).

---

## WHAT IS IN THE ARCHIVE

ARKVOLT-project-2026-10-16.zip   (1.77 MB, 183 files)

```
  apps/web/             Next.js storefront and admin dashboard
  apps/api/             Express API, Prisma schema, seed, 126-title index
  packages/shared/      Types, zod schemas and helpers shared by both apps
  docs/                 Operator guide, deployment guide, architecture notes
  README.md             Project overview and commands
  render.yaml           Render blueprint (API and Postgres)
  apps/web/vercel.json  Vercel build configuration
  package.json          npm workspaces root
```

Left out on purpose: node_modules, .next and dist (all rebuildable), plus every
.env file — no credentials are in the archive, only the .env.example templates.

---

## RUNNING IT LOCALLY

Requires Node 20+ and PostgreSQL 15+.

```bash
npm install
cp apps/api/.env.example apps/api/.env     # then set DATABASE_URL and JWT_SECRET
npm run db:generate
npm run db:push
npm run db:seed                            # 8 categories, 6 services,
                                           # 6 products, 126 titles, settings
cp apps/web/.env.local.example apps/web/.env.local
npm run dev                                # API on :4000, site on :3000
```

```
  Store:      http://localhost:3000
  Dashboard:  http://localhost:3000/admin
```

The seeded administrator comes from ADMIN_EMAIL and ADMIN_PASSWORD in
apps/api/.env.

---

## DEPLOYING IT

1. **Render** — New > Blueprint, point at the repository. render.yaml creates
   the Postgres database and the API service.
2. **Vercel** — import the same repository, set Root Directory to apps/web, and
   set ARKVOLT_API_URL to your Render URL.
3. **Cloudinary** — add the cloud name, API key and secret on Render. Without
   them the API refuses uploads in production rather than writing to the
   filesystem Render wipes on every deploy.

**IMPORTANT, and the one that bites:** set CORS_ORIGINS on Render to your exact
Vercel domain, for example https://arkvolt.ng — no trailing slash. The browser
only ever talks to the Vercel domain, and Vercel proxies /api/* through to
Render, so the origin arriving at the API is never the Render one. Admin saves
are rejected without it.

Full detail, including the go-live checklist and a troubleshooting table, is in
the [Deployment Guide](docs/DEPLOYMENT.md).

---

## WHAT WAS VERIFIED BEFORE THIS SNAPSHOT

- All 13 public routes and all 12 dashboard routes render with real seeded
  data; a nonexistent path returns 404.
- Production build passes lint and type checks across all three workspaces
  (26 routes, 87 kB shared JavaScript).
- End-to-end suite passes: checkout with server-side re-pricing and stock
  guards, repair booking, enquiry, title request, admin sign-in, status
  changes, CSV exports and the audit log.
- Zero gradient styling anywhere, by design.

---

## WHERE TO READ MORE

| Document | What it covers |
| --- | --- |
| [Admin Guide](docs/ADMIN-GUIDE.md) | Day-to-day operation, written for the business owner |
| [Deployment Guide](docs/DEPLOYMENT.md) | Vercel, Render, Cloudinary, go-live checklist |
| [Architecture Notes](docs/ARCHITECTURE.md) | Data model, API surface, money handling, known limits |
| [README](README.md) | Project overview, routes, scripts |
