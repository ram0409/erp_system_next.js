import "server-only";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_VALUES } from "@/constants/status";
import { resolveAllowedValue, resolvePagination, resolveSearchTerm } from "@/lib/pagination";
import * as auditRepository from "@/repositories/audit-repository";
import type { AuditLogRow } from "@/repositories/audit-repository";
import type { AuditLogListItem } from "@/types/audit-log";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";

function toListItem(row: AuditLogRow): AuditLogListItem {
  return {
    key: `${row.createdAt.toISOString()}:${row.action}:${row.entityType}:${row.entityPublicId ?? ""}:${row.id}`,
    action: row.action,
    actionLabel: AUDIT_ACTION_LABELS[row.action],
    actorName: row.actorName,
    actorEmail: row.actorEmail,
    entityType: row.entityType,
    entityPublicId: row.entityPublicId,
    summary: row.summary,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAuditLogs(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<AuditLogListItem>> {
  const pagination = resolvePagination(searchParams);
  const search = resolveSearchTerm(searchParams);
  const action = resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.ACTION, AUDIT_ACTION_VALUES);

  const result = await auditRepository.list(
    {
      ...(search ? { search } : {}),
      ...(action ? { action } : {}),
    },
    pagination,
  );

  return {
    items: result.items.map(toListItem),
    meta: result.meta,
  };
}
