import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { PERMISSIONS } from "@/constants/permissions";
import { PROJECT_STATUS_VALUES } from "@/constants/status";
import { ProjectsWorkspace } from "@/features/projects/components/projects-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveSearchTerm } from "@/lib/pagination";
import { listProjects } from "@/services/project-service";
import { listEmployeeOptions } from "@/services/user-service";
import type { RawSearchParams } from "@/types/pagination";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requirePageAccess(PERMISSIONS.PROJECTS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const [result, employees] = await Promise.all([listProjects(params), listEmployeeOptions()]);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, PROJECT_STATUS_VALUES);

  return (
    <PageContainer>
      <PageHeader title="Projects" description="Track projects, owners and delivery status." />
      <ProjectsWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={Boolean(search || status)}
        employees={employees}
      />
    </PageContainer>
  );
}
