import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Groups related fields. Two columns from the `sm` breakpoint up, one column
 * below it — the responsive form requirement lives here rather than in each form.
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {title ? (
        <div className="space-y-0.5">
          <h2 className="text-foreground text-sm font-semibold">{title}</h2>
          {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
