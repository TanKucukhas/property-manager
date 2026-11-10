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

- Files in `migrations/` (0001–0013), run with `npm run cf:d1:migrate`
- One-off data fixes that need UPDATE live in `scripts/d1/` (outside the migrate guard), run manually after a backup
- Script blocks destructive SQL (DROP/DELETE/TRUNCATE/UPDATE)
- ALTER TABLE duplicates are tolerated (skipped with error message)
- No rollback — fix forward with new migration files
- Always backup before migrating: `npm run cf:d1:backup`

## Architecture

- Next.js 16 App Router, all pages in `src/app/`
- Schema: `src/db/schema.ts` (Drizzle ORM, SQLite/D1)
- Auth: JWT in HTTP-only cookies (`src/lib/auth.ts`)
- Email: Cloudflare Email Service via the `EMAIL` send_email binding (`src/lib/mailer.ts`); sender hello@cresiq.com. Needs wrangler ≥ 4.15x for `wrangler email` commands
- Scoring: `src/lib/validations.ts` — system score 0-80, admin rating 0-10 (×2)
- AI rating: `src/lib/ai-prescreening-prompt.ts` — generates prompt for Claude/ChatGPT
- AI runner: admin queues `ai_jobs` (`/api/ai-jobs`); `ai-runner/runner.mjs` on the Mac (launchd) polls `/api/ai-runner/jobs/next` with Bearer `AI_RUNNER_TOKEN` (Worker secret) and runs Claude Code / Codex CLI on subscription auth. Results are reviewed manually, never auto-applied. See `ai-runner/README.md`
- Listing rounds: `property_listings` + `prescreenings.listing_id` (`src/lib/listings.ts`). Property status → `available` opens a round, leaving `available` closes it; new applications attach to the open round

## Key Constraints

- D1 is SQLite — no JSON column type, use `text` and parse in app code
- `aiAnalysis` stored as JSON string in `text` column — always coerce nested objects to strings before rendering in React (React error #31)
- Voucher fields: AI models often return `voucherAnalysis` as an object despite prompt asking for string — `coerceToStringOrNull()` handles this
- Migrations must be idempotent: use `IF NOT EXISTS` for tables, tolerate `duplicate column` for ALTER TABLE
