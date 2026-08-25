/**
 * Normalization for the lowercase companion columns that back case-insensitive
 * unique indexes. The seed, the repositories and every lookup must produce
 * byte-identical output, otherwise "Admin@x.com" and "admin@x.com" become two
 * accounts — so this is the only place the rule is written.
 */

/** Lowercase and collapse whitespace. Used for codes, slugs and names. */
export function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Emails additionally have all internal whitespace removed: no valid address
 * contains a space, and a stray one would otherwise create a near-duplicate.
 */
export function normalizeEmail(value: string): string {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

/** Codes are compared without separators so "HO-01" and "ho01" cannot coexist. */
export function normalizeCode(value: string): string {
  return value
    .trim()
    .replace(/[\s_-]+/g, "")
    .toLowerCase();
}

/**
 * Stable URL-safe identifier. Consecutive separators collapse so "Sales  Manager"
 * and "sales-manager" cannot coexist as two slugs.
 */
export function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}
