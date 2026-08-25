import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm font-semibold">404</p>
        <h1 className="text-foreground text-lg font-semibold">Page not found</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          The page you are looking for does not exist or you no longer have access to it.
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href={ROUTES.DASHBOARD}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
