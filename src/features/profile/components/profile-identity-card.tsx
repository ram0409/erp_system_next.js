"use client";

import { CameraIcon, KeyRoundIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/constants/routes";
import { PROFILE_MESSAGES } from "@/constants/messages";
import { removeAvatarAction, uploadAvatarAction } from "@/features/profile/actions";
import { avatarRejectionMessage } from "@/lib/avatar";
import type { SessionUser } from "@/types/session";
import { EMPTY_VALUE_PLACEHOLDER, formatFullName, getInitials } from "@/utils/format";

interface ProfileIdentityCardProps {
  readonly user: SessionUser;
}

export function ProfileIdentityCard({ user }: ProfileIdentityCardProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fullName = formatFullName(user.firstName, user.lastName);
  const designation = user.designation?.trim() || EMPTY_VALUE_PLACEHOLDER;
  const displayUrl = previewUrl ?? user.avatarUrl;

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const rejection = avatarRejectionMessage(file);
    if (rejection) {
      toast.error(rejection);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    startTransition(async () => {
      const result = await uploadAvatarAction({ file });
      URL.revokeObjectURL(objectUrl);

      if (!result.success) {
        setPreviewUrl(null);
        toast.error(result.message);
        return;
      }

      setPreviewUrl(null);
      toast.success(result.message);
      router.refresh();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeAvatarAction({});
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setPreviewUrl(null);
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            <Avatar className="size-24 sm:size-28">
              {displayUrl ? <AvatarImage src={displayUrl} alt={fullName} /> : null}
              <AvatarFallback className="brand-fill text-2xl text-white shadow-none">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={openFilePicker}
              disabled={isPending}
              aria-label="Upload profile photo"
              className="brand-fill focus-visible:ring-ring absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full shadow-none focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
            >
              {isPending ? (
                <Spinner className="size-4" label="Saving photo" />
              ) : (
                <CameraIcon className="size-4" />
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isPending}
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-foreground truncate text-xl font-semibold tracking-tight">
                {fullName}
              </h2>
              <StatusBadge status={user.status} />
              {user.role.isSuperAdmin ? <Badge variant="info">Super Admin</Badge> : null}
            </div>
            <p className="text-muted-foreground mt-1 truncate text-sm">{user.email}</p>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">
              {designation}
              <span className="text-border mx-1.5">·</span>
              {user.role.name}
              <span className="text-border mx-1.5">·</span>
              {user.branch.name}
            </p>
            {user.avatarUrl ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive mt-2 inline-flex items-center gap-1 text-xs font-medium disabled:opacity-60"
              >
                <Trash2Icon className="size-3.5" aria-hidden="true" />
                Remove photo
              </button>
            ) : (
              <p className="text-muted-foreground mt-2 text-xs">{PROFILE_MESSAGES.AVATAR_TYPE}</p>
            )}
          </div>
        </div>

        <Button asChild className="shrink-0 self-start sm:self-auto">
          <Link href={ROUTES.CHANGE_PASSWORD}>
            <KeyRoundIcon />
            Change password
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
