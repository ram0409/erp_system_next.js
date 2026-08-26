import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { RECORD_STATUS_VALUES } from "@/constants/status";
import { DepartmentsWorkspace } from "@/features/departments/components/departments-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveSearchTerm } from "@/lib/pagination";
import { listDepartments } from "@/services/department-service";
import { getAssignmentOptions } from "@/services/user-service";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePageAccess(PERMISSIONS.DEPARTMENTS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const [result, options] = await Promise.all([listDepartments(params), getAssignmentOptions()]);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES);

  return (
    <PageContainer>
      <PageHeader
        title="Departments"
        description="Maintain the department master used on employee records."
      />
      <DepartmentsWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={Boolean(search || status)}
        branches={options.branches}
      />
    </PageContainer>
  );
}
