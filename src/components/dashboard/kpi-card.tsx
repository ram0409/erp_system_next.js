import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";

export type DashboardKpiTone = "brand" | "success" | "warning" | "info" | "muted";

interface DashboardKpiCardProps {
  readonly label: string;
  readonly value: number;
  readonly hint: string;
  readonly icon: LucideIcon;
  readonly href?: string;
  readonly tone?: DashboardKpiTone;
}

const iconToneClass: Record<DashboardKpiTone, string> = {
  brand: "bg-primary text-primary-foreground",
  success: "bg-success/14 text-success",
  warning: "bg-warning/18 text-warning",
  info: "bg-info/14 text-info",
  muted: "bg-muted text-muted-foreground",
};

export function DashboardKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "brand",
}: DashboardKpiCardProps) {
  const content = (
    <Card className={cn("h-full transition-[border-color,box-shadow,transform] duration-200", href && "hover:border-primary/35 hover:shadow-md motion-safe:hover:-translate-y-0.5")}>
      <CardContent className="flex h-full items-start gap-4 py-5">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            iconToneClass[tone],
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className="text-foreground mt-1 text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums">
            {formatNumber(value)}
          </p>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="focus-visible:ring-ring block h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}
