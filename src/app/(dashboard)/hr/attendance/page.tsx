import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { PERMISSIONS } from "@/constants/permissions";
import { ATTENDANCE_DAY_STATUS_VALUES } from "@/constants/status";
import { AttendanceWorkspace } from "@/features/attendance/components/attendance-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveQueryValue, resolveSearchTerm } from "@/lib/pagination";
import { listAttendance } from "@/services/attendance-service";
import { listEmployeeOptions } from "@/services/user-service";
import type { RawSearchParams } from "@/types/pagination";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requirePageAccess(PERMISSIONS.ATTENDANCE.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const [result, employees] = await Promise.all([listAttendance(params), listEmployeeOptions()]);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, ATTENDANCE_DAY_STATUS_VALUES);
  const employee = resolveQueryValue(params, TABLE_QUERY_KEYS.EMPLOYEE);

  return (
    <PageContainer>
      <PageHeader
        title="Attendance"
        description="Record daily attendance and review presence across the organisation."
      />
      <AttendanceWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={Boolean(search || status || employee)}
        employees={employees}
      />
    </PageContainer>
  );
}
