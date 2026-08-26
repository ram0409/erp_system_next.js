import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { PERMISSIONS } from "@/constants/permissions";
import { HOLIDAY_TYPE_VALUES, RECORD_STATUS_VALUES } from "@/constants/status";
import { HolidaysWorkspace } from "@/features/holidays/components/holidays-workspace";
import { requirePageAccess } from "@/lib/page-guard";
import { resolveAllowedValue, resolveSearchTerm } from "@/lib/pagination";
import { listHolidays } from "@/services/holiday-service";
import type { RawSearchParams } from "@/types/pagination";

export const metadata: Metadata = { title: "Holidays" };

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requirePageAccess(PERMISSIONS.HOLIDAYS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const result = await listHolidays(params);
  const search = resolveSearchTerm(params);
  const status = resolveAllowedValue(params, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES);
  const type = resolveAllowedValue(params, TABLE_QUERY_KEYS.TYPE, HOLIDAY_TYPE_VALUES);

  return (
    <PageContainer>
      <PageHeader title="Holidays" description="Maintain the organisation holiday calendar." />
      <HolidaysWorkspace
        items={result.items}
        meta={result.meta}
        isFiltered={Boolean(search || status || type)}
      />
    </PageContainer>
  );
}
