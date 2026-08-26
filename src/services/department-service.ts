import "server-only";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { DEPARTMENT_MESSAGES, ERROR_MESSAGES } from "@/constants/messages";
import {
  AUDIT_ACTIONS,
  RECORD_STATUS,
  RECORD_STATUS_VALUES,
  type RecordStatus,
} from "@/constants/status";
import { duplicateFieldError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  resolveAllowedValue,
  resolvePagination,
  resolveSearchTerm,
  resolveSort,
} from "@/lib/pagination";
import * as auditRepository from "@/repositories/audit-repository";
import * as branchRepository from "@/repositories/branch-repository";
import * as departmentRepository from "@/repositories/department-repository";
import {
  DEPARTMENT_SORT_FIELDS,
  type DepartmentDetailRow,
  type DepartmentListRow,
} from "@/repositories/department-repository";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { DepartmentDetail, DepartmentListItem, DepartmentOption } from "@/types/org-master";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";
import type { CreateDepartmentInput, UpdateDepartmentInput } from "@/validations/org-master";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "Department";

interface AuditMeta {
  readonly userAgent?: string | null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function requireDepartment(publicId: string): Promise<DepartmentDetailRow> {
  const row = await departmentRepository.findByPublicId(publicId);
  if (!row) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  return row;
}

function toListItem(row: DepartmentListRow): DepartmentListItem {
  return {
    publicId: row.publicId,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    userCount: row._count.users,
    branch: row.branch,
  };
}

function toDetail(row: DepartmentDetailRow): DepartmentDetail {
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

async function resolveBranchId(branchPublicId: string | undefined): Promise<number | null> {
  const trimmed = branchPublicId?.trim();
  if (!trimmed) {
    return null;
  }

  const branch = await branchRepository.findByPublicId(trimmed);
  if (!branch || branch.status !== RECORD_STATUS.ACTIVE) {
    throw new ValidationError(DEPARTMENT_MESSAGES.BRANCH_INACTIVE, {
      fieldErrors: [{ field: "branchPublicId", message: DEPARTMENT_MESSAGES.BRANCH_INACTIVE }],
    });
  }

  return branch.id;
}

export async function listDepartments(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<DepartmentListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, DEPARTMENT_SORT_FIELDS, "createdAt");
  const result = await departmentRepository.list(
    {
      search: resolveSearchTerm(searchParams),
      status: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES),
    },
    pagination,
    sort,
  );

  return { items: result.items.map(toListItem), meta: result.meta };
}

export async function getDepartment(publicId: string): Promise<DepartmentDetail> {
  return toDetail(await requireDepartment(publicId));
}

export async function listDepartmentOptions(): Promise<DepartmentOption[]> {
  return departmentRepository.listOptions();
}

export async function createDepartment(
  input: CreateDepartmentInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<DepartmentDetail> {
  if (await departmentRepository.isCodeTaken(input.code)) {
    throw duplicateFieldError("code", "Department code");
  }
  if (await departmentRepository.isNameTaken(input.name)) {
    throw duplicateFieldError("name", "Department name");
  }

  const created = await departmentRepository.create({
    code: input.code,
    name: input.name,
    description: emptyToNull(input.description),
    branchId: await resolveBranchId(input.branchPublicId),
    status: RECORD_STATUS.ACTIVE,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Created department ${created.name}`,
    changes: { name: created.name, code: created.code },
  });

  return toDetail(created);
}

export async function updateDepartment(
  input: UpdateDepartmentInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<DepartmentDetail> {
  const existing = await requireDepartment(input.publicId);

  if (await departmentRepository.isCodeTaken(input.code, input.publicId)) {
    throw duplicateFieldError("code", "Department code");
  }
  if (await departmentRepository.isNameTaken(input.name, input.publicId)) {
    throw duplicateFieldError("name", "Department name");
  }

  const updated = await departmentRepository.update(input.publicId, {
    code: input.code,
    name: input.name,
    description: emptyToNull(input.description),
    branchId: await resolveBranchId(input.branchPublicId),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated department ${updated.name}`,
    changes: {
      name: { from: existing.name, to: updated.name },
      code: { from: existing.code, to: updated.code },
    },
  });

  return toDetail(updated);
}

async function assertUnassigned(row: DepartmentDetailRow, kind: "deactivate" | "delete"): Promise<void> {
  if (row._count.users > 0) {
    throw new ForbiddenError(
      kind === "delete"
        ? DEPARTMENT_MESSAGES.USERS_ASSIGNED_DELETE
        : DEPARTMENT_MESSAGES.USERS_ASSIGNED_DEACTIVATE,
    );
  }
}

export async function setDepartmentStatus(
  publicId: string,
  status: RecordStatus,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<DepartmentDetail> {
  const existing = await requireDepartment(publicId);
  if (existing.status === status) {
    return toDetail(existing);
  }
  if (status === RECORD_STATUS.INACTIVE) {
    await assertUnassigned(existing, "deactivate");
  }

  const updated = await departmentRepository.update(publicId, { status });
  await writeAudit(actor, meta, {
    action: status === RECORD_STATUS.ACTIVE ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `${status === RECORD_STATUS.ACTIVE ? "Activated" : "Deactivated"} department ${updated.name}`,
    changes: { status: { from: existing.status, to: status } },
  });

  return toDetail(updated);
}

export async function deleteDepartment(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireDepartment(publicId);
  await assertUnassigned(existing, "delete");
  const deleted = await departmentRepository.remove(publicId);

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted department ${existing.name}`,
  });
}
