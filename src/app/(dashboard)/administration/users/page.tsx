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

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requirePageAccess(PERMISSIONS.USERS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const [result, options] = await Promise.all([listUsers(params), getAssignmentOptions()]);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES);
  const rolePublicId = resolveQueryValue(params, TABLE_QUERY_KEYS.ROLE);
  const isFiltered = Boolean(search || status || rolePublicId);

  return (
    <PageContainer>
      <PageHeader
        title="Users"
        description="Manage user accounts, branch assignments and role assignments."
      />
      <UsersWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={isFiltered}
        actorUserPublicId={access.actor.user.publicId}
        actorIsSuperAdmin={access.actor.user.role.isSuperAdmin}
        options={options}
        exportFilters={{
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(rolePublicId ? { rolePublicId } : {}),
        }}
      />
    </PageContainer>
  );
}
