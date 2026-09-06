import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit config (Section 6). `pnpm db:generate` produces SQL migrations from
 * lib/db/schema.ts; `pnpm db:migrate` applies them to DATABASE_URL.
 */
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/cleanplate",
  },
} satisfies Config;
