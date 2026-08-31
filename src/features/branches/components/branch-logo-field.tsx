"use client";

import { CameraIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { SETTINGS_MESSAGES } from "@/constants/messages";
import { removeBranchLogoAction, uploadBranchLogoAction } from "@/features/branches/actions";
import { logoRejectionMessage } from "@/lib/logo";
import { cn } from "@/lib/utils";

interface BranchLogoFieldProps {
  readonly branchName: string;
  readonly logoUrl: string | null;
  readonly publicId?: string;
  readonly canEdit: boolean;
  readonly onPendingFileChange: (file: File | null) => void;
  readonly onSaved?: (logoUrl: string | null) => void;
}

export function BranchLogoField({
  branchName,
  logoUrl,
  publicId,
  canEdit,
  onPendingFileChange,
  onSaved,
}: BranchLogoFieldProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const displayUrl = previewUrl ?? logoUrl;
  const mark = branchName.trim().charAt(0).toUpperCase() || "B";

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const rejection = logoRejectionMessage(file);
    if (rejection) {
      toast.error(rejection);
      return;
    }

    if (!publicId) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return objectUrl;
      });
      onPendingFileChange(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    startTransition(async () => {
      const result = await uploadBranchLogoAction({ publicId, file });
      URL.revokeObjectURL(objectUrl);

      if (!result.success) {
        setPreviewUrl(null);
        toast.error(result.message);
        return;
      }

      setPreviewUrl(null);
      toast.success(result.message);
      onSaved?.(result.data.logoUrl);
      router.refresh();
    });
  }

  function handleRemove() {
    if (!publicId) {
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      onPendingFileChange(null);
      return;
    }

    startTransition(async () => {
      const result = await removeBranchLogoAction({ publicId });
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setPreviewUrl(null);
      toast.success(result.message);
      onSaved?.(null);
      router.refresh();
    });
  }

  const showRemove = canEdit && Boolean(displayUrl);

  return (
    <div className="flex min-w-0 items-center gap-4 sm:col-span-2">
      <div className="relative shrink-0">
        <div
          className={cn(
            "bg-muted flex h-16 w-28 items-center justify-center overflow-hidden rounded-xl border",
            displayUrl ? "border-border" : "border-transparent",
          )}
        >
          {displayUrl ? (
            // Object-URL preview and /uploads files; next/image does not accept blob: URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt={`${branchName || "Branch"} logo`}
              className="size-full object-cover"
            />
          ) : (
            <span className="brand-fill flex size-10 items-center justify-center rounded-lg text-sm font-semibold text-white">
              {mark}
            </span>
          )}
        </div>
        {canEdit ? (
          <>
            <button
              type="button"
              onClick={openFilePicker}
              disabled={isPending}
              aria-label="Upload branch logo"
              className="brand-fill focus-visible:ring-ring absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full shadow-none focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
            >
              {isPending ? (
                <Spinner className="size-3.5" label="Saving logo" />
              ) : (
                <CameraIcon className="size-3.5" />
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
          </>
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="text-foreground text-sm font-medium">Branch logo</p>
        <p className="text-muted-foreground mt-0.5 text-xs">JPG, PNG or WEBP, up to 2 MB.</p>
        {showRemove ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive mt-2 inline-flex items-center gap-1 text-xs font-medium disabled:opacity-60"
          >
            <Trash2Icon className="size-3.5" aria-hidden="true" />
            Remove logo
          </button>
        ) : canEdit ? (
          <p className="text-muted-foreground mt-2 text-xs">{SETTINGS_MESSAGES.LOGO_TYPE}</p>
        ) : null}
      </div>
    </div>
  );
}
