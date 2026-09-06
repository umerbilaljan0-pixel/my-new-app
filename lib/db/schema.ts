import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema for the `jobs` table (Section 6). This is the production
 * Postgres schema; migrations are generated with drizzle-kit (`pnpm db:generate`)
 * and applied with `pnpm db:migrate`. The local dev JobStore mirrors the same
 * shape in a JSON file so no database is needed to run the app.
 *
 * Other Section 6 tables (users, credit_ledger, …) are added in their phases;
 * jobs.user_id is a nullable uuid with no FK yet so this table stands alone.
 */
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"), // null = anonymous session
    sessionId: text("session_id"), // anon cookie id
    tool: text("tool").notNull(), // erase | cutout | uplift
    status: text("status").notNull(), // queued|uploading|processing|done|failed|cancelled
    params: jsonb("params").notNull(),

    inputKey: text("input_key").notNull(),
    inputHash: text("input_hash").notNull(),
    inputBytes: integer("input_bytes"),
    inputWidth: integer("input_width"),
    inputHeight: integer("input_height"),
    inputMime: text("input_mime"),

    outputKey: text("output_key"),
    outputWidth: integer("output_width"),
    outputHeight: integer("output_height"),
    outputBytes: integer("output_bytes"),
    previewKey: text("preview_key"), // free-tier 1200px version

    provider: text("provider"),
    providerJobId: text("provider_job_id"),
    paramsHash: text("params_hash").notNull(),

    creditsCharged: integer("credits_charged").default(0),

    errorCode: text("error_code"),
    errorMessage: text("error_message"),

    queuedAt: timestamp("queued_at", { withTimezone: true }).defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    byOwner: index("jobs_owner_idx").on(t.userId, t.queuedAt),
    byCache: index("jobs_cache_idx").on(t.inputHash, t.tool, t.paramsHash),
    byStatus: index("jobs_status_idx").on(t.status),
  }),
);

export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
