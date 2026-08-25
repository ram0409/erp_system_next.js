"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Usually a `FormActions` element. Rendered outside the scroll area. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Set while submitting so the dialog cannot be dismissed mid-request. */
  isSubmitting?: boolean;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  isSubmitting = false,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent
        size={size}
        showCloseButton={!isSubmitting}
        onEscapeKeyDown={(event) => {
          if (isSubmitting) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          // Losing half-entered form data to a stray click is worse than an
          // extra deliberate close, so outside clicks never dismiss a form.
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
