import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Loading", className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex flex-col items-center justify-center gap-2 px-6 py-14",
        className,
      )}
    >
      <Spinner label={label} className="size-5" />
      <p className="text-sm">{label}…</p>
    </div>
  );
}

interface TableLoadingStateProps {
  rows?: number;
  columns?: number;
}

/** Skeleton shaped like the table it replaces, so layout does not jump on load. */
export function TableLoadingState({ rows = 8, columns = 6 }: TableLoadingStateProps) {
  return (
    <div className="divide-border divide-y" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading records</span>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn("h-4 flex-1", columnIndex === 0 && "max-w-56")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
