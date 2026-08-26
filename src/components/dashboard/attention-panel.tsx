import Link from "next/link";
import { AlertTriangleIcon, CalendarDaysIcon, CircleOffIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ROUTES } from "@/constants/routes";
import { LEAVE_STATUS, TASK_STATUS } from "@/constants/status";
import type { DashboardCapabilities, DashboardHolidayItem } from "@/types/dashboard";
import { formatDate, formatNumber } from "@/utils/format";

interface DashboardAttentionPanelProps {
  readonly leavePending: number;
  readonly tasksBlocked: number;
  readonly holidays: readonly DashboardHolidayItem[];
  readonly capabilities: DashboardCapabilities;
}

export function DashboardAttentionPanel({
  leavePending,
  tasksBlocked,
  holidays,
  capabilities,
}: DashboardAttentionPanelProps) {
  const items = [
    capabilities.leave.view
      ? {
          key: "leave",
          href: `${ROUTES.LEAVE}?${TABLE_QUERY_KEYS.STATUS}=${LEAVE_STATUS.PENDING}`,
          icon: AlertTriangleIcon,
          label: "Leave waiting for review",
          value: leavePending,
          tone: leavePending > 0 ? ("warning" as const) : ("neutral" as const),
        }
      : null,
    capabilities.tasks.view
      ? {
          key: "blocked",
          href: `${ROUTES.TASKS}?${TABLE_QUERY_KEYS.STATUS}=${TASK_STATUS.BLOCKED}`,
          icon: CircleOffIcon,
          label: "Blocked tasks",
          value: tasksBlocked,
          tone: tasksBlocked > 0 ? ("destructive" as const) : ("neutral" as const),
        }
      : null,
  ].filter((item) => item !== null);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <p className="text-muted-foreground text-sm">Items that should be cleared today.</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        {items.length === 0 ? (
          <EmptyState title="Nothing queued" className="py-6" />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="hover:border-primary/35 focus-visible:ring-ring flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="bg-muted flex size-9 items-center justify-center rounded-xl">
                      <item.icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="text-foreground text-sm font-medium">{item.label}</span>
                  </span>
                  <Badge variant={item.tone === "warning" ? "warning" : item.tone === "destructive" ? "destructive" : "neutral"}>
                    {formatNumber(item.value)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {capabilities.holidays.view ? (
          <div className="border-border space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="text-muted-foreground size-4" aria-hidden="true" />
              <p className="text-foreground text-sm font-medium">Upcoming holidays</p>
            </div>
            {holidays.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming holidays on the calendar.</p>
            ) : (
              <ul className="space-y-2">
                {holidays.map((holiday) => (
                  <li key={holiday.key} className="flex items-baseline justify-between gap-3">
                    <span className="text-foreground truncate text-sm">{holiday.name}</span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {formatDate(holiday.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
