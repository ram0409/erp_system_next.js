import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { RECORD_STATUS_VALUES } from "@/constants/status";
import { UsersWorkspace } from "@/features/users/components/users-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveQueryValue, resolveSearchTerm } from "@/lib/pagination";
import { getAssignmentOptions, listUsers } from "@/services/user-service";
import type { RawSearchParams } from "@/types/pagination";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requirePageAccess(PERMISSIONS.EMPLOYEES.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const [result, assignmentOptions] = await Promise.all([
    listUsers(params, { excludeSuperAdmin: true }),
    getAssignmentOptions(),
  ]);
  const options = {
    ...assignmentOptions,
    roles: assignmentOptions.roles.filter((role) => !role.isSuperAdmin),
  };
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES);
  const branchPublicId = resolveQueryValue(params, TABLE_QUERY_KEYS.BRANCH);
  const rolePublicId = resolveQueryValue(params, TABLE_QUERY_KEYS.ROLE);

  return (
    <PageContainer>
      <PageHeader
        title="Employees"
        description="Employee records with department, designation and join date."
      />
      <UsersWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={Boolean(search || status || branchPublicId || rolePublicId)}
        actorUserPublicId={access.actor.user.publicId}
        actorIsSuperAdmin={access.actor.user.role.isSuperAdmin}
        options={options}
        exportFilters={{
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(branchPublicId ? { branchPublicId } : {}),
          ...(rolePublicId ? { rolePublicId } : {}),
          excludeSuperAdmin: true,
        }}
      />
    </PageContainer>
  );
}
