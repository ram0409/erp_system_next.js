import "server-only";

import { ConflictError, InternalError, NotFoundError, ValidationError } from "@/lib/errors";
import { Prisma } from "@generated/prisma/client";

/**
 * Translates Prisma failures into the application error hierarchy.
 *
 * A raw Prisma error is not safe to surface: its message embeds the failing SQL,
 * constraint names and sometimes parameter values. Everything here is mapped to a
 * user-safe message, with the technical text kept in `internalDetail` for the log.
 *
 * Unique violations are resolved back to the form field that caused them, so the
 * UI can highlight the offending input instead of showing a generic banner.
 */

interface FieldDescriptor {
  readonly field: string;
  readonly label: string;
}

/**
 * Maps the normalized companion columns back to the field a user actually typed.
 * `email_normalized` is what the index rejects; `email` is what the form shows.
 */
const UNIQUE_COLUMN_FIELDS: Readonly<Record<string, FieldDescriptor>> = {
  email_normalized: { field: "email", label: "Email address" },
  employee_code_normalized: { field: "employeeCode", label: "Employee code" },
  code_normalized: { field: "code", label: "Code" },
  name_normalized: { field: "name", label: "Name" },
  slug: { field: "slug", label: "Slug" },
  public_id: { field: "publicId", label: "Identifier" },
  token_hash: { field: "token", label: "Token" },
};

/** Composite indexes report every column; this names the pair meaningfully. */
const UNIQUE_INDEX_FIELDS: Readonly<Record<string, FieldDescriptor>> = {
  "entity_id,code_normalized": { field: "code", label: "Branch code" },
  "role_id,permission_id": { field: "permissionId", label: "Permission" },
  "module,action": { field: "action", label: "Permission" },
};

function readTargetColumns(meta: unknown): readonly string[] {
  if (typeof meta !== "object" || meta === null || !("target" in meta)) {
    return [];
  }

  const { target } = meta as { target?: unknown };

  if (Array.isArray(target)) {
    return target.filter((entry): entry is string => typeof entry === "string");
  }

  // Some connectors report the index name as a single string instead of columns.
  return typeof target === "string" ? [target] : [];
}

function describeUniqueTarget(meta: unknown): FieldDescriptor {
  const columns = readTargetColumns(meta);

  const composite = UNIQUE_INDEX_FIELDS[columns.join(",")];
  if (composite) {
    return composite;
  }

  for (const column of columns) {
    const single = UNIQUE_COLUMN_FIELDS[column];
    if (single) {
      return single;
    }
  }

  return { field: "root", label: "This value" };
}

function readModelName(meta: unknown): string | null {
  if (typeof meta !== "object" || meta === null || !("modelName" in meta)) {
    return null;
  }
  const { modelName } = meta as { modelName?: unknown };
  return typeof modelName === "string" ? modelName : null;
}

/**
 * @param context Short description of the attempted operation, for the log only.
 */
export function translatePrismaError(error: unknown, context: string): Error {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    // Connection failures, validation errors and genuine bugs all land here. The
    // caller sees a generic message; the log keeps the detail.
    if (error instanceof Error) {
      return new InternalError({
        internalDetail: `${context}: ${error.name} ${error.message}`,
        cause: error,
      });
    }
    return new InternalError({ internalDetail: `${context}: non-error thrown`, cause: error });
  }

  const detail = `${context}: Prisma ${error.code} ${error.message}`;

  switch (error.code) {
    case "P2002": {
      const { field, label } = describeUniqueTarget(error.meta);
      const message = `${label} is already in use.`;
      return new ConflictError(message, {
        fieldErrors: [{ field, message }],
        internalDetail: detail,
        cause: error,
      });
    }

    case "P2003":
    case "P2014": {
      return new ValidationError("A related record is missing or invalid.", {
        internalDetail: detail,
        cause: error,
      });
    }

    // Restrict on User.branchId / User.roleId surfaces here: the record is still
    // referenced, which is exactly the deletion we want to refuse.
    case "P2011": {
      return new ValidationError("A required value is missing.", {
        internalDetail: detail,
        cause: error,
      });
    }

    case "P2000": {
      return new ValidationError("A value is longer than the field allows.", {
        internalDetail: detail,
        cause: error,
      });
    }

    case "P2025": {
      const model = readModelName(error.meta);
      return new NotFoundError(model ? `${model} was not found.` : "The record was not found.", {
        internalDetail: detail,
        cause: error,
      });
    }

    // Driver/auth failures. Do not attach the Prisma error as `cause`: Next's
    // overlay would print the failing invocation, including the database user.
    case "P1000":
    case "P1001":
    case "P1017": {
      return new InternalError({ internalDetail: detail });
    }

    default: {
      return new InternalError({ internalDetail: detail, cause: error });
    }
  }
}

/** True when the failure is a unique violation, for callers that retry or upsert. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** True when a delete or update matched no row. */
export function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

/**
 * Wraps a repository call so every thrown Prisma error becomes an AppError.
 * Repositories use this instead of try/catch at each call site.
 */
export async function withPrismaErrors<T>(context: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw translatePrismaError(error, context);
  }
}
