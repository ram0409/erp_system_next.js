import { redirect } from "next/navigation";

import { firstAccessibleCustomerManagementHref } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { permissionChecker } from "@/lib/authorization";
import { loginHref } from "@/lib/login-href";
import { getActorContext } from "@/lib/session";

/** Customer Management is a navigation group, not a screen of its own. */
export default async function CustomerManagementPage() {
  const actor = await getActorContext();

  if (!actor) {
    redirect(loginHref(ROUTES.CUSTOMER_MANAGEMENT));
  }

  redirect(firstAccessibleCustomerManagementHref(permissionChecker(actor)) ?? ROUTES.DASHBOARD);
}
