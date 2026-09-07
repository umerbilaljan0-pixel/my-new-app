export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  authProvider: string | null;
  credits: number; // cache of the ledger balance
  plan: string; // free | starter | pro | studio
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planRenewsAt: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export type LedgerReason =
  | "purchase"
  | "subscription_grant"
  | "job_charge"
  | "refund"
  | "promo";

export interface LedgerEntry {
  id: string;
  userId: string;
  delta: number;
  reason: LedgerReason;
  jobId: string | null;
  stripePaymentIntent: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface AppendLedgerInput {
  userId: string;
  delta: number;
  reason: LedgerReason;
  jobId?: string | null;
  stripePaymentIntent?: string | null;
}

/**
 * AccountStore — users + the credit ledger. Credits change ONLY through
 * appendLedger, which computes the new balance and updates the users cache in
 * the same operation (a transaction in Postgres). A local file-backed store
 * mirrors it for dev with no database.
 */
export interface AccountStore {
  readonly backend: "postgres" | "local";
  upsertUserByEmail(input: {
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
    authProvider?: string | null;
  }): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, patch: Partial<User>): Promise<User | null>;
  /** Append a ledger row and update the balance atomically. Rejects a charge
   * that would drop the balance below zero. Returns the new balance. */
  appendLedger(input: AppendLedgerInput): Promise<{ balance: number; entry: LedgerEntry }>;
  getBalance(userId: string): Promise<number>;
  listLedger(userId: string, limit?: number): Promise<LedgerEntry[]>;
  /** Record a processed Stripe event id; returns true if newly recorded. */
  markStripeEvent(id: string): Promise<boolean>;

  /* ── API keys (Phase 8) ─────────────────────────────────────────────────── */
  createApiKey(input: { userId: string; keyHash: string; keyPrefix: string; name: string | null }): Promise<ApiKey>;
  listApiKeys(userId: string): Promise<ApiKey[]>;
  /** Look up an active (non-revoked) key by its hash for authentication. */
  findApiKeyByHash(keyHash: string): Promise<ApiKey | null>;
  revokeApiKey(userId: string, id: string): Promise<boolean>;
  touchApiKey(id: string): Promise<void>;
}

export interface ApiKey {
  id: string;
  userId: string;
  keyPrefix: string;
  name: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
