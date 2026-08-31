export const INACTIVITY_DEACTIVATE_DAY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
] as const;

export const INACTIVITY_DEACTIVATE_DAY_VALUES = [7, 30, 60, 90, 365] as const;

export type InactivityDeactivateDays = (typeof INACTIVITY_DEACTIVATE_DAY_VALUES)[number];

export const INACTIVITY_POLICY_OFF = "off" as const;

export const INACTIVITY_POLICY_FORM_VALUES = [
  INACTIVITY_POLICY_OFF,
  "7",
  "30",
  "60",
  "90",
  "365",
] as const;

export type InactivityPolicyFormValue = (typeof INACTIVITY_POLICY_FORM_VALUES)[number];

export const INACTIVITY_SWEEP_LIMIT = 50;

export function isInactivityDeactivateDays(value: number): value is InactivityDeactivateDays {
  return (INACTIVITY_DEACTIVATE_DAY_VALUES as readonly number[]).includes(value);
}

export function inactivityDeactivateLabel(days: number): string {
  const option = INACTIVITY_DEACTIVATE_DAY_OPTIONS.find((item) => item.value === days);
  return option?.label ?? `${days} days`;
}

export function inactivityPolicyFormValue(
  days: number | null,
): InactivityPolicyFormValue {
  if (days === null || !isInactivityDeactivateDays(days)) {
    return INACTIVITY_POLICY_OFF;
  }
  return String(days) as InactivityPolicyFormValue;
}
