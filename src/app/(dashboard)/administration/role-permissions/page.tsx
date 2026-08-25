import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ROUTES } from "@/constants/routes";
import { RolePermissionsWorkspace } from "@/features/role-permissions/components/role-permissions-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { getMatrix } from "@/services/permission-service";
import type { RawSearchParams } from "@/types/pagination";

export const metadata: Metadata = { title: "Role Permissions" };

function roleQueryValue(params: RawSearchParams): string | undefined {
  const value = params[TABLE_QUERY_KEYS.ROLE];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function RolePermissionsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requirePageAccess(PERMISSIONS.ROLE_PERMISSIONS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const requested = roleQueryValue(params);
  const matrix = await getMatrix(requested);

  if (matrix.selected && matrix.selected.publicId !== requested) {
    redirect(
      `${ROUTES.ROLE_PERMISSIONS}?${TABLE_QUERY_KEYS.ROLE}=${encodeURIComponent(matrix.selected.publicId)}`,
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Role Permissions"
        description="Grant or revoke module permissions for each role."
      />
      <RolePermissionsWorkspace
        key={matrix.selected?.publicId ?? "empty"}
        matrix={matrix}
        actorRolePublicId={access.actor.user.role.publicId}
      />
    </PageContainer>
  );
}
