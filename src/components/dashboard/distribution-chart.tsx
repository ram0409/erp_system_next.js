import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { totalOf } from "@/lib/dashboard-distribution";
import { cn } from "@/lib/utils";
import type { DashboardSlice } from "@/types/dashboard";
import { formatNumber } from "@/utils/format";

interface DashboardDistributionChartProps {
  readonly title: string;
  readonly description: string;
  readonly emptyTitle: string;
  readonly items: readonly DashboardSlice[];
  readonly linkSlices?: boolean;
}

export function DashboardDistributionChart({
  title,
  description,
  emptyTitle,
  items,
  linkSlices = false,
}: DashboardDistributionChartProps) {
  const total = totalOf(items);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardHeader>
      <CardContent className="flex-1">
        {items.length === 0 || total === 0 ? (
          <EmptyState title={emptyTitle} className="py-8" />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const percent = total === 0 ? 0 : Math.round((item.count / total) * 100);
              const width = item.count === 0 ? 0 : Math.max(percent, 4);
              const label = (
                <span className="text-foreground truncate text-sm font-medium">{item.label}</span>
              );

              return (
                <li key={item.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    {linkSlices && item.href ? (
                      <Link
                        href={item.href}
                        className="text-foreground hover:text-primary min-w-0 truncate text-sm font-medium underline-offset-2 hover:underline"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      label
                    )}
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {formatNumber(item.count)} · {percent}%
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={`${item.label}: ${item.count}`}
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={item.count}
                    className="bg-muted h-2 overflow-hidden rounded-full"
                  >
                    <div
                      className={cn("brand-fill h-full rounded-full shadow-none")}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
