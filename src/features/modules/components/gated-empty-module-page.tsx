import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import type { PermissionKey } from "@/constants/permissions";
import { EmptyMasterWorkspace } from "@/features/modules/components/empty-master-workspace";
import { requirePageAccess } from "@/lib/page-guard";

interface GatedEmptyModulePageProps {
  readonly title: string;
  readonly description: string;
  readonly permission: PermissionKey;
  readonly columns: readonly string[];
}

export async function GatedEmptyModulePage({
  title,
  description,
  permission,
  columns,
}: GatedEmptyModulePageProps) {
  const access = await requirePageAccess(permission);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title={title} description={description} />
      <EmptyMasterWorkspace
        caption={title}
        columns={columns}
        emptyDescription={description}
      />
    </PageContainer>
  );
}
