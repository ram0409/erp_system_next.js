import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** The dashboard layout decides whether the visitor is sent on to sign in. */
export default function RootPage() {
  redirect(ROUTES.DASHBOARD);
}
