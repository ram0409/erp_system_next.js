import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** Company details live under Settings → Company Details. */
export default function OrganizationRedirectPage() {
  redirect(ROUTES.SETTINGS_COMPANY);
}
