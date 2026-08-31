import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** Entity is not an application module. Keep the old path from bookmarking a 404. */
export default function EntityPage() {
  redirect(ROUTES.BRANCHES);
}
