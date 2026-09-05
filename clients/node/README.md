# @cleanplate/client

Node client (18+, uses global `fetch`). Zero dependencies. Wraps the public
`/v1` API.

```js
import { CleanplateClient } from "@cleanplate/client";

const cp = new CleanplateClient("http://localhost:8000", { apiKey: "KEY" });
await cp.confirmRights();                              // first-launch rights gate

const job = await cp.run("erase", "frame.png", {
  params: { auto_detect: true },
  quality: "balanced",
});
await cp.wait(job.id);
await cp.download(job.id, "frame_clean.png");
```

Chain tools with a Stack:

```js
const job = await cp.run("stack", "archive.mov", {
  params: { stages: [
    { tool: "clarify" },
    { tool: "revive", params: { face_restore: true } },
    { tool: "uplift", params: { target: "4K" } },
  ] },
});
await cp.wait(job.id);
```
