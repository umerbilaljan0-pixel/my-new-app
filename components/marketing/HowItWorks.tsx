const STEPS = [
  { n: "1", title: "Drop your image", body: "PNG, JPG, WEBP or HEIC. No account." },
  { n: "2", title: "We process it in seconds", body: "One model pass, no fiddling." },
  { n: "3", title: "Download it", body: "Free at 1200px, or full resolution for a credit." },
] as const;

/**
 * HowItWorks — the three-step explainer (Section 11.1). Numbers render in the
 * mono face as a brand signature.
 */
export function HowItWorks() {
  return (
    <section className="container-page py-20">
      <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
        How it works
      </h2>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6"
          >
            <span className="tabular grid h-10 w-10 place-items-center rounded-md bg-ink text-base font-medium text-paper">
              {step.n}
            </span>
            <h3 className="font-display text-lg font-semibold text-ink">
              {step.title}
            </h3>
            <p className="text-sm text-ink-mid">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
