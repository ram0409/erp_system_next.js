import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { RECORD_STATUS_VALUES } from "@/constants/status";
import { CustomersWorkspace } from "@/features/customers/components/customers-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveSearchTerm } from "@/lib/pagination";
import { getWorkspaceScope } from "@/lib/workspace-scope";
import {
  getCustomerBranchOptions,
  listCustomers,
} from "@/services/customer-service";
import type { RawSearchParams } from "@/types/pagination";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requirePageAccess(PERMISSIONS.CUSTOMERS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const [result, branches, workspace] = await Promise.all([
    listCustomers(params),
    getCustomerBranchOptions(),
    getWorkspaceScope(),
  ]);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES);
  const isFiltered = Boolean(search || status);

  return (
    <PageContainer>
      <PageHeader
        title="Customers"
        description="Maintain customer records by branch, contact details and operating status."
      />
      <CustomersWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={isFiltered}
        branches={branches}
        workspaceBranchPublicId={
          workspace?.branchPublicId ?? access.actor.user.branch.publicId
        }
        exportFilters={{
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
        }}
      />
    </PageContainer>
  );
}
