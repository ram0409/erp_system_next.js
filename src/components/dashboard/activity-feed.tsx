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
          Latest changes across people, leave, projects and administration.
        </p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Creates, edits, approvals and assignments will appear here."
            className="py-8"
          />
        ) : (
          <ol className="relative space-y-0">
            {items.map((item, index) => (
              <li key={item.key} className="flex gap-3">
                <div className="flex w-4 shrink-0 flex-col items-center">
                  <span className="bg-primary mt-1.5 size-2 rounded-full" />
                  {index < items.length - 1 ? (
                    <span className="bg-border mt-1 w-px flex-1" />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
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
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
