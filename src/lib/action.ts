import "server-only";

import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import { ERROR_MESSAGES } from "@/constants/messages";
import type { PermissionKey } from "@/constants/permissions";
import { assertPermission, requireActor } from "@/lib/authorization";
import {
  InternalError,
  RateLimitError,
  ValidationError,
  isAppError,
  type FieldError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getRequestIp } from "@/lib/request";
import { getActorContext } from "@/lib/session";
import { failure, success, type ActionResult, type FailureResult } from "@/types/api";
import type { ActorContext } from "@/types/session";

/**
 * The single entry point for every mutation. Authentication, authorization,
 * input validation, error sanitization and logging happen here exactly once,
 * so an individual action cannot forget one of them.
 *
 * Order matters: authenticate, then authorize, then validate. Validating first
 * would let an unauthenticated caller probe the shape of internal schemas.
 */

function zodIssuesToFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.map((segment) => String(segment)).join(".") || "root",
    message: issue.message,
  }));
}

/**
 * Converts any thrown value into the client-facing envelope. Expected failures
 * keep their message; anything else becomes a generic message and a server log,
 * so stack traces, SQL text and Prisma internals never reach the browser.
 */
export function mapErrorToFailure(error: unknown, actionName: string): FailureResult {
  if (isAppError(error)) {
    const context = {
      action: actionName,
      code: error.code,
      ...(error.internalDetail ? { detail: error.internalDetail } : {}),
    };

    if (error.statusCode >= 500) {
      logger.error(`Action failed: ${actionName}`, { ...context, error });
    } else {
      logger.warn(`Action rejected: ${actionName}`, context);
    }

    if (error instanceof RateLimitError) {
      return failure(error.message, error.code, error.fieldErrors, error.retryAfterSeconds);
    }

    return failure(error.message, error.code, error.fieldErrors);
  }

  const internal = new InternalError({ cause: error });
  logger.error(`Unhandled error in action: ${actionName}`, { action: actionName, error });
  return failure(internal.message, internal.code);
}

interface BaseActionConfig<TSchema extends z.ZodType, TOutput> {
  /** Used in logs and error reports; keep it stable and specific. */
  readonly name: string;
  readonly schema: TSchema;
  readonly successMessage?: string;
  readonly handler: (input: z.output<TSchema>, actor: ActorContext) => Promise<TOutput>;
}

interface GuardedActionConfig<TSchema extends z.ZodType, TOutput> extends BaseActionConfig<
  TSchema,
  TOutput
> {
  /** All listed permissions are required, not any of them. */
  readonly permission: PermissionKey | readonly PermissionKey[];
}

export interface PublicActionContext {
  readonly ipAddress: string | null;
}

interface PublicActionConfig<TSchema extends z.ZodType, TOutput> {
  readonly name: string;
  readonly schema: TSchema;
  readonly successMessage?: string;
  readonly handler: (input: z.output<TSchema>, context: PublicActionContext) => Promise<TOutput>;
}

type ActionFunction<TSchema extends z.ZodType, TOutput> = (
  raw: z.input<TSchema>,
) => Promise<ActionResult<TOutput>>;

function parseInput<TSchema extends z.ZodType>(schema: TSchema, raw: unknown): z.output<TSchema> {
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    throw new ValidationError(ERROR_MESSAGES.VALIDATION, {
      fieldErrors: zodIssuesToFieldErrors(parsed.error),
    });
  }

  return parsed.data as z.output<TSchema>;
}

/** A mutation that requires a session and a specific permission. */
export function defineAction<TSchema extends z.ZodType, TOutput>(
  config: GuardedActionConfig<TSchema, TOutput>,
): ActionFunction<TSchema, TOutput> {
  return async (raw) => {
    try {
      const actor = assertPermission(await getActorContext(), config.permission);
      const input = parseInput(config.schema, raw);
      const data = await config.handler(input, actor);
      return success(data, config.successMessage ?? "Success");
    } catch (error) {
      // Next.js uses thrown values for redirect/notFound. Swallowing them here
      // would turn a successful sign-in cookie write into INTERNAL_ERROR.
      unstable_rethrow(error);
      return mapErrorToFailure(error, config.name);
    }
  };
}

/**
 * A mutation that requires a session but no module permission — used for actions
 * on the actor's own account, such as changing their own password.
 */
export function defineAuthenticatedAction<TSchema extends z.ZodType, TOutput>(
  config: BaseActionConfig<TSchema, TOutput>,
): ActionFunction<TSchema, TOutput> {
  return async (raw) => {
    try {
      const actor = requireActor(await getActorContext());
      const input = parseInput(config.schema, raw);
      const data = await config.handler(input, actor);
      return success(data, config.successMessage ?? "Success");
    } catch (error) {
      // Next.js uses thrown values for redirect/notFound. Swallowing them here
      // would turn a successful sign-in cookie write into INTERNAL_ERROR.
      unstable_rethrow(error);
      return mapErrorToFailure(error, config.name);
    }
  };
}

/**
 * An unauthenticated action: login, forgot password, reset password. These carry
 * their own rate limiting inside the handler and must never reveal whether an
 * account exists.
 */
export function definePublicAction<TSchema extends z.ZodType, TOutput>(
  config: PublicActionConfig<TSchema, TOutput>,
): ActionFunction<TSchema, TOutput> {
  return async (raw) => {
    try {
      const input = parseInput(config.schema, raw);
      const data = await config.handler(input, { ipAddress: await getRequestIp() });
      return success(data, config.successMessage ?? "Success");
    } catch (error) {
      // Next.js uses thrown values for redirect/notFound. Swallowing them here
      // would turn a successful sign-in cookie write into INTERNAL_ERROR.
      unstable_rethrow(error);
      return mapErrorToFailure(error, config.name);
    }
  };
}
