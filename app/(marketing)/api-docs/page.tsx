import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API",
  description: "The CLEANPLATE public API — background removal and upscaling via REST. Studio tier.",
  alternates: { canonical: "/api-docs" },
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-line bg-sunken p-4 text-xs leading-relaxed text-ink">
      <code className="tabular">{children}</code>
    </pre>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="container-page py-16">
      <div className="prose-measure mx-auto flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <span className="label-eyebrow">Developers</span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-2xl">CLEANPLATE API</h1>
          <p className="text-base text-ink-mid">
            A small REST API for background removal and upscaling. Create a key under{" "}
            <a href="/app/api-keys" className="font-medium text-amber-press underline underline-offset-2">API keys</a>{" "}
            (Studio tier) and pass it as a bearer token.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">Authentication</h2>
          <p className="text-sm text-ink-mid">Every request needs your key in the Authorization header:</p>
          <Code>{`Authorization: Bearer cp_live_xxxxxxxxxxxxxxxx`}</Code>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">Create a job</h2>
          <p className="text-sm text-ink-mid">
            <code className="tabular">POST /api/v1/jobs</code> — accepts an image URL or base64. Credits are charged on
            creation and refunded automatically if the job fails.
          </p>
          <Code>{`curl -X POST https://cleanplate.app/api/v1/jobs \\
  -H "Authorization: Bearer $CLEANPLATE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image": "https://example.com/photo.jpg",
    "params": { "tool": "cutout", "background": "transparent" }
  }'

# → { "jobId": "…", "status": "queued", "cost": 1 }`}</Code>
          <p className="text-sm text-ink-mid">Upscale to an exact resolution:</p>
          <Code>{`{ "image": "<base64>", "params": { "tool": "uplift", "target": "4k" } }`}</Code>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">Get a job</h2>
          <p className="text-sm text-ink-mid">
            <code className="tabular">GET /api/v1/jobs/:id</code> — poll until <code className="tabular">status</code> is
            <code className="tabular"> done</code>; the response then includes a signed full-resolution{" "}
            <code className="tabular">output</code> URL.
          </p>
          <Code>{`curl https://cleanplate.app/api/v1/jobs/JOB_ID \\
  -H "Authorization: Bearer $CLEANPLATE_KEY"

# → { "id": "…", "status": "done", "tool": "cutout",
#     "output": "https://…", "width": 2000, "height": 2000 }`}</Code>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">Notes</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-mid marker:text-ink-low">
            <li>Tools: <code className="tabular">cutout</code> and <code className="tabular">uplift</code>. Erase needs an interactive mask and isn&apos;t exposed here.</li>
            <li>Rate limit: 60 requests per minute per key.</li>
            <li>Images and results are deleted within 24 hours.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
