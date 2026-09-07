# CLEANPLATE — in-browser demo

A single, self-contained HTML file: the CLEANPLATE workbench running entirely in
the browser with a **mock engine**. No backend, no upload, no build step.

Open `demo/index.html` directly, or host the folder statically. Drop an image
(or use the built-in sample), pick a tool, hit **Render**, watch the mock job
queue, and drag the before/after slider.

The image operations are real client-side canvas work that mirror the engine's
CPU reference ops — Uplift resamples to the target resolution, Erase fills a
drawn rectangle from its surroundings, Clarify de-blocks, Revive denoises /
sharpens / colourises, Extend outpaints to a new aspect, Isolate keys an alpha
matte, and Stack chains them. It exists to *try the UX*; the real models and
video pipeline live in `backend/` and the desktop app.
