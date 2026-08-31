import type * as React from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, rows = 3, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      data-slot="textarea"
      className={cn(
        "border-input bg-surface flex w-full rounded-lg border px-3 py-2 text-sm shadow-xs transition-[border-color,box-shadow] duration-200",
        "placeholder:text-muted-foreground",
        "hover:border-ring/40",
        "focus-visible:border-ring focus-visible:ring-ring/25 focus-visible:ring-2 focus-visible:outline-none",
        "disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-70",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25",
        className,
      )}
      {...props}
    />
  );
}
