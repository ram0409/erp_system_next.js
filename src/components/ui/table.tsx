import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The wrapper owns horizontal scrolling, which is how wide ERP tables stay
 * usable on tablet and mobile without collapsing into an unreadable layout.
 */
export function TableContainer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="table-container"
      className={cn("w-full scrollbar-thin overflow-x-auto", className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      data-slot="table"
      className={cn("w-full caption-bottom border-collapse text-sm", className)}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "bg-muted/80 [&_tr]:border-border [&_tr]:hover:bg-transparent [&_tr]:border-b",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-border hover:bg-surface-muted/80 data-[state=selected]:bg-accent border-b transition-colors",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "bg-muted/80 text-muted-foreground h-11 px-4 text-left align-middle text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase first:rounded-tl-lg last:rounded-tr-lg",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td data-slot="table-cell" className={cn("px-4 py-3 align-middle", className)} {...props} />
  );
}

export function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-3 text-sm", className)}
      {...props}
    />
  );
}
