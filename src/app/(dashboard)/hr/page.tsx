import { redirect } from "next/navigation";

import { firstAccessibleGroupHref } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { permissionChecker } from "@/lib/authorization";
import { getActorContext } from "@/lib/session";

/** HR Management is a navigation group, not a screen of its own. */
export default async function HrHubPage() {
  const actor = await getActorContext();

  if (!actor) {
    redirect(ROUTES.LOGIN);
  }

  redirect(firstAccessibleGroupHref("hr", permissionChecker(actor)) ?? ROUTES.DASHBOARD);
}
