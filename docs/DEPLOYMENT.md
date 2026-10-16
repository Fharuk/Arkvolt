# Deploying ARKVOLT

Three moving parts, three providers:

| Piece | Where | Cost |
| --- | --- | --- |
| Storefront + dashboard (`apps/web`) | **Vercel** | Free tier is fine |
| API (`apps/api`) | **Render** web service | Starter (~$7/mo) recommended |
| PostgreSQL | **Render** managed Postgres | Free tier works, expires after 30 days |
| Images | **Cloudinary** | Free tier: 25 GB storage / 25 GB bandwidth |

> Do not put the API on Vercel with the frontend. The API needs a long-lived
> Node process and a persistent database connection; serverless functions give
> you neither, and Prisma will exhaust the connection pool.

---

## 1. Database + API on Render

The blueprint in `render.yaml` creates both the database and the web service.

1. Push this repository to GitHub.
2. Render dashboard → **New → Blueprint** → pick the repository.
3. Render reads `render.yaml` and asks for the values marked `sync: false`:

   | Variable | Value |
   | --- | --- |
   | `CORS_ORIGINS` | Your Vercel URL, e.g. `https://arkvolt.vercel.app` — **no trailing slash** |
   | `ADMIN_EMAIL` | The address you will sign in with |
   | `ADMIN_PASSWORD` | At least 12 characters. Used once, to create the account |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard |

   `JWT_SECRET`, `DATABASE_URL` and `WHATSAPP_NUMBER` are filled in automatically.

4. Deploy. The build runs `prisma db push`, so the schema lands on the first
   deploy. Watch the logs for `ARKVOLT API listening`.

### ⚠️ `CORS_ORIGINS` is the one that bites

The browser only ever talks to your Vercel domain. Vercel proxies `/api/*` and
`/uploads/*` through to Render, so **the origin header arriving at the API is
the Vercel URL, not the Render URL**. Admin writes are rejected unless that
origin is on the allow-list. If a save in the dashboard fails with
"Request blocked: origin not allowed", this is why.

Add every domain the site is served from, comma-separated — including the
`www` variant and any preview domain you actually use:

```
CORS_ORIGINS=https://arkvolt.ng,https://www.arkvolt.ng,https://arkvolt.vercel.app
```

### Seed the catalogue (optional, once)

A fresh database is empty. To get the starting catalogue — categories, services,
products, the titles index and the settings row — open the Render **Shell** for
the API service and run:

```bash
npm run db:seed --workspace @arkvolt/api
```

The seed is idempotent and safe to re-run; it creates nothing that already
exists, and it never overwrites your edits. If you would rather start with a
blank catalogue, skip this and add your own from the dashboard.

---

## 2. Storefront on Vercel

1. Vercel → **Add New → Project** → import the same repository.
2. **Root Directory: `apps/web`.** Leave "Include files outside the root
   directory" enabled — the app depends on the `packages/shared` workspace.
3. Framework preset: **Next.js** (with `apps/web/vercel.json`, this is set
   already). Build and install commands come from that file.
4. Environment variables — one is required:

   | Name | Value | Environment |
   | --- | --- | --- |
   | `ARKVOLT_API_URL` | `https://arkvolt-api.onrender.com` (your Render URL) | Production, Preview |

   Add it to **both** Production and Preview, then redeploy. Next bakes the
   rewrite target in at build time, so a value added after a build needs a new
   build to take effect.

5. Deploy, then set `CORS_ORIGINS` on Render to the Vercel URL and let Render
   restart.

### First sign-in

Open `https://<your-domain>/admin`. If no administrator exists yet, expand
**First deployment?** on the sign-in screen, press **Create the first
administrator**, and sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set
on Render. Change the password from the dashboard immediately afterwards. That
endpoint permanently closes once an account exists.

---

## 3. Cloudinary

1. Create a free account, then copy the cloud name, API key and API secret from
   the dashboard home into Render's environment.
2. Leave `CLOUDINARY_FOLDER=arkvolt`; uploads land in
   `arkvolt/products`, `arkvolt/services`, and so on.

Without these three variables the API **refuses** uploads in production rather
than writing to disk. Render wipes the filesystem on every deploy, so a locally
saved image would silently disappear days later.

---

## 4. Custom domain

1. Vercel → Project → **Domains** → add `arkvolt.ng`, follow the DNS
   instructions (`A` / `CNAME`).
2. Add the final domain to `CORS_ORIGINS` on Render, comma-separated with the
   others, and restart.
3. Optional but recommended: put the API on a subdomain of your own —
   `api.arkvolt.ng` → CNAME to `arkvolt-api.onrender.com` — so the storefront's
   environment variable does not depend on a Render-generated hostname.

---

## 5. Deploys after the first

Push to `main`. Render rebuilds the API, Vercel rebuilds the storefront. Render's
build runs `prisma db push`, so schema changes ship with the code.

When the schema settles, switch to real migrations:

```bash
# locally, once
npm run db:migrate -w @arkvolt/api      # creates prisma/migrations/
git add apps/api/prisma/migrations && git commit -m "Add migrations"
```

then change the Render build command's last step from `db:push` to
`db:deploy` (`prisma migrate deploy`). Migrations are reviewed and versioned;
`db push` is not.

---

## 6. Go-live checklist

- [ ] `JWT_SECRET` is long, random, and not the development value.
- [ ] `ADMIN_PASSWORD` is at least 12 characters and has been changed from the dashboard.
- [ ] `CORS_ORIGINS` lists every real domain, with no trailing slash.
- [ ] `WHATSAPP_NUMBER` is the number that actually receives orders, in international format (`2349030438653`).
- [ ] Settings → WhatsApp number matches, since the storefront reads it live.
- [ ] Cloudinary credentials present; upload one test image from the dashboard and confirm it appears on the site.
- [ ] Place a live test order end to end and confirm the WhatsApp hand-off opens with the order already written out.
- [ ] Submit a test booking and a test enquiry; both appear in the dashboard within a minute.
- [ ] Postgres plan is not the expiring free tier.
- [ ] Activity log shows the test actions, attributed to you.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Dashboard saves fail, storefront reads fine | `CORS_ORIGINS` missing the browser origin | Add the exact origin (no trailing slash), restart the API |
| Every page shows "Could not reach the API" | `ARKVOLT_API_URL` wrong or not set on Vercel | Fix the variable, then redeploy so the rewrite rebuilds |
| Uploads fail with "Image storage is not configured" | Cloudinary variables missing | Add all three to Render |
| Signed out after 12 hours | Session lifetime (`JWT_EXPIRES_IN`) | Expected; raise it if you prefer |
| `prisma db push` fails on deploy | Postgres not reachable from the build | Check `DATABASE_URL` in the Render dashboard |
| Images missing after a deploy | Uploaded while Cloudinary was unconfigured | Re-upload with Cloudinary set |
