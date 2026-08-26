import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { PERMISSIONS } from "@/constants/permissions";
import { LEAVE_STATUS_VALUES, LEAVE_TYPE_VALUES } from "@/constants/status";
import { LeaveWorkspace } from "@/features/leave/components/leave-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveQueryValue, resolveSearchTerm } from "@/lib/pagination";
import { listLeave } from "@/services/leave-service";
import { listEmployeeOptions } from "@/services/user-service";
import type { RawSearchParams } from "@/types/pagination";

export const metadata: Metadata = { title: "Leave Management" };

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requirePageAccess(PERMISSIONS.LEAVE.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const [result, employees] = await Promise.all([listLeave(params), listEmployeeOptions()]);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, LEAVE_STATUS_VALUES);
  const type = resolveAllowedValue(params, TABLE_QUERY_KEYS.TYPE, LEAVE_TYPE_VALUES);
  const employee = resolveQueryValue(params, TABLE_QUERY_KEYS.EMPLOYEE);

  return (
    <PageContainer>
      <PageHeader title="Leave Management" description="Apply for leave and review request status." />
      <LeaveWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={Boolean(search || status || type || employee)}
        employees={employees}
      />
    </PageContainer>
  );
}
