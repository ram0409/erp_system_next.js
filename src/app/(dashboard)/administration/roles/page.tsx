import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { RECORD_STATUS_VALUES } from "@/constants/status";
import { RolesWorkspace } from "@/features/roles/components/roles-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveSearchTerm } from "@/lib/pagination";
import { listRoles } from "@/services/role-service";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePageAccess(PERMISSIONS.ROLES.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const result = await listRoles(params);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES);
  const isFiltered = Boolean(search || status);

  return (
    <PageContainer>
      <PageHeader
        title="Roles"
        description="Define the roles that determine what each user can do."
      />
      <RolesWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={isFiltered}
        actorRolePublicId={access.actor.user.role.publicId}
      />
    </PageContainer>
  );
}
