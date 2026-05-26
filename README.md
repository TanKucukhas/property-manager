# CresIQ — Property Manager

Rental property management platform with prescreening, tenant management, and AI-assisted applicant rating.

**Live:** https://cresiq.com

## Stack

- **Framework:** Next.js 16 (App Router)
- **Hosting:** Cloudflare Workers via [OpenNext](https://opennextjs.org/)
- **Database:** Cloudflare D1 (SQLite)
- **ORM:** Drizzle ORM
- **UI:** shadcn/ui + Tailwind CSS v4
- **Email:** Brevo (Sendinblue) API

## Local Development

```bash
npm install
npm run dev          # Next.js dev server (port 3000)
```

## Deployment

Deployment happens automatically via Cloudflare Pages CI on `git push` to `main`.

### CI Pipeline (automatic)

1. `npm run build` — runs `opennextjs-cloudflare build`
2. `npx wrangler deploy` — deploys Worker to Cloudflare

### Manual Deploy (from local)

```bash
npm run cf:deploy    # Build + migrate D1 + deploy Worker
```

### Database Migrations

Migrations are in `migrations/` and run against Cloudflare D1 remotely.

```bash
npm run cf:d1:migrate   # Apply all migrations (skips already-applied ones)
npm run cf:d1:backup    # Export D1 to backups/ (requires API token permissions)
```

**Safety:** The migrate script blocks any file containing `DROP`, `DELETE`, `TRUNCATE`, or `UPDATE` — destructive SQL must be run manually via `wrangler d1 execute`.

**Rollback:** D1 has no built-in rollback. If a migration breaks something, write a new migration to fix it (additive approach). Always run `cf:d1:backup` before applying new migrations.

**How migrations work:**
- `CREATE TABLE IF NOT EXISTS` — safe to re-run, skips if table exists
- `ALTER TABLE ADD COLUMN` — errors with "duplicate column" if already applied, script tolerates this
- `INSERT OR IGNORE` — safe to re-run, skips if row exists
- New migrations: add `migrations/NNNN_description.sql`, run `npm run cf:d1:migrate`

### Wrangler Config

`wrangler.jsonc` — routes `cresiq.com` and `www.cresiq.com` to the Worker.

D1 database: `property-manager-db` (ID: `0d011bf5-d02e-4bbf-8ca3-92beb4740206`)

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `JWT_SECRET` | `.env` / Cloudflare secrets | Auth token signing |
| `BREVO_API_KEY` | `.env` / Cloudflare secrets | Email sending |

## Project Structure

```
src/
  app/
    page.tsx                   # Landing page
    apply/page.tsx             # Prescreening application form
    login/page.tsx             # Admin login
    signup/page.tsx            # Property manager signup
    maintenance/page.tsx       # Tenant maintenance request
    tenant/login/page.tsx      # Tenant portal login
    admin/
      page.tsx                 # Dashboard
      prescreening/page.tsx    # Application review + AI rating
      properties/page.tsx      # Property management + qualifications
      shares/page.tsx          # Application share links
      tenants/page.tsx         # Tenant management
      payments/page.tsx        # Payment tracking
      deposits/page.tsx        # Deposit tracking
      leases/page.tsx          # Lease management
      maintenance/page.tsx     # Maintenance requests
    api/                       # API routes (Next.js Route Handlers)
  db/schema.ts                 # Drizzle ORM schema (all tables)
  lib/
    db.ts                      # D1 database connection
    auth.ts                    # JWT session management
    mailer.ts                  # Brevo email sending
    validations.ts             # Zod schemas + prescreening scoring
    ai-prescreening-prompt.ts  # AI rating prompt generator
migrations/                    # D1 SQL migrations (0001–0010)
wrangler.jsonc                 # Cloudflare Worker config
```

## Key Features

- **Prescreening:** Multi-step application form with automatic scoring (0-80) + admin rating (0-10, ×2 weight)
- **AI Rating:** Copy prompt → paste into Claude/ChatGPT → paste JSON response back for structured analysis
- **Application Shares:** Direct links and public links with visit tracking and lead source attribution
- **Property Qualifications:** Income multiplier, credit score minimum, pets policy, voucher acceptance
- **Voucher Support:** Housing Choice Voucher / Section 8 fields with caseworker info and RFTA tracking
- **Tenant Portal:** Token-based access for maintenance requests
- **Email Notifications:** Applicant confirmation + admin notification on new applications
