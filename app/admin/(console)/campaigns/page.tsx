import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import CampaignManager from "@/components/CampaignManager";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const auth = await requireUser(["SUPER_ADMIN"]);
  if (!auth.ok) redirect("/admin");
  if (auth.user.mustChangePassword) redirect("/settings/change-password?forced=1");
  return <CampaignManager />;
}
