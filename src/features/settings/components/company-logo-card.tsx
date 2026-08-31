"use client";

import { CameraIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { SETTINGS_MESSAGES } from "@/constants/messages";
import { removeCompanyLogoAction, uploadCompanyLogoAction } from "@/features/settings/actions";
import { logoRejectionMessage } from "@/lib/logo";
import { cn } from "@/lib/utils";

interface CompanyLogoCardProps {
  readonly companyName: string;
  readonly logoUrl: string | null;
  readonly canEdit: boolean;
}

export function CompanyLogoCard({ companyName, logoUrl, canEdit }: CompanyLogoCardProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const displayUrl = previewUrl ?? logoUrl;
  const mark = companyName.trim().charAt(0).toUpperCase() || "C";

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

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    startTransition(async () => {
      const result = await uploadCompanyLogoAction({ file });
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
      const result = await removeCompanyLogoAction({});
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
            <div
              className={cn(
                "bg-muted flex h-20 w-36 items-center justify-center overflow-hidden rounded-xl border",
                displayUrl ? "border-border" : "border-transparent",
              )}
            >
              {displayUrl ? (
                // Object-URL preview and /uploads files; next/image does not accept blob: URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayUrl}
                  alt={`${companyName} logo`}
                  className="size-full object-contain p-1.5"
                />
              ) : (
                <span className="brand-fill flex size-12 items-center justify-center rounded-lg text-lg font-semibold text-white">
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
                  aria-label="Upload company logo"
                  className="brand-fill focus-visible:ring-ring absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full shadow-none focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                >
                  {isPending ? (
                    <Spinner className="size-4" label="Saving logo" />
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
              </>
            ) : null}
          </div>

          <div className="min-w-0">
            <h2 className="text-foreground text-sm font-semibold">Company logo</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Shown in the sidebar. JPG, PNG or WEBP, up to 2 MB.
            </p>
            {canEdit && logoUrl ? (
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
      </CardContent>
    </Card>
  );
}
