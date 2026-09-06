/** Job pipeline constants (Sections 9.3 / 13). */
export const PREVIEW_LONG_EDGE = 1200; // free-tier download size
export const JOB_TIMEOUT_MS = 60_000; // fail a job that runs past 60s (Section 9.3)
export const JOB_MAX_ATTEMPTS = 3; // 1 try + 2 retries (Section 13)
export const OBJECT_TTL_HOURS = 24; // input+output purge window (Section 13)
