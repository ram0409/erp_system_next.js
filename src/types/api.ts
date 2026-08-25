import type { ErrorCode, FieldError } from "@/lib/errors";

/**
 * Every server action and route handler returns this envelope. A discriminated
 * union means a caller cannot read `data` without first proving success.
 */
export interface SuccessResult<TData> {
  readonly success: true;
  readonly message: string;
  readonly data: TData;
}

export interface FailureResult {
  readonly success: false;
  readonly message: string;
  readonly errors: readonly FieldError[];
  readonly code: ErrorCode;
  /** Present on rate-limit failures so the client can back off without guessing. */
  readonly retryAfterSeconds?: number;
}

export type ActionResult<TData = null> = SuccessResult<TData> | FailureResult;

export function success<TData>(data: TData, message = "Success"): SuccessResult<TData> {
  return { success: true, message, data };
}

export function failure(
  message: string,
  code: ErrorCode,
  errors: readonly FieldError[] = [],
  retryAfterSeconds?: number,
): FailureResult {
  return {
    success: false,
    message,
    errors,
    code,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  };
}
