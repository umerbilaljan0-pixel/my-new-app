import { getSessionUserFromCookies } from "@/lib/auth/session";
import { ApiKeys } from "@/components/app/ApiKeys";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const session = await getSessionUserFromCookies();
  if (!session) return null; // layout redirects
  return <ApiKeys />;
}
