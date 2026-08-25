/**
 * Shared redaction for logs and audit diffs. A leaked audit row or log line must
 * never contain a password, token or secret, so the rule lives in one place and
 * both writers go through it.
 */

const REDACTED_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "passwordhash",
  "token",
  "tokenhash",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
  "secret",
  "authsecret",
  "sessiontoken",
  "creditcard",
]);

export const REDACTION_PLACEHOLDER = "[redacted]";
const MAX_DEPTH = 6;

export function isRedactedKey(key: string): boolean {
  return REDACTED_KEYS.has(key.toLowerCase());
}

/** Recursively replaces credential-shaped keys. Used by the logger and audit writer. */
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) {
    return "[max depth]";
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitive(entry, depth + 1));
  }

  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = isRedactedKey(key)
        ? REDACTION_PLACEHOLDER
        : redactSensitive(entry, depth + 1);
    }
    return result;
  }

  return value;
}

/**
 * Field-level audit diffs go through this before they are stored. Returns a
 * JSON-safe value Prisma can write, or undefined when there is nothing to record.
 */
export function sanitizeAuditChanges(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  return redactSensitive(value);
}
