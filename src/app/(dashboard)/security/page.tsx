import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** Security settings live under Settings → Security. */
export default function SecurityRedirectPage() {
  redirect(ROUTES.SETTINGS_SECURITY);
}
