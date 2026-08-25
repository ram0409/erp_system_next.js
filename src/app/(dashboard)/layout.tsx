import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import { publicEnv } from "@/config/public-env";
import { CURRENT_PATH_HEADER } from "@/constants/auth";
import { NAVIGATION, filterNavigation } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { permissionChecker, toPermissionSnapshot } from "@/lib/authorization";
import { getActorContext, requiresPasswordChange } from "@/lib/session";

/**
 * The authorization boundary for every authenticated screen.
 *
 * The actor is resolved once here and reused by the pages below through React's
 * request cache. Navigation is filtered on the server, so links the actor cannot
 * use are never rendered into the HTML — while each page and action still
 * re-checks its own permission independently.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const actor = await getActorContext();

  if (!actor) {
    redirect(ROUTES.LOGIN);
  }

  // An account still on its generated password is confined to the change-password
  // screen. Enforced in the layout so every authenticated route inherits it,
  // rather than relying on each page to remember.
  if (await requiresPasswordChange()) {
    const headerList = await headers();
    const currentPath = headerList.get(CURRENT_PATH_HEADER);

    if (currentPath !== ROUTES.CHANGE_PASSWORD) {
      redirect(ROUTES.CHANGE_PASSWORD);
    }
  }

  const navItems = filterNavigation(NAVIGATION, permissionChecker(actor));
  const appName = publicEnv.NEXT_PUBLIC_APP_NAME;

  return (
    <PermissionsProvider value={toPermissionSnapshot(actor)}>
      <div className="app-canvas flex min-h-dvh">
        <AppSidebar items={navItems} appName={appName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader user={actor.user} navItems={navItems} appName={appName} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </PermissionsProvider>
  );
}
