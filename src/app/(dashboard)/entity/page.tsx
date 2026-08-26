import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** Entity now lives under Administration. */
export default function EntityRedirectPage() {
  redirect(ROUTES.ENTITY);
}
