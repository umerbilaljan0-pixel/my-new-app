# CLEANPLATE

Three AI image tools — remove watermarks, remove backgrounds, upscale to 4K.
Fast, honest, no-signup-to-try.

> **Build status: Phases 1–8 complete.** The full product — front-end, storage &
> upload, all three tools with chaining, accounts + credit ledger + Stripe
> billing + dashboard, **marketing & SEO**, **hardening** (rate limiting, error
> tracking, analytics, cleanup cron), and **the public API, API keys and batch
> mode**. Every external integration (R2, Postgres, Replicate, Google, Stripe,
> Upstash, Sentry, PostHog) has a clean fallback so the whole thing runs and is
> testable with no keys.

---

## What's in this repo today (Phase 1)

Per the spec's build order (Section 20), Phase 1 is a runnable, demonstrable
foundation with **no backend**:

- **Design tokens in exactly one file** — `lib/design-tokens.ts` is the single
  source of every colour, size, radius, font, shadow and motion value. It emits
  both the Tailwind config and the runtime CSS custom properties. No raw hex
  value appears anywhere else in the codebase.
- **Both themes** — light (default) and dark, driven by `prefers-color-scheme`
  with an explicit toggle that persists to `localStorage`. A no-FOUC inline
  script applies the stored theme before first paint.
- **Full UI component library** (`components/ui/`) — Button, IconButton, Input,
  Textarea, Select, Checkbox, RadioGroup, Toggle, Slider, Tabs, Modal (focus
  trap + Escape), Dropdown, Tooltip, Toast (4 types, stackable), Badge, Pill,
  Progress (determinate + indeterminate), Skeleton, Spinner, EmptyState,
  ErrorState — each with default / hover / active / focus-visible / disabled /
  loading / error states as applicable.
- **Layout** — sticky Header with Tools dropdown, theme toggle, credit pill and
  mobile sheet; four-column Footer with the always-present 24-hour deletion
  trust line; the CLEANPLATE wordmark (triangle replacing the "A" in PLATE).
- **Pages** — marketing home (`/`) with a live client-side drop zone preview,
  a real static pricing page (`/pricing`), tool landing placeholders, legal docs
  (with the real acceptable-use policy), and **`/gallery`** — the Phase 1 demo
  showing every component in every state.
- **Accessibility** — semantic HTML, visible focus rings, keyboard-navigable
  tabs/modals/menus, skip-to-content link, `aria-live` toasts, reduced-motion
  support.

## Phase 2 — Storage & upload

The drop zone is now the real working tool. Dropping an image runs the full
pipeline with no backend credentials required:

- **Client-side processing in a Web Worker** (`lib/image/`) — decode, downscale
  anything over 4096px on the long edge, **strip EXIF/GPS** (by re-encoding
  through a canvas), and compute the SHA-256 — all off the main thread via
  `OffscreenCanvas`, with a main-thread fallback. HEIC decodes where the browser
  supports it; otherwise a clean, typed error.
- **Presigned direct upload** (`app/api/upload`) — validates type + size, rate
  limits (10/min, 60/hr, 200/day per IP+session), and issues a single-purpose,
  5-minute presigned PUT URL. The browser uploads the bytes directly with **real
  byte progress**, cancel, timeout and retry (`lib/upload/uploadClient.ts`).
- **Pluggable storage adapter** (`lib/storage/`) — a one-file swap between
  **Cloudflare R2** (production, via the S3 API) and a **local filesystem**
  fallback (dev / no-credentials). The local backend's presigned URLs are
  HMAC-signed, expiring and single-purpose, and enforce **server-side magic-byte
  validation** on write (Section 14).
- **Typed API boundary** — every request/response and the error envelope are
  Zod schemas shared by client and server (`lib/validation/`); every error code
  from Section 7.1 renders its Section 11.6 copy.

Verified end-to-end in a real browser (Chromium): drop → worker resize/strip/
hash → presign → upload → object lands in the `inputs` bucket, plus every error
path (too large, unsupported, magic-byte rejection, expired/tampered signature).

## Phase 3 — CUTOUT end-to-end (background removal)

The **/remove-background** page is a fully working tool with no account:

- **Job model** (`lib/db/`) — a Drizzle/Postgres `jobs` schema (migration in
  `lib/db/migrations/`) behind a `JobStore` interface, with a file-backed local
  store so the app runs with no database. Content-addressed **cache**: an
  identical input+params returns the finished job and charges nothing.
- **Queue & worker** (`lib/jobs/`, `workers/`) — jobs dispatch in-process in dev
  (runs with just `pnpm dev`); a standalone DB-polling worker (`pnpm worker`,
  `INLINE_WORKER=false`) processes them in production, sharing one `processor`
  with a 60s timeout and two retries.
- **Inference adapter** (`lib/inference/`) — Replicate (production, a
  BiRefNet/RMBG-class model) and a **real** sharp-based local background remover
  (flood-fill from the borders) for dev / self-host. One-line provider swap.
- **API** (`app/api/jobs`) — `POST /api/jobs` (cache → queue → dispatch),
  `GET /api/jobs/:id` (status + free 1200px preview URL), and
  `GET /api/jobs/:id/download?quality=preview|full` (302 to a signed URL; full
  is credit-gated for Phase 5). Jobs are owned by the anonymous session.
- **Result UI** — real processing state (Section 9.3), a draggable
  keyboard-accessible before/after slider that auto-sweeps once, and a download
  card with the free option always visible (Sections 9.4–9.5).
- **24-hour cleanup** — `runCleanup()` purges expired jobs and their objects,
  runnable via the worker cron or `POST /api/cron/cleanup`.

Verified end-to-end in a real browser: drop a product shot → the background is
removed → before/after slider → free PNG download. At the API level the full
pipeline, the content-addressed cache, session ownership, HD gating, and the
cleanup purge are all covered.

## Phase 4 — ERASE, UPLIFT & chaining

All three tools now run through one unified flow (`components/tool/ToolStudio`):

- **ERASE** (`/remove-watermark`) — on upload, a real local-contrast / edge-energy
  detector (`lib/inference/detect.ts`) proposes overlay boxes in cyan; the user
  confirms ("Erase detected areas") or opens the **mask editor** (brush,
  rectangle, eraser, undo/redo, clear, invert, `[`/`]` brush size). The mask is
  dilated and inpainted; **only masked pixels change** — the rest is bit-identical.
  Local inpainting is diffusion-based; production uses a LaMa-class model.
- **UPLIFT** (`/upscale-image`) — pick an output resolution (1080p / 2K / 4K),
  not a multiplier. The picker shows exact output dimensions, an estimate and the
  credit cost, and greys out targets that would upscale beyond 4×. Local uses
  Lanczos resampling; production uses a Real-ESRGAN-class model.
- **Chaining** (Section 8.4) — every result offers the other two tools applied to
  the current output with **zero re-upload**; the server promotes the prior
  output into the inputs bucket (`fromJobId`).

The inference adapter gained `inpaint` and `upscale` (both Replicate + local),
and `POST /api/detect` runs detection. Verified end-to-end in Chromium (uplift
picker → result; detect → erase → chain into upscale; mask editor draw → erase)
and at the API level (erase changes only masked pixels; uplift/chain hit exact
target dimensions; detection finds the overlay).

## Phase 5 — Accounts, credits & billing

- **Auth** — a signed-cookie session (`lib/auth`) with real **Google OAuth**
  (activated by `GOOGLE_CLIENT_ID/SECRET`) and a **dev email login** fallback
  when Google isn't configured, so the app is usable and testable with no IdP.
- **Credit ledger** (`lib/db/accounts`, `lib/credits`) — every credit change is
  a ledger row; the balance is only ever mutated in the same transaction. The
  `users.credits` column is a cache. Postgres + file-backed local store.
- **Stripe billing** — `POST /api/billing/checkout` opens Stripe Checkout for
  the $2 / 20-credit Starter pack when configured, and **grants instantly in dev**
  otherwise; `POST /api/webhooks/stripe` grants credits on completion, idempotent
  by event id.
- **HD gate** — full-resolution download requires sign-in and credits; the credit
  is charged **at download**, once per job (re-downloads are free; a 4K upscale
  costs 2). A failed or never-downloaded job costs nothing.
- **`/app` dashboard** — credits, recent jobs, 30-day re-downloadable history,
  and billing with the credit ledger. Auth-gated.
- **Session restore** — buying credits from a result returns to that exact result
  (`?restore=<jobId>`) with the HD download unlocked.

Verified end-to-end in Chromium (dev login → dashboard; run a tool → "Get
credits" → purchase → **restore + HD unlocked**) and at the API level (17 checks:
auth, HD gating at 0 credits, charge on download, no double-charge, 4K costs 2,
sign-in required for HD, dashboard gating and rendering).

## Phase 6 — Marketing & SEO

- **Long-form tool pages** (`lib/content/tools.ts`) — real what-it-does / how-to /
  use-cases / FAQ content under each tool, with internal linking.
- **JSON-LD** — `SoftwareApplication` on home, `FAQPage` on tool pages + pricing,
  `Article` + `BreadcrumbList` on blog posts (`lib/seo.ts`, `<JsonLd>`).
- **Blog** — MDX posts in `content/blog` rendered with `next-mdx-remote`
  (`lib/blog.ts`), seeded with four genuine guides.
- **Dynamic OG images** — `/api/og` renders branded 1200×630 cards with `next/og`,
  wired into each page's `openGraph.images`.
- **`app/sitemap.ts` + `app/robots.ts`** — generated `sitemap.xml` (incl. posts)
  and `robots.txt` (disallowing `/app` and `/api`).

## Phase 7 — Hardening

- **Rate limiting** (`lib/ratelimit.ts`) — an async limiter that uses **Upstash
  Redis (REST)** when configured and an in-memory limiter otherwise, fail-soft;
  wired into upload / jobs / detect / v1.
- **Error tracking** (`lib/observability/sentry.ts`) — posts Sentry envelopes when
  `SENTRY_DSN` is set (no SDK dependency), scrubbing emails and image URLs.
- **Analytics** (`components/analytics/PostHogProvider`, `lib/analytics.ts`) —
  PostHog pageviews + funnel events (file_dropped, job_completed, download_*,
  checkout_started) when `NEXT_PUBLIC_POSTHOG_KEY` is set; no-op otherwise.
- **Cleanup cron** — `vercel.json` schedules `/api/cron/cleanup` hourly (bearer
  protected); the standalone worker also runs it.

## Phase 8 — Batch, public API, API keys

- **API keys** (`api_keys` table, `lib/apikeys.ts`, `/app/api-keys`) — generated
  `cp_live_…` keys, stored hashed, shown once, revocable.
- **Public API** — `POST /api/v1/jobs` (bearer-key auth, image URL or base64,
  credits charged at creation and auto-refunded on failure) and
  `GET /api/v1/jobs/:id` (signed full-res output). Docs at `/api-docs`.
- **Batch mode** (`/app/batch`) — remove backgrounds from up to 20 images with a
  concurrency pool, per-image status, and a JSZip download.

Verified end-to-end: 19 API checks (SEO/sitemap/robots/OG/blog, rate-limit trip,
cron, API-key lifecycle, v1 auth + credit gate + charge + refund + revoke) and 5
browser checks (batch processing + ZIP, API-key creation).

### Demo

```bash
pnpm install
pnpm dev
# open http://localhost:3000                 → marketing home (drop → upload)
# open http://localhost:3000/remove-background → CUTOUT, end-to-end
# open http://localhost:3000/remove-watermark  → ERASE (detect + mask editor)
# open http://localhost:3000/upscale-image      → UPLIFT (resolution targeting)
# open http://localhost:3000/login             → sign in (dev email or Google)
# open http://localhost:3000/app               → dashboard, history, billing
# open http://localhost:3000/gallery           → component gallery (Phase 1 demo)
```

With no `R2_*`, `DATABASE_URL`, `REPLICATE_API_TOKEN`, `GOOGLE_*` or `STRIPE_*`
set, the app uses the local storage adapter, file-backed job + account stores,
the built-in image algorithms, a dev email login, and an instant dev credit
grant — so the whole product runs end-to-end with zero configuration. Set each
provider's env vars to switch that layer to its production backend, no code
changes.

## Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Start the dev server                 |
| `pnpm build`     | Production build                     |
| `pnpm start`     | Serve the production build           |
| `pnpm lint`      | ESLint (next/core-web-vitals + TS)   |
| `pnpm typecheck` | `tsc --noEmit` (strict, no `any`)    |

All three of `build`, `lint` and `typecheck` pass clean.

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 3.4** configured entirely from the design-token file
- **lucide-react** icons, **clsx** + **tailwind-merge** for class composition
- Self-hosted **Inter**, **Inter Tight** and **JetBrains Mono** via `next/font`

## Project structure

```
app/
  (marketing)/        Home, pricing, blog, support, legal, gallery
  (tools)/            Erase / Cut Out / Upscale landing pages
  layout.tsx          Root: fonts, theme styles + no-FOUC script, providers
  globals.css         Base styles + composed utilities (no raw hex)
  app/                Auth-gated dashboard: home, history, billing
  (marketing)/login/  Sign-in (Google + dev fallback)
  api/
    upload/           Presigned-URL issuer (validate, rate limit, presign)
    storage/[op]/     Local dev storage PUT/GET (production uses R2 directly)
    jobs/             Create job, status, tier-gated (credit) download
    detect/           ERASE overlay detection
    cron/cleanup/     24-hour purge endpoint
    auth/             Google OAuth, dev login, me, signout
    billing/checkout/ Stripe Checkout (or dev grant)
    webhooks/stripe/  Grant credits on completed checkout
components/
  ui/                 The primitive component library
  layout/             Header, Footer, MobileNav, ThemeToggle, Wordmark, shell
  marketing/          Hero, ToolCard, HowItWorks, PriceCard, PhaseNotice
  tool/               DropZone, Uploader, ToolRunner, BeforeAfterSlider, …
lib/
  design-tokens.ts    SINGLE source of all visual constants
  validation/         Zod schemas + error catalogue (shared client + server)
  storage/            Storage adapter — R2 + local fallback, keys, magic bytes
  image/              Client pipeline — worker, resize/EXIF-strip/hash
  upload/             uploadClient — presign + progress + cancel + retry
  db/                 Drizzle schema + migrations + JobStore + AccountStore
  inference/          Inference adapter — Replicate + local (cutout/erase/uplift)
  jobs/               processor, dispatch, cleanup, client poller
  auth/               Signed-cookie sessions, Google OAuth, config
  credits.ts          Ledger-backed grant / charge / refund
  stripe/             Stripe client (checkout + webhook)
  ratelimit.ts        Fixed-window limiter (Upstash-ready)
  security.ts         HMAC signing, IP hashing (server-only)
  nav.ts              Shared navigation data
  utils.ts            cn() class helper
workers/
  job-runner.ts       Standalone queue worker + cleanup cron (production)
```

## Roadmap (from the master spec, Section 20)

| Phase | Scope                                                                   | Status  |
| ----- | ----------------------------------------------------------------------- | ------- |
| 1     | Foundation — tokens, UI library, theming, layout, gallery               | ✅ Done |
| 2     | Storage & upload — R2 presign, client resize/HEIC/EXIF/hash, real DropZone | ✅ Done |
| 3     | One tool end-to-end — DB, queue, worker, inference adapter, CUTOUT      | ✅ Done |
| 4     | ERASE (mask editor) + UPLIFT (resolution targeting) + chaining         | ✅ Done |
| 5     | Accounts, credits ledger, Stripe checkout, HD download gate, dashboard | ✅ Done |
| 6     | Marketing & SEO — tool content, FAQ schema, blog, OG images, sitemap   | ✅ Done |
| 7     | Hardening — rate limits, Sentry, PostHog, cleanup cron                 | ✅ Done |
| 8     | Batch mode, public API, API keys, Studio tier                          | ✅ Done |

Environment variables for later phases are documented in `.env.example`.

## Design notes / documented deviations

- `--ink-low` in light mode is darkened from the spec's `#8B9199` to `#6B7177`
  to meet WCAG AA (4.5:1) for the 12px captions it's used on — the spec (§3.8)
  explicitly instructs darkening if it fails.
- The single `(site)` chrome is shared by the `(marketing)` and `(tools)` route
  groups via `SiteShell`; the `/app` dashboard group arrives in Phase 5.
