/**
 * Locale and time zone are fixed rather than inferred from the runtime. A server
 * rendering in UTC and a browser rendering in local time would otherwise produce
 * different text for the same value and trigger a hydration mismatch.
 */
export const DEFAULT_LOCALE = "en-IN";
export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

const dateFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: DEFAULT_TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: DEFAULT_TIME_ZONE,
});

const numberFormatter = new Intl.NumberFormat(DEFAULT_LOCALE);

export const EMPTY_VALUE_PLACEHOLDER = "—";

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY_VALUE_PLACEHOLDER : dateFormatter.format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY_VALUE_PLACEHOLDER : dateTimeFormatter.format(date);
}

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined
    ? EMPTY_VALUE_PLACEHOLDER
    : numberFormatter.format(value);
}

export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/** Initials for avatar fallbacks; never returns more than two characters. */
export function getInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  const initials = `${first}${last}`.toUpperCase();
  return initials || "?";
}

export function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

/** Fallback breadcrumb label for a path segment with no configured title. */
export function titleCaseSegment(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
