import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ROUTES } from "@/constants/routes";
import { ProfileWorkspace } from "@/features/profile/components/profile-workspace";
import { getActorContext } from "@/lib/session";

export const metadata: Metadata = { title: "My profile" };

/** Own-account view: no module permission required, only a valid session. */
export default async function ProfilePage() {
  const actor = await getActorContext();

  if (!actor) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <PageContainer>
      <PageHeader title="My profile" description="Your account details and assignments." />
      <ProfileWorkspace user={actor.user} />
    </PageContainer>
  );
}
