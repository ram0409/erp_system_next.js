import { hash, verify } from "@node-rs/argon2";

import { PASSWORD_RULES } from "@/constants/auth";

/**
 * Password hashing with Argon2id.
 *
 * Parameters follow the OWASP Password Storage recommendation (m=19 MiB, t=2,
 * p=1) and are stated explicitly rather than left to library defaults, so an
 * upstream default change cannot silently weaken every hash written afterwards.
 *
 * The encoded output carries the algorithm, version, parameters and salt, so
 * these values can be raised later and old hashes still verify — `needsRehash`
 * detects those and lets the sign-in path upgrade them transparently.
 */

/** Argon2id. Declared as a literal because the binding ships an ambient const enum. */
const ARGON2ID = 2;

const HASH_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Encoded prefix that a hash written with the current parameters begins with. */
const CURRENT_PREFIX = `$argon2id$v=19$m=${HASH_OPTIONS.memoryCost},t=${HASH_OPTIONS.timeCost},p=${HASH_OPTIONS.parallelism}$`;

export async function hashPassword(plainPassword: string): Promise<string> {
  if (plainPassword.length < PASSWORD_RULES.MIN_LENGTH) {
    throw new Error("Password is shorter than the configured minimum.");
  }
  // Argon2 has no practical input limit, but an unbounded input is a cheap way to
  // burn server CPU, so the policy maximum is enforced before hashing.
  if (plainPassword.length > PASSWORD_RULES.MAX_LENGTH) {
    throw new Error("Password is longer than the configured maximum.");
  }

  return hash(plainPassword, HASH_OPTIONS);
}

/**
 * Constant-time comparison performed inside the Argon2 binding.
 *
 * A malformed or truncated stored hash returns false rather than throwing: a
 * corrupt row must fail the sign-in, not produce a 500 that reveals the account
 * exists.
 */
export async function verifyPassword(storedHash: string, plainPassword: string): Promise<boolean> {
  if (!storedHash || !plainPassword) {
    return false;
  }

  try {
    return await verify(storedHash, plainPassword, HASH_OPTIONS);
  } catch {
    return false;
  }
}

/** True when a stored hash predates the current parameters and should be rewritten. */
export function needsRehash(storedHash: string): boolean {
  return !storedHash.startsWith(CURRENT_PREFIX);
}
