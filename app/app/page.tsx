import Link from "next/link";
import { Eraser, Scissors, Maximize2, Coins } from "lucide-react";
import { getSessionUserFromCookies } from "@/lib/auth/session";
import { accountStore } from "@/lib/db/accounts";
import { jobStore } from "@/lib/db/store";
import { JobList } from "@/components/app/JobList";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSessionUserFromCookies();
  if (!session) return null; // layout redirects

  const [accounts, jobs] = await Promise.all([accountStore(), jobStore()]);
  const [user, recent] = await Promise.all([
    accounts.getUserById(session.userId),
    jobs.listByUser(session.userId, 6),
  ]);
  const credits = user?.credits ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-5">
          <span className="label-eyebrow">Credits</span>
          <span className="tabular text-xl font-semibold text-ink">{credits}</span>
          <Link href="/app/billing" className="mt-1 inline-flex items-center gap-1 text-2xs font-semibold text-amber-press">
            <Coins size={13} /> Get more
          </Link>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-5">
          <span className="label-eyebrow">Plan</span>
          <span className="text-xl font-semibold capitalize text-ink">{user?.plan ?? "free"}</span>
          <span className="text-2xs text-ink-low">{session.email}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-5">
          <span className="label-eyebrow">Jobs</span>
          <span className="tabular text-xl font-semibold text-ink">{recent.length}</span>
          <Link href="/app/history" className="mt-1 text-2xs font-semibold text-amber-press">View history</Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Start a tool</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/remove-watermark", label: "Erase", Icon: Eraser },
            { href: "/remove-background", label: "Cut Out", Icon: Scissors },
            { href: "/upscale-image", label: "Upscale", Icon: Maximize2 },
          ].map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface p-4 text-sm font-semibold text-ink transition-colors hover:border-line-strong hover:bg-sunken"
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-tint text-amber-press">
                <Icon size={18} />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Recent jobs</h2>
        <JobList jobs={recent} />
      </div>
    </div>
  );
}
