/**
 * Client-side (in-browser) AI configuration. These models run entirely in the
 * visitor's browser via WebAssembly — no API key, no server cost. They are the
 * free-tier engine; when they're unavailable the UI falls back to the server
 * inference path (local sharp, or Replicate/Fal if configured).
 *
 * The model libraries are loaded from a CDN at runtime (they fetch their own
 * WASM + weight assets from a CDN regardless), so they are never bundled into
 * the app and cannot break the server build.
 */

/** CDN base for the ESM builds of the model libraries. Overridable via env. */
export const MODEL_CDN =
  process.env.NEXT_PUBLIC_MODEL_CDN ?? "https://cdn.jsdelivr.net/npm";

/** Pinned library versions (kept here so a bump is a one-line change). */
export const IMGLY_VERSION = "1.5.8";
export const TRANSFORMERS_VERSION = "3.3.3";

/**
 * Whether to attempt in-browser models. Defaults on; set
 * NEXT_PUBLIC_CLIENT_AI="off" to force the server path everywhere.
 */
export function clientAIEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if ((process.env.NEXT_PUBLIC_CLIENT_AI ?? "on").toLowerCase() === "off") return false;
  // Require the APIs the WASM runtimes depend on.
  return (
    typeof WebAssembly !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap !== "undefined"
  );
}
