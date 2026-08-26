import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { PageContainer } from "@/components/layout/page-container";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import { SessionExpiryGuard } from "@/components/providers/session-expiry-guard";
import { LoadingState } from "@/components/shared/loading-state";
import { Card } from "@/components/ui/card";
import { publicEnv } from "@/config/public-env";
import { CURRENT_PATH_HEADER } from "@/constants/auth";
import { NAVIGATION, filterNavigation } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { permissionChecker, toPermissionSnapshot } from "@/lib/authorization";
import { loginHref } from "@/lib/login-href";
import { getActorContext, getSessionExpiresAt, requiresPasswordChange } from "@/lib/session";
import { getWorkspaceSwitcher } from "@/services/workspace-service";

function PageFallback() {
  return (
    <PageContainer>
      <Card>
        <LoadingState />
      </Card>
    </PageContainer>
  );
}

/**
 * The authorization boundary for every authenticated screen.
 *
 * The actor is resolved once here and reused by the pages below through React's
 * request cache. Navigation is filtered on the server, so links the actor cannot
 * use are never rendered into the HTML — while each page and action still
 * re-checks its own permission independently.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const currentPath = headerList.get(CURRENT_PATH_HEADER);
  const actor = await getActorContext();

  if (!actor) {
    redirect(loginHref(currentPath));
  }

  // An account still on its generated password is confined to the change-password
  // screen. Enforced in the layout so every authenticated route inherits it,
  // rather than relying on each page to remember.
  if (await requiresPasswordChange()) {
    if (currentPath !== ROUTES.CHANGE_PASSWORD) {
      redirect(ROUTES.CHANGE_PASSWORD);
    }
  }

  const navItems = filterNavigation(NAVIGATION, permissionChecker(actor));
  const appName = publicEnv.NEXT_PUBLIC_APP_NAME;
  const workspace = await getWorkspaceSwitcher(actor);
  const sessionExpiresAt = await getSessionExpiresAt();

  return (
    <PermissionsProvider value={toPermissionSnapshot(actor)}>
      {sessionExpiresAt ? <SessionExpiryGuard expiresAt={sessionExpiresAt.toISOString()} /> : null}
      <NavigationProgress />
      <div className="app-canvas flex min-h-dvh">
        <AppSidebar items={navItems} appName={appName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            user={actor.user}
            navItems={navItems}
            appName={appName}
            workspace={workspace}
          />
          <main id="main-content" className="flex-1">
            <Suspense fallback={<PageFallback />}>{children}</Suspense>
          </main>
        </div>
      </div>
    </PermissionsProvider>
  );
}
