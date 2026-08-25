import type * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-surface-muted flex h-10 w-full rounded-xl border px-3.5 py-1 text-sm shadow-none transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-ring/25 focus-visible:ring-2 focus-visible:outline-none",
        "disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-70",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25",
        "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}
