import { getSessionUserFromCookies } from "@/lib/auth/session";
import { jobStore } from "@/lib/db/store";
import { JobList } from "@/components/app/JobList";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getSessionUserFromCookies();
  if (!session) return null;

  const jobs = await (await jobStore()).listByUser(session.userId, 50);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-lg font-semibold text-ink">History</h1>
        <p className="text-2xs text-ink-low">Your processed images, re-downloadable for 30 days.</p>
      </div>
      <JobList jobs={jobs} emptyHint="Nothing processed yet — try a tool to see it here." />
    </div>
  );
}
