import { redirect } from "next/navigation";

import { firstAccessibleSettingsHref } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { permissionChecker } from "@/lib/authorization";
import { loginHref } from "@/lib/login-href";
import { getActorContext } from "@/lib/session";

/** Settings is a navigation group, not a screen of its own. */
export default async function SettingsPage() {
  const actor = await getActorContext();

  if (!actor) {
    redirect(loginHref(ROUTES.SETTINGS));
  }

  redirect(firstAccessibleSettingsHref(permissionChecker(actor)) ?? ROUTES.DASHBOARD);
}
