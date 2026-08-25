"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Edge-anchored panel. Used for the mobile navigation drawer and for record
 * forms on narrow screens, where a centred dialog wastes vertical space.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

interface SheetContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  side?: "left" | "right";
  showCloseButton?: boolean;
}

export function SheetContent({
  className,
  children,
  side = "left",
  showCloseButton = true,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "bg-foreground/40 fixed inset-0 z-50",
          "data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out",
        )}
      />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 z-50 flex h-full w-[17.5rem] max-w-[85vw] flex-col shadow-xl outline-none",
          side === "left" ? "left-0" : "right-0",
          side === "left"
            ? "data-[state=open]:animate-slide-in-left data-[state=closed]:animate-slide-out-left"
            : "data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            className="focus-visible:ring-ring absolute top-3.5 right-3.5 rounded-full text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Close navigation"
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
