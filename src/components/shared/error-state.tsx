"use client";

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ERROR_MESSAGES } from "@/constants/messages";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  /** Only ever pass a sanitized, user-safe message here. */
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = ERROR_MESSAGES.GENERIC,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="bg-destructive/10 flex size-11 items-center justify-center rounded-full">
        <AlertTriangleIcon className="text-destructive size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCwIcon />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
