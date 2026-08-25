import { Badge } from "@/components/ui/badge";
import { RECORD_STATUS, RECORD_STATUS_LABELS, type RecordStatus } from "@/constants/status";

interface StatusBadgeProps {
  status: RecordStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isActive = status === RECORD_STATUS.ACTIVE;

  return (
    <Badge variant={isActive ? "success" : "neutral"} className={className}>
      <span
        aria-hidden="true"
        className={
          isActive
            ? "bg-success size-1.5 rounded-full"
            : "bg-muted-foreground size-1.5 rounded-full"
        }
      />
      {RECORD_STATUS_LABELS[status]}
    </Badge>
  );
}
