"use client";

import { ChevronDownIcon, KeyRoundIcon, LogOutIcon, UserIcon } from "lucide-react";
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
          className="hover:bg-accent focus-visible:ring-ring flex items-center gap-2 rounded-full py-1 pr-1.5 pl-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Open user menu"
        >
          <Avatar>
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={fullName} /> : null}
            <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left sm:block">
            <span className="block max-w-36 truncate text-sm font-medium">{fullName}</span>
            <span className="text-muted-foreground block max-w-36 truncate text-xs">
              {user.role.name}
            </span>
          </span>
          <ChevronDownIcon className="text-muted-foreground size-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-60">
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
          <Link href={ROUTES.CHANGE_PASSWORD}>
            <KeyRoundIcon />
            Change password
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
