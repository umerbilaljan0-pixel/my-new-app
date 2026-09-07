/**
 * Auth configuration flags. Google OAuth activates when its client id/secret are
 * present; otherwise a dev email login is offered so the app is usable and
 * testable without any external identity provider.
 */
export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Dev login is the fallback when Google isn't configured (self-host / local).
 * It can be force-disabled with DISABLE_DEV_LOGIN=true. */
export function isDevLoginEnabled(): boolean {
  if (process.env.DISABLE_DEV_LOGIN === "true") return false;
  return !isGoogleConfigured();
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
