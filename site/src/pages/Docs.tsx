function Code({ children }: { children: string }) {
  return (
    <pre className="card p-4 overflow-x-auto num text-[12px] leading-relaxed" style={{ background: "var(--bg-void)" }}>
      <code>{children}</code>
    </pre>
  );
}

export default function Docs() {
  return (
    <div className="container-grid py-14 max-w-3xl">
      <div className="label mb-3">Docs · API</div>
      <h1 className="h-display" style={{ fontSize: 32 }}>Run a job over the API.</h1>
      <p className="text-text-mid mt-2">
        The engine publishes an OpenAPI spec at <span className="num">/openapi.json</span> and interactive docs
        at <span className="num">/docs</span>. Node and Python clients live in <span className="num">/clients</span>.
      </p>

      <h2 className="h-display mt-10 mb-3" style={{ fontSize: 18 }}>1 · Sign an upload, PUT the bytes</h2>
      <Code>{`curl -s -XPOST localhost:8000/v1/uploads -H 'X-API-Key: KEY'
# -> { "upload_id": "…", "upload_url": "/v1/uploads/…" }

curl -s -XPUT "localhost:8000/v1/uploads/UPLOAD_ID" \\
  -H 'X-Filename: shot.mp4' --data-binary @shot.mp4`}</Code>

      <h2 className="h-display mt-8 mb-3" style={{ fontSize: 18 }}>2 · Create the job</h2>
      <Code>{`curl -s -XPOST localhost:8000/v1/jobs -H 'X-API-Key: KEY' \\
  -H 'content-type: application/json' -d '{
    "tool": "stack",
    "upload_id": "UPLOAD_ID",
    "quality": "best",
    "webhook_url": "https://you.example/hook",
    "params": { "stages": [
      { "tool": "clarify" },
      { "tool": "revive", "params": { "face_restore": true } },
      { "tool": "uplift", "params": { "target": "4K" } }
    ] }
  }'`}</Code>

      <h2 className="h-display mt-8 mb-3" style={{ fontSize: 18 }}>3 · Poll or receive the webhook</h2>
      <Code>{`curl -s localhost:8000/v1/jobs/JOB_ID -H 'X-API-Key: KEY'
# { "status": "done", "progress": 1.0, ... }`}</Code>

      <h2 className="h-display mt-10 mb-3" style={{ fontSize: 18 }}>Python client</h2>
      <Code>{`from cleanplate_client import CleanplateClient

cp = CleanplateClient("http://localhost:8000", api_key="KEY")
job = cp.run("uplift", "photo.jpg", params={"target": "4K"}, quality="best")
cp.wait(job["id"])
cp.download(job["id"], "photo_4k.png")`}</Code>

      <h2 className="h-display mt-8 mb-3" style={{ fontSize: 18 }}>Node client</h2>
      <Code>{`import { CleanplateClient } from "@cleanplate/client";

const cp = new CleanplateClient("http://localhost:8000", { apiKey: "KEY" });
const job = await cp.run("erase", "frame.png", { params: { auto_detect: true } });
await cp.wait(job.id);`}</Code>

      <p className="text-[12px] text-text-low mt-8">
        Rate limited per key. Every request is subject to the rights gate — the engine refuses jobs until
        ownership is confirmed. See Acceptable Use.
      </p>
    </div>
  );
}
