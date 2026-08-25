import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";

interface DashboardKpiCardProps {
  readonly label: string;
  readonly value: number;
  readonly hint: string;
  readonly icon: LucideIcon;
  readonly href?: string;
}

export function DashboardKpiCard({ label, value, hint, icon: Icon, href }: DashboardKpiCardProps) {
  const content = (
    <Card
      className={cn(
        href &&
          "hover:border-primary/35 transition-all hover:shadow-[0_18px_40px_-24px_oklch(0.45_0.18_290_/_0.45)]",
      )}
    >
      <CardContent className="flex items-start gap-4 py-5">
        <span className="brand-fill flex size-10 shrink-0 items-center justify-center rounded-xl shadow-none">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-foreground mt-1 text-2xl font-semibold tracking-tight">
            {formatNumber(value)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
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
      className="focus-visible:ring-ring block rounded-2xl focus-visible:ring-2 focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}
