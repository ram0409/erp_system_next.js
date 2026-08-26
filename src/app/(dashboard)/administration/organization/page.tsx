import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** Company details live under Settings → Company Information. */
export default function OrganizationRedirectPage() {
  redirect(ROUTES.SETTINGS_GENERAL);
}
