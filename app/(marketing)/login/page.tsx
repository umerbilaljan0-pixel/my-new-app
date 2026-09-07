import type { Metadata } from "next";
import { isGoogleConfigured, isDevLoginEnabled } from "@/lib/auth/config";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/app";
  return (
    <div className="container-page py-20">
      <LoginForm google={isGoogleConfigured()} dev={isDevLoginEnabled()} next={next} />
    </div>
  );
}
