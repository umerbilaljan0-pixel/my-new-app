import "server-only";
import type {
  AccountStore,
  AppendLedgerInput,
  LedgerEntry,
  LedgerReason,
  User,
} from "./types";

/**
 * Postgres/Drizzle AccountStore (production). appendLedger runs inside a
 * transaction so the ledger row and the users.credits cache never diverge.
 */

function iso(d: unknown): string {
  return d ? new Date(d as string).toISOString() : new Date().toISOString();
}

function rowToUser(r: Record<string, unknown>): User {
  return {
    id: r.id as string,
    email: r.email as string,
    name: (r.name as string) ?? null,
    avatarUrl: (r.avatarUrl as string) ?? null,
    authProvider: (r.authProvider as string) ?? null,
    credits: (r.credits as number) ?? 0,
    plan: (r.plan as string) ?? "free",
    stripeCustomerId: (r.stripeCustomerId as string) ?? null,
    stripeSubscriptionId: (r.stripeSubscriptionId as string) ?? null,
    planRenewsAt: r.planRenewsAt ? iso(r.planRenewsAt) : null,
    createdAt: iso(r.createdAt),
    lastSeenAt: iso(r.lastSeenAt),
  };
}

function rowToEntry(r: Record<string, unknown>): LedgerEntry {
  return {
    id: r.id as string,
    userId: r.userId as string,
    delta: r.delta as number,
    reason: r.reason as LedgerReason,
    jobId: (r.jobId as string) ?? null,
    stripePaymentIntent: (r.stripePaymentIntent as string) ?? null,
    balanceAfter: r.balanceAfter as number,
    createdAt: iso(r.createdAt),
  };
}

export async function createPostgresAccountStore(databaseUrl: string): Promise<AccountStore> {
  const [{ drizzle }, postgres, schema, orm] = await Promise.all([
    import("drizzle-orm/postgres-js"),
    import("postgres").then((m) => m.default),
    import("../schema"),
    import("drizzle-orm"),
  ]);
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client);
  const { users, creditLedger, stripeEvents } = schema;
  const { eq, desc } = orm;

  return {
    backend: "postgres",

    async upsertUserByEmail({ email, name, avatarUrl, authProvider }): Promise<User> {
      const lower = email.toLowerCase();
      const [existing] = await db.select().from(users).where(eq(users.email, lower)).limit(1);
      if (existing) {
        const [updated] = await db
          .update(users)
          .set({ name: name ?? existing.name, avatarUrl: avatarUrl ?? existing.avatarUrl, lastSeenAt: new Date() })
          .where(eq(users.id, existing.id))
          .returning();
        return rowToUser(updated as Record<string, unknown>);
      }
      const [created] = await db
        .insert(users)
        .values({ email: lower, name: name ?? null, avatarUrl: avatarUrl ?? null, authProvider: authProvider ?? null })
        .returning();
      return rowToUser(created as Record<string, unknown>);
    },

    async getUserById(id: string): Promise<User | null> {
      const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return row ? rowToUser(row as Record<string, unknown>) : null;
    },

    async getUserByEmail(email: string): Promise<User | null> {
      const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      return row ? rowToUser(row as Record<string, unknown>) : null;
    },

    async updateUser(id: string, patch: Partial<User>): Promise<User | null> {
      const cols: Record<string, unknown> = {};
      if (patch.plan !== undefined) cols.plan = patch.plan;
      if (patch.stripeCustomerId !== undefined) cols.stripeCustomerId = patch.stripeCustomerId;
      if (patch.stripeSubscriptionId !== undefined) cols.stripeSubscriptionId = patch.stripeSubscriptionId;
      if (patch.name !== undefined) cols.name = patch.name;
      if (patch.avatarUrl !== undefined) cols.avatarUrl = patch.avatarUrl;
      if (Object.keys(cols).length === 0) {
        const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return existing ? rowToUser(existing as Record<string, unknown>) : null;
      }
      const [row] = await db.update(users).set(cols).where(eq(users.id, id)).returning();
      return row ? rowToUser(row as Record<string, unknown>) : null;
    },

    async appendLedger(input: AppendLedgerInput): Promise<{ balance: number; entry: LedgerEntry }> {
      return db.transaction(async (tx) => {
        const [u] = await tx.select().from(users).where(eq(users.id, input.userId)).limit(1).for("update");
        if (!u) throw new Error("user not found");
        const balance = (u.credits ?? 0) + input.delta;
        if (balance < 0) throw new Error("INSUFFICIENT_CREDITS");
        const [entry] = await tx
          .insert(creditLedger)
          .values({
            userId: input.userId,
            delta: input.delta,
            reason: input.reason,
            jobId: input.jobId ?? null,
            stripePaymentIntent: input.stripePaymentIntent ?? null,
            balanceAfter: balance,
          })
          .returning();
        await tx.update(users).set({ credits: balance }).where(eq(users.id, input.userId));
        return { balance, entry: rowToEntry(entry as Record<string, unknown>) };
      });
    },

    async getBalance(userId: string): Promise<number> {
      const [row] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)).limit(1);
      return row?.credits ?? 0;
    },

    async listLedger(userId: string, limit = 50): Promise<LedgerEntry[]> {
      const rows = await db
        .select()
        .from(creditLedger)
        .where(eq(creditLedger.userId, userId))
        .orderBy(desc(creditLedger.createdAt))
        .limit(limit);
      return (rows as Record<string, unknown>[]).map(rowToEntry);
    },

    async markStripeEvent(id: string): Promise<boolean> {
      // RETURNING is empty when the row already existed → not newly recorded.
      const inserted = await db.insert(stripeEvents).values({ id }).onConflictDoNothing().returning();
      return inserted.length > 0;
    },
  };
}
