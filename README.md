<div align="center">

# CLEANPLATE

**Remove it. Rebuild it. Ship it.**
Eight restoration tools, one queue, running on your own machine.

</div>

CLEANPLATE is a self-hostable media restoration suite. One web app and one Tauri
desktop build come from a single codebase, backed by one shared engine and one
job queue. It is **non-destructive by law** — originals are never written to;
every job writes a new file and records its parameters so any result can be
re-rendered or reverted.

---

## The eight tools

| # | Tool | Does |
|---|------|------|
| 1 | **Erase** | Watermark, logo and object removal. Mask by brush/rect/lasso or auto-detect static overlays; propagate through shots; only masked pixels change, audio copied untouched. |
| 2 | **Uplift** | Upscale to a resolution — 1080p / 2K / 4K — not a multiplier. Real-ESRGAN, auto-routed live-action vs animation, optional face restore, tiled inference with OOM-halving. |
| 3 | **Revive** | Archival repair: scratch/dust, deblur, denoise, face restoration, and B&W colourisation with a per-region hue override. |
| 4 | **Isolate** | Subject cutout + alpha matting for hair edges. PNG alpha, ProRes 4444 / WebM, plus a separate matte pass. |
| 5 | **Extend** | Reframe and outpaint 16:9 → 9:16 / 1:1 by generating the missing plate, with a subject-tracking safe area. |
| 6 | **Smooth** | Frame interpolation to 48/60/120fps or slow-mo, optical-flow stabilisation (crop vs fill), rolling-shutter fix. |
| 7 | **Clarify** | Compression repair — de-block, de-band. Its own tool and an optional pre-pass on every other tool. |
| 8 | **Stack** | The pipeline builder. Chain tools, save a named preset, apply to a folder. Presets export as JSON. |

Each tool is a route, a dashboard card, and a stage that can be chained in a Stack.

---

## Architecture

```
design/     Single source of truth for the visual language (tokens.json).
            `node design/generate.mjs` emits CSS vars, the Tailwind theme, and
            the Tauri theme — consumed by frontend, site and desktop.

backend/    The shared engine. FastAPI + asyncio queue + SQLite job table,
            progress over WebSocket, one concurrent GPU job. Device detected at
            boot (CUDA / ROCm / MPS / ONNX CPU) with live VRAM. Eight tools +
            Stack behind one job service. Public /v1 API + auto OpenAPI.

frontend/   The workbench (Vite + React). Left rail, before/after viewer, right
            panel with Quality selector and live estimate, bottom job queue,
            Stack builder, rights gate, keyboard-first. Tauri wraps this build.

site/       Marketing site (Vite + React): hero before/after, the eight tools,
            pricing, download, docs, changelog, blog, legal/acceptable-use.

desktop/    Tauri shell around the workbench. Licence-key, offline. Themed from
            the shared tokens via sync-theme.mjs.

clients/    Node + Python API clients (zero-dependency) for the /v1 API.
```

> **Reference implementations.** Model weights are never bundled. So the whole
> suite — and the end-to-end smoke test — runs with **zero weights and no GPU**,
> each tool ships an honest CPU reference op (Uplift really Lanczos-resamples to
> the target, Erase really removes masked pixels by diffusion inpaint, Smooth
> really blends adjacent frames, …). Each `# MODEL:` marker in the code is where
> the real network (LaMa, ProPainter, Real-ESRGAN, RIFE, …) is swapped in once
> its weights are cached and a GPU is detected. Video I/O uses the ffmpeg that
> ships inside `imageio-ffmpeg`, so no system ffmpeg is required.

---

## Quick start

### Docker (everything, self-hosted)

```bash
cp .env.example .env
docker compose up --build
# workbench  → http://localhost:5173   (nginx proxies /api,/v1,/ws to the engine)
# marketing  → http://localhost:3000
# engine API → http://localhost:8000   (OpenAPI at /docs)
```

### Backend — CPU path (no GPU required)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m cleanplate                 # serves http://localhost:8000
```

This works everywhere. The device shows as `onnx-cpu` or `cpu` in the status
bar and the reference ops run on CPU.

### Backend — GPU path (NVIDIA CUDA)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
# install a CUDA build of torch first, then the base deps
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
pip install -r requirements.txt
python -m cleanplate
```

The engine auto-detects CUDA and enables half precision. ROCm (AMD) and MPS
(Apple silicon) are detected the same way — install the matching torch build.
Model backends (Real-ESRGAN, GFPGAN, RIFE, …) are fetched on first use by the
in-app downloader, which lists each model's size and licence, caches to
`~/.cleanplate/models`, and verifies SHA256.

### Frontend (workbench)

```bash
cd frontend
npm install
npm run dev                          # http://localhost:5173, proxies to :8000
```

### Marketing site

```bash
cd site
npm install
npm run dev                          # http://localhost:3000
```

### Desktop (Tauri)

```bash
cd desktop
npm install
npm run tauri dev                    # requires the Rust toolchain
npm run tauri build                  # produces installers per platform
```

The desktop app wraps the same frontend build and talks to a local engine at
`:8000` (run `python -m cleanplate`, or bundle it as a Tauri sidecar).

---

## Smoke test

Runs **one image and one 5-second clip** through a three-stage Stack
(**Clarify › Revive › Uplift 4K**) end to end, using the real engine — no
weights, no GPU, no system ffmpeg. Asserts both reach 4K, both are new files
(originals untouched), and all three stages ran.

```bash
cd backend
source .venv/bin/activate
python -m tests.smoke_test
# SMOKE OK — three-stage Stack ran end to end on image + 5s clip,
# non-destructive, upscaled to 4K.
```

---

## The shared engine, in brief

- **One job service.** Every tool posts to the same queue; one GPU job runs at a
  time; progress streams over a single WebSocket to the queue bar, viewer and
  status bar.
- **Non-destructive.** Uploads are stored read-only, keyed by content hash. Each
  job writes to `~/.cleanplate/data/outputs/<job>/`. The job row is the record
  that re-renders or reverts any result.
- **Device aware.** CUDA / ROCm / MPS / ONNX-CPU / CPU detected at boot, shown
  with live VRAM. Half precision on CUDA.
- **Rights gate.** First launch and every export require confirming ownership or
  licence; confirmations are logged locally with a timestamp.

## Public API

`POST /v1/uploads` (signed) → `PUT` the bytes → `POST /v1/jobs` with
`{tool, params, upload_id, webhook_url}` → `GET /v1/jobs/{id}` or receive the
completion webhook. Rate limited per key. OpenAPI at `/openapi.json`, interactive
docs at `/docs`. Node and Python clients in [`clients/`](clients/).

## Rights & acceptable use

Stripping copyright, credit or provenance marks from third-party material is
unlawful in most jurisdictions, regardless of the tool used. CLEANPLATE does
**not** detect, target or defeat C2PA, SynthID or similar provenance signatures —
Erase's auto-detect operates on the visual characteristics of overlays only.
See [`site/src/pages/legal/AcceptableUse.tsx`](site/src/pages/legal/AcceptableUse.tsx).

## Design tokens

Edit [`design/tokens.json`](design/tokens.json), then:

```bash
node design/generate.mjs             # regenerates CSS vars, Tailwind + Tauri themes
```

Dark is the default; the light theme is a mirrored token set. Masks render as
Plate Cyan at 35% — never red.

## Licence

Application code: MIT. Model weights carry their own licences (Apache-2.0,
BSD-3, MIT, OpenRAIL-M, and some research-only), surfaced in the first-run
downloader and the specs table before anything is fetched.
