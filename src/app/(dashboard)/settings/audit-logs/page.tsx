import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { AUDIT_ACTION_VALUES } from "@/constants/status";
import { AuditLogsWorkspace } from "@/features/audit-logs/components/audit-logs-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveSearchTerm } from "@/lib/pagination";
import { listAuditLogs } from "@/services/audit-log-service";
import type { RawSearchParams } from "@/types/pagination";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requirePageAccess(PERMISSIONS.AUDIT_LOGS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const result = await listAuditLogs(params);
  const search = resolveSearchTerm(params);
  const action = resolveAllowedValue(params, TABLE_QUERY_KEYS.ACTION, AUDIT_ACTION_VALUES);
  const isFiltered = Boolean(search || action);

  return (
    <PageContainer>
      <PageHeader
        title="Audit Logs"
        description="A record of sign-ins, account changes and administrative updates."
      />
      <AuditLogsWorkspace items={result.items} meta={result.meta} isFiltered={isFiltered} />
    </PageContainer>
  );
}
