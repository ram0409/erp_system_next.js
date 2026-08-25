"use client";

import { useEffect } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { ErrorState } from "@/components/shared/error-state";
import { Card } from "@/components/ui/card";

/**
 * Route-level boundary. Next strips error messages in production and replaces
 * them with a digest, so nothing from `error` is rendered except that digest —
 * it is the correlation id for the matching server log entry.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reported by the server logger already; this aids client-side diagnosis.
    console.error("Route error", error.digest ?? error.name);
  }, [error]);

  return (
    <PageContainer>
      <Card>
        <ErrorState
          description={
            error.digest
              ? `Please try again. If the problem continues, quote reference ${error.digest}.`
              : undefined
          }
          onRetry={reset}
        />
      </Card>
    </PageContainer>
  );
}
