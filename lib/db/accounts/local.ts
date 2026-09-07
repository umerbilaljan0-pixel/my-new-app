import "server-only";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
  AccountStore,
  AppendLedgerInput,
  LedgerEntry,
  User,
} from "./types";

/**
 * File-backed AccountStore for dev / no-database use. Reads fresh and writes
 * atomically on every operation so the Next server and worker share one view.
 */

const FILE = path.join(tmpdir(), "cleanplate-accounts.json");

interface DbShape {
  users: Record<string, User>;
  emailIndex: Record<string, string>;
  ledger: LedgerEntry[];
  stripeEvents: Record<string, true>;
}

function read(): DbShape {
  if (!existsSync(FILE)) return { users: {}, emailIndex: {}, ledger: [], stripeEvents: {} };
  try {
    const db = JSON.parse(readFileSync(FILE, "utf8")) as Partial<DbShape>;
    return {
      users: db.users ?? {},
      emailIndex: db.emailIndex ?? {},
      ledger: db.ledger ?? [],
      stripeEvents: db.stripeEvents ?? {},
    };
  } catch {
    return { users: {}, emailIndex: {}, ledger: [], stripeEvents: {} };
  }
}

function write(db: DbShape): void {
  const tmp = `${FILE}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  writeFileSync(tmp, JSON.stringify(db));
  renameSync(tmp, FILE);
}

export function createLocalAccountStore(): AccountStore {
  return {
    backend: "local",

    async upsertUserByEmail({ email, name, avatarUrl, authProvider }): Promise<User> {
      const db = read();
      const now = new Date().toISOString();
      const existingId = db.emailIndex[email.toLowerCase()];
      if (existingId && db.users[existingId]) {
        const u = db.users[existingId]!;
        u.name = name ?? u.name;
        u.avatarUrl = avatarUrl ?? u.avatarUrl;
        u.lastSeenAt = now;
        db.users[existingId] = u;
        write(db);
        return u;
      }
      const user: User = {
        id: randomUUID(),
        email: email.toLowerCase(),
        name: name ?? null,
        avatarUrl: avatarUrl ?? null,
        authProvider: authProvider ?? null,
        credits: 0,
        plan: "free",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        planRenewsAt: null,
        createdAt: now,
        lastSeenAt: now,
      };
      db.users[user.id] = user;
      db.emailIndex[user.email] = user.id;
      write(db);
      return user;
    },

    async getUserById(id: string): Promise<User | null> {
      return read().users[id] ?? null;
    },

    async getUserByEmail(email: string): Promise<User | null> {
      const db = read();
      const id = db.emailIndex[email.toLowerCase()];
      return id ? db.users[id] ?? null : null;
    },

    async updateUser(id: string, patch: Partial<User>): Promise<User | null> {
      const db = read();
      const u = db.users[id];
      if (!u) return null;
      const updated = { ...u, ...patch, id: u.id, email: u.email };
      db.users[id] = updated;
      write(db);
      return updated;
    },

    async appendLedger(input: AppendLedgerInput): Promise<{ balance: number; entry: LedgerEntry }> {
      const db = read();
      const user = db.users[input.userId];
      if (!user) throw new Error("user not found");
      const balance = user.credits + input.delta;
      if (balance < 0) throw new Error("INSUFFICIENT_CREDITS");
      const entry: LedgerEntry = {
        id: randomUUID(),
        userId: input.userId,
        delta: input.delta,
        reason: input.reason,
        jobId: input.jobId ?? null,
        stripePaymentIntent: input.stripePaymentIntent ?? null,
        balanceAfter: balance,
        createdAt: new Date().toISOString(),
      };
      db.ledger.push(entry);
      user.credits = balance;
      db.users[input.userId] = user;
      write(db);
      return { balance, entry };
    },

    async getBalance(userId: string): Promise<number> {
      return read().users[userId]?.credits ?? 0;
    },

    async listLedger(userId: string, limit = 50): Promise<LedgerEntry[]> {
      return read()
        .ledger.filter((e) => e.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },

    async markStripeEvent(id: string): Promise<boolean> {
      const db = read();
      if (db.stripeEvents[id]) return false;
      db.stripeEvents[id] = true;
      write(db);
      return true;
    },
  };
}
