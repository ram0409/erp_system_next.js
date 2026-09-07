import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** Customers moved under Customer Management. Keep the old path from bookmarking a 404. */
export default function AdministrationCustomersRedirectPage() {
  redirect(ROUTES.CUSTOMERS);
}
