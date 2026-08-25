import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ERROR_MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";

/** Shown when an authenticated actor lacks the permission a page requires. */
export function AccessDenied() {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="bg-destructive/10 flex size-11 items-center justify-center rounded-full">
        <ShieldAlertIcon className="text-destructive size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">Access denied</p>
        <p className="text-muted-foreground mx-auto max-w-md text-sm">
          {ERROR_MESSAGES.FORBIDDEN} If you believe this is a mistake, contact your administrator.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={ROUTES.DASHBOARD}>Back to dashboard</Link>
      </Button>
    </Card>
  );
}
