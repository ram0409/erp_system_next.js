"use client";

import { ChevronDownIcon, LogOutIcon, ShieldIcon, UserIcon } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants/routes";
import type { SessionUser } from "@/types/session";
import { formatFullName, getInitials } from "@/utils/format";

interface UserMenuProps {
  user: SessionUser;
  onSignOut?: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const fullName = formatFullName(user.firstName, user.lastName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-sidebar-accent focus-visible:ring-sidebar-accent-foreground/40 flex items-center gap-2 rounded-lg px-2 py-1 text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Open user menu"
        >
          <Avatar className="size-5">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={fullName} /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-[0.625rem]">
              {getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-36 truncate text-sm font-medium tracking-tight text-white">
              {fullName}
            </span>
            <span className="block max-w-36 truncate text-xs text-white/70">
              {user.role.name}
            </span>
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-white/70" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-60" align="end">
        <DropdownMenuLabel>
          <span className="text-foreground block truncate text-sm font-medium">{fullName}</span>
          <span className="text-muted-foreground block truncate text-xs font-normal">
            {user.email}
          </span>
          <span className="text-muted-foreground mt-1 block truncate text-xs font-normal">
            {user.branch.name} · {user.role.name}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.PROFILE}>
            <UserIcon />
            My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.SETTINGS_SECURITY}>
            <ShieldIcon />
            Security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onSignOut} disabled={!onSignOut}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
