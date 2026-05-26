@AGENTS.md

## Deployment

- **Platform:** Cloudflare Workers via OpenNext
- **Database:** Cloudflare D1 (SQLite), ORM: Drizzle
- **Domain:** cresiq.com (routed via wrangler.jsonc)
- **CI:** Cloudflare Pages auto-deploys on push to `main`
  - Build: `npm run build` → `opennextjs-cloudflare build`
  - Deploy: `npx wrangler deploy`

### Commands

```bash
npm run dev              # Local dev server
npm run cf:deploy        # Manual: build + migrate + deploy
npm run cf:d1:migrate    # Run all migrations (safe to re-run)
npm run cf:d1:backup     # Export D1 before migrations
```

### Migrations

- Files in `migrations/` (0001–0010), run with `npm run cf:d1:migrate`
- Script blocks destructive SQL (DROP/DELETE/TRUNCATE/UPDATE)
- ALTER TABLE duplicates are tolerated (skipped with error message)
- No rollback — fix forward with new migration files
- Always backup before migrating: `npm run cf:d1:backup`

## Architecture

- Next.js 16 App Router, all pages in `src/app/`
- Schema: `src/db/schema.ts` (Drizzle ORM, SQLite/D1)
- Auth: JWT in HTTP-only cookies (`src/lib/auth.ts`)
- Email: Brevo API (`src/lib/mailer.ts`)
- Scoring: `src/lib/validations.ts` — system score 0-80, admin rating 0-10 (×2)
- AI rating: `src/lib/ai-prescreening-prompt.ts` — generates prompt for Claude/ChatGPT

## Key Constraints

- D1 is SQLite — no JSON column type, use `text` and parse in app code
- `aiAnalysis` stored as JSON string in `text` column — always coerce nested objects to strings before rendering in React (React error #31)
- Voucher fields: AI models often return `voucherAnalysis` as an object despite prompt asking for string — `coerceToStringOrNull()` handles this
- Migrations must be idempotent: use `IF NOT EXISTS` for tables, tolerate `duplicate column` for ALTER TABLE
