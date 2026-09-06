# CLEANPLATE

Three AI image tools — remove watermarks, remove backgrounds, upscale to 4K.
Fast, honest, no-signup-to-try.

> **Build status: Phases 1–3 complete.** The front-end foundation, a working
> **storage & upload pipeline**, and **one tool end-to-end** — CUTOUT
> (background removal): job store, queue/worker, inference adapter, and the full
> processing → before/after → free-download flow, no account required. Accounts
> and billing are outlined below and in the master spec.

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

### Demo

```bash
pnpm install
pnpm dev
# open http://localhost:3000                 → marketing home (drop → upload)
# open http://localhost:3000/remove-background → CUTOUT tool, end-to-end (Phase 3)
# open http://localhost:3000/gallery          → component gallery (Phase 1 demo)
```

With no `R2_*`, `DATABASE_URL` or `REPLICATE_API_TOKEN` set, the app uses the
local storage adapter, a file-backed job store, and the built-in background
remover — so the whole flow runs end-to-end with zero configuration. Set the
`R2_*` / `DATABASE_URL` / `REPLICATE_*` env vars to switch each layer to its
production backend, no code changes.

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
  api/
    upload/           Presigned-URL issuer (validate, rate limit, presign)
    storage/[op]/     Local dev storage PUT/GET (production uses R2 directly)
    jobs/             Create job, status, tier-gated download
    cron/cleanup/     24-hour purge endpoint
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
  db/                 Drizzle schema + migrations + JobStore (pg | local)
  inference/          Inference adapter — Replicate + local bg remover
  jobs/               processor, dispatch, cleanup, client poller
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
| 4     | ERASE (mask editor) + UPLIFT (resolution targeting) + chaining         | Next    |
| 5     | Accounts, credits ledger, Stripe checkout, HD download gate, dashboard | Planned |
| 6     | Marketing & SEO — tool content, FAQ schema, blog, OG images, sitemap   | Planned |
| 7     | Hardening — rate limits, abuse, Sentry, PostHog, cleanup cron, a11y/perf | Planned |
| 8     | Batch mode, public API, API keys, Studio tier                          | Planned |

Environment variables for later phases are documented in `.env.example`.

## Design notes / documented deviations

- `--ink-low` in light mode is darkened from the spec's `#8B9199` to `#6B7177`
  to meet WCAG AA (4.5:1) for the 12px captions it's used on — the spec (§3.8)
  explicitly instructs darkening if it fails.
- The single `(site)` chrome is shared by the `(marketing)` and `(tools)` route
  groups via `SiteShell`; the `/app` dashboard group arrives in Phase 5.
