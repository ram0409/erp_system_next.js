import type { FieldError } from "@/lib/errors";

/**
 * Maps action `FieldError` rows onto react-hook-form `setError` calls.
 * Root / missing field names are skipped; callers still set the banner message.
 */
export function applyServerFieldErrors<TField extends string>(
  errors: readonly FieldError[],
  setError: (name: TField, error: { type: string; message: string }) => void,
): void {
  for (const fieldError of errors) {
    if (fieldError.field && fieldError.field !== "root") {
      setError(fieldError.field as TField, {
        type: "server",
        message: fieldError.message,
      });
    }
  }
}
