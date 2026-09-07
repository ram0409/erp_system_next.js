import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { clearTwoFactorPendingCookie } from "@/lib/two-factor-pending-cookie";

export const dynamic = "force-dynamic";

/** Clears an unfinished 2FA sign-in and returns to the login form. */
export async function GET() {
  await clearTwoFactorPendingCookie();
  redirect(ROUTES.LOGIN);
}
