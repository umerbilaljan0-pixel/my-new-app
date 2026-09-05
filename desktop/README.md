# CLEANPLATE desktop (Tauri)

A native shell around the same web workbench (`../frontend`). Licence-key,
offline — no account, nothing uploaded.

```bash
npm install
npm run tauri dev       # dev (spawns the frontend dev server; needs Rust toolchain)
npm run tauri build     # installers per platform (.dmg / .exe / .AppImage / .deb)
```

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
