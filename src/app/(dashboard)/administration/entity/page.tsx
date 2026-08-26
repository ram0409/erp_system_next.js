import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { RECORD_STATUS_VALUES } from "@/constants/status";
import { EntitiesWorkspace } from "@/features/entity/components/entities-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveSearchTerm } from "@/lib/pagination";
import { listEntities } from "@/services/entity-service";

export const metadata: Metadata = { title: "Entity" };

export default async function EntityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePageAccess(PERMISSIONS.ENTITIES.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const result = await listEntities(params);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES);

  return (
    <PageContainer>
      <PageHeader
        title="Entity"
        description="Maintain legal entities and their registration details."
      />
      <EntitiesWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={Boolean(search || status)}
      />
    </PageContainer>
  );
}
