import "server-only";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { DESIGNATION_MESSAGES, ERROR_MESSAGES } from "@/constants/messages";
import {
  AUDIT_ACTIONS,
  RECORD_STATUS,
  RECORD_STATUS_VALUES,
  type RecordStatus,
} from "@/constants/status";
import { duplicateFieldError, ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  resolveAllowedValue,
  resolvePagination,
  resolveSearchTerm,
  resolveSort,
} from "@/lib/pagination";
import * as auditRepository from "@/repositories/audit-repository";
import * as designationRepository from "@/repositories/designation-repository";
import {
  DESIGNATION_SORT_FIELDS,
  type DesignationDetailRow,
  type DesignationListRow,
} from "@/repositories/designation-repository";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { DesignationDetail, DesignationListItem, DesignationOption } from "@/types/org-master";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";
import type { CreateDesignationInput, UpdateDesignationInput } from "@/validations/org-master";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "Designation";

interface AuditMeta {
  readonly userAgent?: string | null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function requireDesignation(publicId: string): Promise<DesignationDetailRow> {
  const row = await designationRepository.findByPublicId(publicId);
  if (!row) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  return row;
}

function toListItem(row: DesignationListRow): DesignationListItem {
  return {
    publicId: row.publicId,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    userCount: row._count.users,
  };
}

function toDetail(row: DesignationDetailRow): DesignationDetail {
  return {
    ...toListItem(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function writeAudit(
  actor: ActorContext,
  meta: AuditMeta,
  entry: {
    readonly action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
    readonly entityId: number;
    readonly entityPublicId: string;
    readonly summary: string;
    readonly changes?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await auditRepository.record({
    action: entry.action,
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    actorName: formatFullName(actor.user.firstName, actor.user.lastName),
    entityType: ENTITY_TYPE,
    entityId: entry.entityId,
    entityPublicId: entry.entityPublicId,
    summary: entry.summary,
    ...(entry.changes ? { changes: entry.changes } : {}),
    ipAddress: actor.ipAddress,
    userAgent: meta.userAgent ?? null,
  });
}

export async function listDesignations(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<DesignationListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, DESIGNATION_SORT_FIELDS, "createdAt");
  const result = await designationRepository.list(
    {
      search: resolveSearchTerm(searchParams),
      status: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES),
    },
    pagination,
    sort,
  );

  return { items: result.items.map(toListItem), meta: result.meta };
}

export async function getDesignation(publicId: string): Promise<DesignationDetail> {
  return toDetail(await requireDesignation(publicId));
}

export async function listDesignationOptions(): Promise<DesignationOption[]> {
  return designationRepository.listOptions();
}

export async function createDesignation(
  input: CreateDesignationInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<DesignationDetail> {
  if (await designationRepository.isCodeTaken(input.code)) {
    throw duplicateFieldError("code", "Designation code");
  }
  if (await designationRepository.isNameTaken(input.name)) {
    throw duplicateFieldError("name", "Designation name");
  }

  const created = await designationRepository.create({
    code: input.code,
    name: input.name,
    description: emptyToNull(input.description),
    status: RECORD_STATUS.ACTIVE,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Created designation ${created.name}`,
    changes: { name: created.name, code: created.code },
  });

  return toDetail(created);
}

export async function updateDesignation(
  input: UpdateDesignationInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<DesignationDetail> {
  const existing = await requireDesignation(input.publicId);

  if (await designationRepository.isCodeTaken(input.code, input.publicId)) {
    throw duplicateFieldError("code", "Designation code");
  }
  if (await designationRepository.isNameTaken(input.name, input.publicId)) {
    throw duplicateFieldError("name", "Designation name");
  }

  const updated = await designationRepository.update(input.publicId, {
    code: input.code,
    name: input.name,
    description: emptyToNull(input.description),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated designation ${updated.name}`,
    changes: {
      name: { from: existing.name, to: updated.name },
      code: { from: existing.code, to: updated.code },
    },
  });

  return toDetail(updated);
}

async function assertUnassigned(
  row: DesignationDetailRow,
  kind: "deactivate" | "delete",
): Promise<void> {
  if (row._count.users > 0) {
    throw new ForbiddenError(
      kind === "delete"
        ? DESIGNATION_MESSAGES.USERS_ASSIGNED_DELETE
        : DESIGNATION_MESSAGES.USERS_ASSIGNED_DEACTIVATE,
    );
  }
}

export async function setDesignationStatus(
  publicId: string,
  status: RecordStatus,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<DesignationDetail> {
  const existing = await requireDesignation(publicId);
  if (existing.status === status) {
    return toDetail(existing);
  }
  if (status === RECORD_STATUS.INACTIVE) {
    await assertUnassigned(existing, "deactivate");
  }

  const updated = await designationRepository.update(publicId, { status });
  await writeAudit(actor, meta, {
    action: status === RECORD_STATUS.ACTIVE ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `${status === RECORD_STATUS.ACTIVE ? "Activated" : "Deactivated"} designation ${updated.name}`,
    changes: { status: { from: existing.status, to: status } },
  });

  return toDetail(updated);
}

export async function deleteDesignation(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireDesignation(publicId);
  await assertUnassigned(existing, "delete");
  const deleted = await designationRepository.remove(publicId);

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted designation ${existing.name}`,
  });
}
