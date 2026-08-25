import { ERROR_MESSAGES } from "@/constants/messages";

export const ERROR_CODES = {
  VALIDATION: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export interface AppErrorOptions {
  /** Technical context for the server log only. Never returned to a client. */
  readonly internalDetail?: string;
  readonly fieldErrors?: readonly FieldError[];
  readonly cause?: unknown;
}

/**
 * Base class for every expected failure. The distinction that matters:
 * `message` is safe to show a user, `internalDetail` never leaves the server.
 * Anything thrown that is *not* an AppError is treated as a bug and reported
 * to the client as a generic message.
 */
export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly statusCode: number;

  readonly fieldErrors: readonly FieldError[];
  readonly internalDetail: string | undefined;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.fieldErrors = options.fieldErrors ?? [];
    this.internalDetail = options.internalDetail;
  }
}

export class ValidationError extends AppError {
  readonly code = ERROR_CODES.VALIDATION;
  readonly statusCode = 422;

  constructor(message: string = ERROR_MESSAGES.VALIDATION, options: AppErrorOptions = {}) {
    super(message, options);
  }
}

export class UnauthorizedError extends AppError {
  readonly code = ERROR_CODES.UNAUTHORIZED;
  readonly statusCode = 401;

  constructor(message: string = ERROR_MESSAGES.UNAUTHENTICATED, options: AppErrorOptions = {}) {
    super(message, options);
  }
}

export class ForbiddenError extends AppError {
  readonly code = ERROR_CODES.FORBIDDEN;
  readonly statusCode = 403;

  constructor(message: string = ERROR_MESSAGES.FORBIDDEN, options: AppErrorOptions = {}) {
    super(message, options);
  }
}

export class NotFoundError extends AppError {
  readonly code = ERROR_CODES.NOT_FOUND;
  readonly statusCode = 404;

  constructor(message: string = ERROR_MESSAGES.NOT_FOUND, options: AppErrorOptions = {}) {
    super(message, options);
  }
}

export class ConflictError extends AppError {
  readonly code = ERROR_CODES.CONFLICT;
  readonly statusCode = 409;

  constructor(message: string = ERROR_MESSAGES.CONFLICT, options: AppErrorOptions = {}) {
    super(message, options);
  }
}

export class RateLimitError extends AppError {
  readonly code = ERROR_CODES.RATE_LIMITED;
  readonly statusCode = 429;
  readonly retryAfterSeconds: number;

  constructor(
    retryAfterSeconds: number,
    message: string = ERROR_MESSAGES.RATE_LIMITED,
    options: AppErrorOptions = {},
  ) {
    super(message, options);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class InternalError extends AppError {
  readonly code = ERROR_CODES.INTERNAL;
  readonly statusCode = 500;

  constructor(options: AppErrorOptions = {}) {
    super(ERROR_MESSAGES.GENERIC, options);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * A duplicate-key conflict phrased for the field that caused it, so the form can
 * highlight the offending input rather than showing a banner.
 */
export function duplicateFieldError(field: string, label: string): ConflictError {
  return new ConflictError(`${label} is already in use.`, {
    fieldErrors: [{ field, message: `${label} is already in use.` }],
  });
}
