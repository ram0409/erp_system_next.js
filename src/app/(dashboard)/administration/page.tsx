import { redirect } from "next/navigation";

import { firstAccessibleAdminHref } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { permissionChecker } from "@/lib/authorization";
import { getActorContext } from "@/lib/session";

/** Administration is a navigation group, not a screen of its own. */
export default async function AdministrationPage() {
  const actor = await getActorContext();

  if (!actor) {
    redirect(ROUTES.LOGIN);
  }

  redirect(firstAccessibleAdminHref(permissionChecker(actor)) ?? ROUTES.DASHBOARD);
}