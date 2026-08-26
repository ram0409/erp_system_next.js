import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { RECORD_STATUS_VALUES } from "@/constants/status";
import { DesignationsWorkspace } from "@/features/designations/components/designations-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveSearchTerm } from "@/lib/pagination";
import { listDesignations } from "@/services/designation-service";

export const metadata: Metadata = { title: "Designations" };

export default async function DesignationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePageAccess(PERMISSIONS.DESIGNATIONS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const result = await listDesignations(params);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES);

  return (
    <PageContainer>
      <PageHeader
        title="Designations"
        description="Maintain job titles assigned to employees."
      />
      <DesignationsWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={Boolean(search || status)}
      />
    </PageContainer>
  );
}
