import { InboxIcon, SearchXIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Distinguishes "nothing exists yet" from "your filters matched nothing". */
  variant?: "empty" | "no-results";
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  variant = "empty",
  action,
  className,
}: EmptyStateProps) {
  const Icon = variant === "no-results" ? SearchXIcon : InboxIcon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="bg-primary/10 flex size-11 items-center justify-center rounded-full">
        <Icon className="text-primary size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
