import type { DashboardSlice } from "@/types/dashboard";

/**
 * Keeps distribution charts readable when a tenant has many branches or roles.
 * The first `limit - 1` slices stay intact; everything else becomes one "Other"
 * bar so a long tail cannot stretch the chart.
 */
export function foldDistribution(
  items: readonly DashboardSlice[],
  limit: number,
): DashboardSlice[] {
  if (limit < 1 || items.length <= limit) {
    return [...items];
  }

  const head = items.slice(0, limit - 1);
  const rest = items.slice(limit - 1);
  const otherCount = rest.reduce((sum, item) => sum + item.count, 0);

  if (otherCount === 0) {
    return [...head];
  }

  return [...head, { key: "other", label: "Other", count: otherCount }];
}

export function totalOf(items: readonly { readonly count: number }[]): number {
  return items.reduce((sum, item) => sum + item.count, 0);
}
