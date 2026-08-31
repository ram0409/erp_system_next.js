import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** Compatibility path. Entity is not an application module. */
export default function EntityRedirectPage() {
  redirect(ROUTES.BRANCHES);
}
