"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { WorkspaceSwitch } from "@/components/layout/workspace-switch";
import type { NavItem } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { signOutAction } from "@/features/auth/actions";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import type { SessionUser } from "@/types/session";
import type { WorkspaceSwitcher } from "@/types/workspace";

interface AppHeaderProps {
  user: SessionUser;
  navItems: readonly NavItem[];
  companyName: string;
  logoUrl?: string | null;
  workspace: WorkspaceSwitcher;
}

export function AppHeader({ user, navItems, companyName, logoUrl, workspace }: AppHeaderProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      // The cookie is cleared server-side either way, so the client navigates to
      // the login page even if the audit write failed.
      await signOutAction({});
      router.refresh();
      router.replace(ROUTES.LOGIN);
    });
  };

  return (
    <header className="border-border/80 bg-background/80 supports-backdrop-filter:bg-background/70 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur-md sm:px-4">
      <MobileNav items={navItems} companyName={companyName} logoUrl={logoUrl} />

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <WorkspaceSwitch workspace={workspace} />

        <ThemeToggle />

        <NotificationBell />

        <UserMenu user={user} onSignOut={handleSignOut} />
      </div>
    </header>
  );
}
