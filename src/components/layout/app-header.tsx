"use client";

import { BellIcon, Building2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NavItem } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { signOutAction } from "@/features/auth/actions";
import type { SessionUser } from "@/types/session";

interface AppHeaderProps {
  user: SessionUser;
  navItems: readonly NavItem[];
  appName: string;
}

export function AppHeader({ user, navItems, appName }: AppHeaderProps) {
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

  const branchLabel = `${user.branch.name} (${user.branch.code})`;

  return (
    <header className="border-border/70 bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur-md sm:px-4">
      <MobileNav items={navItems} appName={appName} />

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2">
        <p
          className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm"
          title={branchLabel}
        >
          <Building2Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">Branch</span>
          <span className="max-w-28 truncate font-medium sm:max-w-48">{user.branch.name}</span>
        </p>

        <ThemeToggle />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications" disabled>
              <BellIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications — coming soon</TooltipContent>
        </Tooltip>

        <UserMenu user={user} onSignOut={handleSignOut} />
      </div>
    </header>
  );
}
