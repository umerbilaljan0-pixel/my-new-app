import { Uploader } from "@/components/tool/Uploader";

/**
 * Hero — H1, sub, and the live drop zone (Sections 9.1 / 9.2). The Uploader is
 * the real working tool: drop an image and it is processed in-browser and
 * uploaded to storage, with real progress — not a picture of a tool.
 */
export function Hero() {
  return (
    <section className="container-page pb-16 pt-16 sm:pt-24">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-tight text-ink sm:text-3xl">
          Remove it. Rebuild it. Ship it.
        </h1>
        <p className="prose-measure mt-5 text-base text-ink-mid">
          Three AI tools for images — erase watermarks, cut out backgrounds,
          upscale to 4K. No signup. Results in seconds.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-[560px]">
        <Uploader showToolLinks />
        <p className="mt-4 text-center text-sm text-ink-mid">
          <span className="tabular">20</span> full-resolution images for{" "}
          <span className="tabular">$2</span>. No subscription.
        </p>
      </div>
    </section>
  );
}
