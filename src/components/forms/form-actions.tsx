"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface FormActionsProps {
  /** Disables both controls and shows a spinner while the action is in flight. */
  isSubmitting: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  /** Blocks submission until the form is dirty, for edit screens. */
  disableSubmit?: boolean;
  /** Associates the submit button with a form rendered outside the footer. */
  form?: string;
  className?: string;
}

export function FormActions({
  isSubmitting,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  onCancel,
  disableSubmit = false,
  form,
  className,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:pt-0",
        className,
      )}
    >
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {cancelLabel}
        </Button>
      ) : null}
      {/*
        `disabled` while submitting is the duplicate-submission guard: a second
        click cannot reach the server action, so no second audit row is written.
      */}
      <Button type="submit" form={form} disabled={isSubmitting || disableSubmit}>
        {isSubmitting ? <Spinner label={submitLabel} /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}
