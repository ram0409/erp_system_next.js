import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { PERMISSIONS } from "@/constants/permissions";
import { TASK_STATUS_VALUES } from "@/constants/status";
import { TasksWorkspace } from "@/features/tasks/components/tasks-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveQueryValue, resolveSearchTerm } from "@/lib/pagination";
import { listProjectOptions } from "@/services/project-service";
import { listTasks } from "@/services/task-service";
import { listEmployeeOptions } from "@/services/user-service";
import type { RawSearchParams } from "@/types/pagination";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requirePageAccess(PERMISSIONS.TASKS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const [result, employees, projects] = await Promise.all([
    listTasks(params),
    listEmployeeOptions(),
    listProjectOptions(),
  ]);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, TASK_STATUS_VALUES);
  const project = resolveQueryValue(params, TABLE_QUERY_KEYS.PROJECT);
  const employee = resolveQueryValue(params, TABLE_QUERY_KEYS.EMPLOYEE);

  return (
    <PageContainer>
      <PageHeader title="Tasks" description="Assign and track work against projects." />
      <TasksWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={Boolean(search || status || project || employee)}
        employees={employees}
        projects={projects}
      />
    </PageContainer>
  );
}
