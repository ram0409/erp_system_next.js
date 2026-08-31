/**
 * Named password policies. Settings → Security stores one id on the organisation;
 * change-password, reset-password and generated temporary passwords all read
 * the matching rules from this catalog.
 */

export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_POLICIES = {
  BASIC: "basic",
  STANDARD: "standard",
  STRONG: "strong",
  STRICT: "strict",
} as const;

export type PasswordPolicyId = (typeof PASSWORD_POLICIES)[keyof typeof PASSWORD_POLICIES];

export const PASSWORD_POLICY_IDS = [
  PASSWORD_POLICIES.BASIC,
  PASSWORD_POLICIES.STANDARD,
  PASSWORD_POLICIES.STRONG,
  PASSWORD_POLICIES.STRICT,
] as const satisfies readonly PasswordPolicyId[];

/** Default organisation policy: 12 characters with mixed case, number and symbol. */
export const DEFAULT_PASSWORD_POLICY = PASSWORD_POLICIES.STRONG;

export interface PasswordPolicyRules {
  readonly id: PasswordPolicyId;
  readonly label: string;
  /** One-line summary shown on the tile. */
  readonly hint: string;
  /** Plain-language explanation of who this policy is for and what it requires. */
  readonly explanation: string;
  readonly minLength: number;
  readonly requireUppercase: boolean;
  readonly requireLowercase: boolean;
  readonly requireNumber: boolean;
  readonly requireSymbol: boolean;
}

export const PASSWORD_POLICY_CATALOG: readonly PasswordPolicyRules[] = [
  {
    id: PASSWORD_POLICIES.BASIC,
    label: "Basic",
    hint: "8 characters, any mix",
    explanation:
      "The password must be at least 8 characters. Letters, numbers and symbols are optional. Use this only for low-risk internal access.",
    minLength: 8,
    requireUppercase: false,
    requireLowercase: false,
    requireNumber: false,
    requireSymbol: false,
  },
  {
    id: PASSWORD_POLICIES.STANDARD,
    label: "Standard",
    hint: "8 characters, letters and a number",
    explanation:
      "The password must be at least 8 characters and include uppercase, lowercase and a number. A symbol is not required. A practical choice for everyday staff accounts.",
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSymbol: false,
  },
  {
    id: PASSWORD_POLICIES.STRONG,
    label: "Strong",
    hint: "12 characters, letters, number and symbol",
    explanation:
      "The password must be at least 12 characters and include uppercase, lowercase, a number and a symbol (for example ! @ #). Recommended for most organisations.",
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSymbol: true,
  },
  {
    id: PASSWORD_POLICIES.STRICT,
    label: "Strict",
    hint: "14 characters, letters, number and symbol",
    explanation:
      "The password must be at least 14 characters and include uppercase, lowercase, a number and a symbol. Use this where accounts can reach sensitive data.",
    minLength: 14,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSymbol: true,
  },
];

const POLICY_BY_ID: ReadonlyMap<PasswordPolicyId, PasswordPolicyRules> = new Map(
  PASSWORD_POLICY_CATALOG.map((rules) => [rules.id, rules]),
);

export function isPasswordPolicyId(value: string): value is PasswordPolicyId {
  return (PASSWORD_POLICY_IDS as readonly string[]).includes(value);
}

export function resolvePasswordPolicyId(value: string | null | undefined): PasswordPolicyId {
  if (value && isPasswordPolicyId(value)) {
    return value;
  }
  return DEFAULT_PASSWORD_POLICY;
}

export function getPasswordPolicyRules(policy: PasswordPolicyId): PasswordPolicyRules {
  const match = POLICY_BY_ID.get(policy);
  if (match) {
    return match;
  }
  const fallback = POLICY_BY_ID.get(DEFAULT_PASSWORD_POLICY);
  if (!fallback) {
    throw new Error("PASSWORD_POLICY_CATALOG is missing the default policy.");
  }
  return fallback;
}

export function passwordPolicyRequirementList(rules: PasswordPolicyRules): readonly string[] {
  const items: string[] = [`At least ${rules.minLength} characters`];
  if (rules.requireUppercase) {
    items.push("One uppercase letter");
  }
  if (rules.requireLowercase) {
    items.push("One lowercase letter");
  }
  if (rules.requireNumber) {
    items.push("One number");
  }
  if (rules.requireSymbol) {
    items.push("One symbol");
  }
  return items;
}

export function passwordPolicyHint(rules: PasswordPolicyRules): string {
  const extras: string[] = [];
  if (rules.requireUppercase) {
    extras.push("an uppercase letter");
  }
  if (rules.requireLowercase) {
    extras.push("a lowercase letter");
  }
  if (rules.requireNumber) {
    extras.push("a number");
  }
  if (rules.requireSymbol) {
    extras.push("a symbol");
  }

  const length = `At least ${rules.minLength} characters`;
  if (extras.length === 0) {
    return length;
  }
  if (extras.length === 1) {
    return `${length}, with ${extras[0]}`;
  }
  return `${length}, with ${extras.slice(0, -1).join(", ")} and ${extras[extras.length - 1]}`;
}

/** First failing rule, or null when the password meets the policy. */
export function findPasswordPolicyViolation(
  password: string,
  rules: PasswordPolicyRules,
): string | null {
  if (password.length < rules.minLength) {
    return `Password must be at least ${rules.minLength} characters`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
  }
  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    return "Password must contain an uppercase letter";
  }
  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    return "Password must contain a lowercase letter";
  }
  if (rules.requireNumber && !/[0-9]/.test(password)) {
    return "Password must contain a number";
  }
  if (rules.requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain a symbol";
  }
  return null;
}
