# CLEANPLATE desktop (Tauri)

A native shell around the same web workbench (`../frontend`). Licence-key,
offline — no account, nothing uploaded.

> Verified: compiles with `tauri build` (Rust release, links libwebkit2gtk-4.1 /
> libgtk-3 / libsoup-3.0), bundles a `.deb`, launches as a native window, and
> connects to a local engine on `:8000` (the status bar shows the device).

## Prerequisites

- **Rust toolchain** (`rustup`).
- **Node 18+**.
- **Linux system libs** (Debian/Ubuntu):
  ```bash
  sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev \
      libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libayatana-appindicator3-dev
  ```
  macOS needs Xcode CLT; Windows needs the WebView2 runtime + MSVC build tools.
- **Icons** (generated, not committed): `python gen-icons.py` (needs Pillow).

```bash
npm install
python gen-icons.py     # writes src-tauri/icons/*.png from the brand monogram
npm run tauri dev       # dev — spawns the frontend dev server (proxy to :8000)
npm run tauri build     # release binary + installers (.deb / .AppImage / .dmg / .exe)
npm run tauri build -- --no-bundle   # just the binary, skip installers
```

## Talking to the engine

The packaged app loads from `tauri://localhost`, so it can't use same-origin
`/api`. The build runs the frontend in **desktop mode**
(`vite build --mode desktop`, see `beforeBuildCommand`), which sets
`VITE_API_BASE=http://localhost:8000` (`../frontend/.env.desktop`). The web
build keeps an empty base (same-origin, behind nginx). The CSP in
`tauri.conf.json` already allows `connect-src http://localhost:8000` + its
WebSocket.

## Theme from the shared tokens

`sync-theme.mjs` runs automatically before dev/build. It reads
`../design/generated/tauri-theme.json` (produced from `design/tokens.json`) and:

- writes `src-tauri/src/theme.rs` with the brand + colour constants, and
- patches the window `backgroundColor` in `tauri.conf.json` to `--bg-void`.

So the native window chrome always matches the design system.

## The engine

The desktop app expects a local CLEANPLATE engine at `http://localhost:8000`.
Either run `python -m cleanplate` alongside it, or bundle the engine as a Tauri
sidecar and spawn it in `src-tauri/src/lib.rs` (`setup` hook, commented).

## Licensing

`activate_license` (a Tauri command) validates a signed key against a machine
fingerprint — perpetual, offline-activatable, up to three machines. The
reference build validates the key format only.
