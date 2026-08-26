import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { PERMISSIONS } from "@/constants/permissions";
import { WorklogsWorkspace } from "@/features/worklogs/components/worklogs-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveQueryValue, resolveSearchTerm } from "@/lib/pagination";
import { listProjectOptions } from "@/services/project-service";
import { listTaskOptions } from "@/services/task-service";
import { listEmployeeOptions } from "@/services/user-service";
import { listWorklogs } from "@/services/worklog-service";
import type { RawSearchParams } from "@/types/pagination";

export const metadata: Metadata = { title: "Worklogs" };

export default async function WorklogsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requirePageAccess(PERMISSIONS.WORKLOGS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const [result, employees, tasks, projects] = await Promise.all([
    listWorklogs(params),
    listEmployeeOptions(),
    listTaskOptions(),
    listProjectOptions(),
  ]);
  const search = resolveSearchTerm(params);
  const employee = resolveQueryValue(params, TABLE_QUERY_KEYS.EMPLOYEE);
  const project = resolveQueryValue(params, TABLE_QUERY_KEYS.PROJECT);

  return (
    <PageContainer>
      <PageHeader
        title="Worklogs"
        description="Record time spent on tasks and review logged hours."
      />
      <WorklogsWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={Boolean(search || employee || project)}
        employees={employees}
        tasks={tasks}
        projects={projects}
      />
    </PageContainer>
  );
}
