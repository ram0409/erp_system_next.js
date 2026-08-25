import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardActivityItem } from "@/types/dashboard";
import { formatDateTime } from "@/utils/format";

interface DashboardActivityFeedProps {
  readonly items: readonly DashboardActivityItem[];
}

export function DashboardActivityFeed({ items }: DashboardActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <p className="text-muted-foreground text-sm">
          Administrative changes across users, roles, branches and permissions.
        </p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="No administrative activity yet"
            description="Creates, edits, status changes and permission updates will appear here."
            className="py-8"
          />
        ) : (
          <ol className="divide-border divide-y">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">{item.actionLabel}</Badge>
                    <span className="text-muted-foreground text-xs">{item.entityType}</span>
                  </div>
                  <p className="text-foreground text-sm">{item.summary ?? item.actionLabel}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.actorName ? item.actorName : "System"}
                  </p>
                </div>
                <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {formatDateTime(item.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
