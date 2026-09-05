// CLEANPLATE Node client — zero dependencies (Node 18+ global fetch).
//
//   import { CleanplateClient } from "@cleanplate/client";
//   const cp = new CleanplateClient("http://localhost:8000", { apiKey: "KEY" });
//   const job = await cp.run("uplift", "photo.jpg", { params: { target: "4K" } });
//   await cp.wait(job.id);
//   await cp.download(job.id, "photo_4k.png");

import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

export class CleanplateError extends Error {}

export class CleanplateClient {
  constructor(baseUrl = "http://localhost:8000", { apiKey } = {}) {
    this.base = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  _headers(extra = {}) {
    const h = { ...extra };
    if (this.apiKey) h["X-API-Key"] = this.apiKey;
    return h;
  }

  async _json(res) {
    if (!res.ok) throw new CleanplateError(`${res.status}: ${await res.text()}`);
    return res.json();
  }

  confirmRights(context = "first_launch") {
    return fetch(`${this.base}/api/rights`, {
      method: "POST",
      headers: this._headers({ "content-type": "application/json" }),
      body: JSON.stringify({ context, confirmed: true }),
    }).then((r) => this._json(r));
  }

  async upload(path) {
    const { upload_id } = await fetch(`${this.base}/v1/uploads`, {
      method: "POST",
      headers: this._headers(),
    }).then((r) => this._json(r));
    const bytes = await readFile(path);
    const res = await fetch(`${this.base}/v1/uploads/${upload_id}`, {
      method: "PUT",
      headers: this._headers({ "X-Filename": basename(path), "content-type": "application/octet-stream" }),
      body: bytes,
    });
    if (!res.ok) throw new CleanplateError(`upload failed: ${res.status}`);
    return upload_id;
  }

  createJob(tool, uploadId, { params = {}, quality = "balanced", webhookUrl = null, priority = 0 } = {}) {
    return fetch(`${this.base}/v1/jobs`, {
      method: "POST",
      headers: this._headers({ "content-type": "application/json" }),
      body: JSON.stringify({ tool, upload_id: uploadId, params, quality, webhook_url: webhookUrl, priority }),
    }).then((r) => this._json(r));
  }

  async run(tool, path, opts = {}) {
    return this.createJob(tool, await this.upload(path), opts);
  }

  get(jobId) {
    return fetch(`${this.base}/v1/jobs/${jobId}`, { headers: this._headers() }).then((r) => this._json(r));
  }

  async wait(jobId, { poll = 1000, timeout = 3_600_000 } = {}) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const job = await this.get(jobId);
      if (["done", "error", "cancelled"].includes(job.status)) {
        if (job.status === "error") throw new CleanplateError(`job failed: ${job.error}`);
        return job;
      }
      await new Promise((r) => setTimeout(r, poll));
    }
    throw new CleanplateError("timed out waiting for job");
  }

  async download(jobId, dest) {
    const res = await fetch(`${this.base}/api/jobs/${jobId}/output`, { headers: this._headers() });
    if (!res.ok) throw new CleanplateError(`no output: ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return dest;
  }
}

export default CleanplateClient;
