import "server-only";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Job, NewJob } from "../types";
import type { JobStore } from "./types";
import type { Tool } from "@/lib/validation/jobs";

/**
 * File-backed JobStore for dev / no-database use. Every operation reads the JSON
 * file fresh and writes atomically (temp file + rename), so the Next server and
 * a separately-run worker process share a consistent view. Not for production —
 * getJobStore() logs a warning when this backend is active.
 */

const FILE = path.join(tmpdir(), "cleanplate-jobs.json");

interface DbShape {
  jobs: Record<string, Job>;
}

function read(): DbShape {
  if (!existsSync(FILE)) return { jobs: {} };
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as DbShape;
  } catch {
    return { jobs: {} };
  }
}

function write(db: DbShape): void {
  const tmp = `${FILE}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  writeFileSync(tmp, JSON.stringify(db));
  renameSync(tmp, FILE); // atomic on the same filesystem
}

function blankJob(input: NewJob): Job {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    userId: input.userId,
    sessionId: input.sessionId,
    tool: input.tool,
    status: input.status ?? "queued",
    params: input.params,
    inputKey: input.inputKey,
    inputHash: input.inputHash,
    inputBytes: null,
    inputWidth: input.inputWidth ?? null,
    inputHeight: input.inputHeight ?? null,
    inputMime: null,
    outputKey: input.outputKey ?? null,
    outputWidth: input.outputWidth ?? null,
    outputHeight: input.outputHeight ?? null,
    outputBytes: input.outputBytes ?? null,
    previewKey: input.previewKey ?? null,
    provider: input.provider ?? null,
    providerJobId: null,
    paramsHash: input.paramsHash,
    creditsCharged: 0,
    errorCode: null,
    errorMessage: null,
    queuedAt: now,
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    expiresAt: input.expiresAt,
  };
}

export function createLocalJobStore(): JobStore {
  return {
    backend: "local",

    async create(input: NewJob): Promise<Job> {
      const db = read();
      const job = blankJob(input);
      db.jobs[job.id] = job;
      write(db);
      return job;
    },

    async getById(id: string): Promise<Job | null> {
      return read().jobs[id] ?? null;
    },

    async update(id: string, patch: Partial<Job>): Promise<Job | null> {
      const db = read();
      const existing = db.jobs[id];
      if (!existing) return null;
      const updated = { ...existing, ...patch, id: existing.id };
      db.jobs[id] = updated;
      write(db);
      return updated;
    },

    async findCached(inputHash: string, tool: Tool, paramsHash: string): Promise<Job | null> {
      const db = read();
      const now = Date.now();
      for (const job of Object.values(db.jobs)) {
        if (
          job.inputHash === inputHash &&
          job.tool === tool &&
          job.paramsHash === paramsHash &&
          job.status === "done" &&
          job.previewKey &&
          new Date(job.expiresAt).getTime() > now
        ) {
          return job;
        }
      }
      return null;
    },

    async claimNextQueued(): Promise<Job | null> {
      const db = read();
      const next = Object.values(db.jobs)
        .filter((j) => j.status === "queued")
        .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))[0];
      if (!next) return null;
      next.status = "processing";
      next.startedAt = new Date().toISOString();
      db.jobs[next.id] = next;
      write(db);
      return next;
    },

    async listExpired(now: Date): Promise<Job[]> {
      const db = read();
      return Object.values(db.jobs).filter(
        (j) => new Date(j.expiresAt).getTime() <= now.getTime(),
      );
    },

    async remove(id: string): Promise<void> {
      const db = read();
      delete db.jobs[id];
      write(db);
    },
  };
}
