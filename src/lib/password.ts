import { hash, verify } from "@node-rs/argon2";
import { randomInt } from "node:crypto";

import {
  DEFAULT_PASSWORD_POLICY,
  findPasswordPolicyViolation,
  getPasswordPolicyRules,
  PASSWORD_MAX_LENGTH,
  type PasswordPolicyId,
  type PasswordPolicyRules,
} from "@/constants/password-policy";
import { ValidationError } from "@/lib/errors";

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
  if (plainPassword.length < 1) {
    throw new Error("Password is empty.");
  }
  // Argon2 has no practical input limit, but an unbounded input is a cheap way to
  // burn server CPU, so the policy maximum is enforced before hashing.
  if (plainPassword.length > PASSWORD_MAX_LENGTH) {
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

export function assertPasswordMeetsPolicy(
  password: string,
  policy: PasswordPolicyId,
  field = "newPassword",
): void {
  const message = findPasswordPolicyViolation(password, getPasswordPolicyRules(policy));
  if (message) {
    throw new ValidationError(message, {
      fieldErrors: [{ field, message }],
    });
  }
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)] ?? alphabet[0] ?? "A";
}

function shuffle(chars: string[]): string[] {
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    const current = chars[index];
    const other = chars[swap];
    if (current === undefined || other === undefined) {
      continue;
    }
    chars[index] = other;
    chars[swap] = current;
  }
  return chars;
}

function fillAlphabet(rules: PasswordPolicyRules): string {
  const parts: string[] = [];
  if (rules.requireUppercase) {
    parts.push(UPPER);
  }
  if (rules.requireLowercase) {
    parts.push(LOWER);
  }
  if (rules.requireNumber) {
    parts.push(DIGITS);
  }
  if (rules.requireSymbol) {
    parts.push(SYMBOLS);
  }
  return parts.length > 0 ? parts.join("") : `${UPPER}${LOWER}${DIGITS}`;
}

/**
 * One-time password for a newly created account. Meets the organisation policy
 * so the first sign-in is accepted, then `mustChangePassword` forces a replacement.
 */
export function generateTemporaryPassword(
  policy: PasswordPolicyId = DEFAULT_PASSWORD_POLICY,
): string {
  const rules = getPasswordPolicyRules(policy);
  const chars: string[] = [];

  if (rules.requireUppercase) {
    chars.push(pick(UPPER));
  }
  if (rules.requireLowercase) {
    chars.push(pick(LOWER));
  }
  if (rules.requireNumber) {
    chars.push(pick(DIGITS));
  }
  if (rules.requireSymbol) {
    chars.push(pick(SYMBOLS));
  }

  const alphabet = fillAlphabet(rules);
  while (chars.length < rules.minLength) {
    chars.push(pick(alphabet));
  }

  return shuffle(chars).join("");
}
