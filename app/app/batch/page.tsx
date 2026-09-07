import { getSessionUserFromCookies } from "@/lib/auth/session";
import { BatchGrid } from "@/components/tool/BatchGrid";

export const dynamic = "force-dynamic";

export default async function BatchPage() {
  const session = await getSessionUserFromCookies();
  if (!session) return null; // layout redirects
  return <BatchGrid />;
}
