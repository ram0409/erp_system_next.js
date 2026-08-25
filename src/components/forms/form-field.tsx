import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  /** Must match the control's id so the label activates the correct input. */
  htmlFor: string;
  label: string;
  children: ReactNode;
  required?: boolean;
  /** Server- or client-side validation message for this field. */
  error?: string;
  hint?: string;
  className?: string;
  /** Spans both columns of a two-column form grid. */
  fullWidth?: boolean;
  /** Keeps the label for assistive tech while the visible cue lives in the control. */
  hideLabel?: boolean;
}

/**
 * One labelled control with its hint and error slot. The error is wired to the
 * input through aria-describedby by convention: controls set
 * `aria-invalid` and `aria-describedby={`${id}-error`}`.
 */
export function FormField({
  htmlFor,
  label,
  children,
  required = false,
  error,
  hint,
  className,
  fullWidth = false,
  hideLabel = false,
}: FormFieldProps) {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;

  return (
    <div className={cn("space-y-1.5", fullWidth && "sm:col-span-2", className)}>
      <Label htmlFor={htmlFor} required={required} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-xs font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}
