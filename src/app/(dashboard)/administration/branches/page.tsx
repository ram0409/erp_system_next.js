import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { BRANCH_TYPE_VALUES, RECORD_STATUS_VALUES } from "@/constants/status";
import { BranchesWorkspace } from "@/features/branches/components/branches-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveSearchTerm } from "@/lib/pagination";
import { listBranches } from "@/services/branch-service";

export const metadata: Metadata = { title: "Branches" };

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePageAccess(PERMISSIONS.BRANCHES.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const result = await listBranches(params);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES);
  const type = resolveAllowedValue(params, TABLE_QUERY_KEYS.TYPE, BRANCH_TYPE_VALUES);
  const isFiltered = Boolean(search || status || type);

  return (
    <PageContainer>
      <PageHeader
        title="Branches"
        description="Maintain the branch network, head office designation and operating status."
      />
      <BranchesWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={isFiltered}
        actorBranchPublicId={access.actor.user.branch.publicId}
        exportFilters={{
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(type ? { type } : {}),
        }}
      />
    </PageContainer>
  );
}
