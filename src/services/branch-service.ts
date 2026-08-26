import "server-only";

import { EXPORT_MAX_ROWS, TABLE_QUERY_KEYS } from "@/constants/pagination";
import { BRANCH_MESSAGES, ERROR_MESSAGES } from "@/constants/messages";
import {
  AUDIT_ACTIONS,
  BRANCH_TYPE_LABELS,
  BRANCH_TYPE_VALUES,
  RECORD_STATUS,
  RECORD_STATUS_LABELS,
  RECORD_STATUS_VALUES,
  type BranchType,
  type RecordStatus,
} from "@/constants/status";
import { duplicateFieldError, ForbiddenError, InternalError, NotFoundError, ValidationError } from "@/lib/errors";
import { resolveAllowedValue, resolvePagination, resolveSearchTerm, resolveSort } from "@/lib/pagination";
import { getWorkspaceScope } from "@/lib/workspace-scope";
import * as auditRepository from "@/repositories/audit-repository";
import * as branchRepository from "@/repositories/branch-repository";
import {
  BRANCH_SORT_FIELDS,
  type BranchDetailRow,
  type BranchListRow,
} from "@/repositories/branch-repository";
import * as entityRepository from "@/repositories/entity-repository";
import * as organizationRepository from "@/repositories/organization-repository";
import * as userRepository from "@/repositories/user-repository";
import type { BranchDetail, BranchExportResult, BranchListItem } from "@/types/branch";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { ActorContext } from "@/types/session";
import { toCsv } from "@/utils/csv";
import { formatDate, formatFullName } from "@/utils/format";
import type {
  CreateBranchInput,
  ExportBranchesInput,
  UpdateBranchInput,
} from "@/validations/branch";
import type { Prisma } from "@generated/prisma/client";

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const ENTITY_TYPE = "Branch";

interface AuditMeta {
  readonly userAgent?: string | null;
}

function requireOrganizationId(): Promise<number> {
  return organizationRepository.findPrimaryId().then((id) => {
    if (id === null) {
      throw new InternalError({ internalDetail: "No organization row exists to attach a branch to." });
    }
    return id;
  });
}

async function requireBranch(publicId: string): Promise<BranchDetailRow> {
  const row = await branchRepository.findByPublicId(publicId);
  if (!row) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  return row;
}

function toListItem(row: BranchListRow): BranchListItem {
  return {
    publicId: row.publicId,
    code: row.code,
    name: row.name,
    type: row.type,
    isHeadOffice: row.isHeadOffice,
    email: row.email,
    phone: row.phone,
    city: row.city,
    state: row.state,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    userCount: row._count.users,
    entity: {
      publicId: row.entity.publicId,
      code: row.entity.code,
      name: row.entity.name,
    },
  };
}

function toDetail(row: BranchDetailRow): BranchDetail {
  return {
    ...toListItem(row),
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    postalCode: row.postalCode,
    country: row.country,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function actorName(actor: ActorContext): string {
  return formatFullName(actor.user.firstName, actor.user.lastName);
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
    actorName: actorName(actor),
    entityType: ENTITY_TYPE,
    entityId: entry.entityId,
    entityPublicId: entry.entityPublicId,
    summary: entry.summary,
    ...(entry.changes ? { changes: entry.changes } : {}),
    ipAddress: actor.ipAddress,
    userAgent: meta.userAgent ?? null,
  });
}

async function resolveAssignedEntity(
  publicId: string,
  currentEntityId?: number,
): Promise<{ id: number }> {
  const row = await entityRepository.findByPublicId(publicId);
  if (!row) {
    throw new ValidationError(BRANCH_MESSAGES.ENTITY_INACTIVE, {
      fieldErrors: [{ field: "entityPublicId", message: BRANCH_MESSAGES.ENTITY_INACTIVE }],
    });
  }

  const keepingCurrent = currentEntityId !== undefined && row.id === currentEntityId;
  if (!keepingCurrent && row.status !== RECORD_STATUS.ACTIVE) {
    throw new ValidationError(BRANCH_MESSAGES.ENTITY_INACTIVE, {
      fieldErrors: [{ field: "entityPublicId", message: BRANCH_MESSAGES.ENTITY_INACTIVE }],
    });
  }

  return row;
}

async function resolveListFilters(searchParams: RawSearchParams) {
  const scope = await getWorkspaceScope();

  return {
    search: resolveSearchTerm(searchParams),
    status: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES),
    type: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.TYPE, BRANCH_TYPE_VALUES),
    ...(scope ? { entityId: scope.entityId } : {}),
  };
}

export async function listBranches(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<BranchListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, BRANCH_SORT_FIELDS, "createdAt");
  const result = await branchRepository.list(await resolveListFilters(searchParams), pagination, sort);

  return {
    items: result.items.map(toListItem),
    meta: result.meta,
  };
}

export async function getBranch(publicId: string): Promise<BranchDetail> {
  return toDetail(await requireBranch(publicId));
}

async function assertUniqueCode(
  entityId: number,
  code: string,
  exceptPublicId?: string,
): Promise<void> {
  if (await branchRepository.isCodeTaken(entityId, code, exceptPublicId)) {
    throw duplicateFieldError("code", "Branch code");
  }
}

async function assertUniqueName(
  entityId: number,
  name: string,
  exceptPublicId?: string,
): Promise<void> {
  if (await branchRepository.isNameTaken(entityId, name, exceptPublicId)) {
    throw duplicateFieldError("name", "Branch name");
  }
}

export async function createBranch(
  input: CreateBranchInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<BranchDetail> {
  const organizationId = await requireOrganizationId();
  const entity = await resolveAssignedEntity(input.entityPublicId);
  const existingCount = await branchRepository.countNotDeleted(organizationId);
  const headOfficeCount = await branchRepository.countHeadOffices(organizationId);
  const isHeadOffice = existingCount === 0 || headOfficeCount === 0 ? true : input.isHeadOffice;

  await assertUniqueCode(entity.id, input.code);
  await assertUniqueName(entity.id, input.name);

  const created = await branchRepository.create({
    organizationId,
    entityId: entity.id,
    code: input.code,
    name: input.name,
    type: input.type,
    isHeadOffice,
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    addressLine1: emptyToNull(input.addressLine1),
    addressLine2: emptyToNull(input.addressLine2),
    city: emptyToNull(input.city),
    state: emptyToNull(input.state),
    postalCode: emptyToNull(input.postalCode),
    country: emptyToNull(input.country),
    status: RECORD_STATUS.ACTIVE,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Created branch ${created.code} (${created.name})`,
    changes: {
      code: created.code,
      name: created.name,
      type: created.type,
      isHeadOffice,
      entity: created.entity.code,
    },
  });

  return toDetail(created);
}

export async function updateBranch(
  input: UpdateBranchInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<BranchDetail> {
  const existing = await requireBranch(input.publicId);

  if (existing.isHeadOffice && input.isHeadOffice === false) {
    throw new ForbiddenError(BRANCH_MESSAGES.HEAD_OFFICE_REQUIRED);
  }

  const headOfficeCount = await branchRepository.countHeadOffices(existing.organizationId);
  const isHeadOffice = headOfficeCount === 0 ? true : input.isHeadOffice;
  const entity = await resolveAssignedEntity(input.entityPublicId, existing.entityId);

  await assertUniqueCode(entity.id, input.code, input.publicId);
  await assertUniqueName(entity.id, input.name, input.publicId);

  const updated = await branchRepository.update(input.publicId, {
    entityId: entity.id,
    code: input.code,
    name: input.name,
    type: input.type,
    isHeadOffice,
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    addressLine1: emptyToNull(input.addressLine1),
    addressLine2: emptyToNull(input.addressLine2),
    city: emptyToNull(input.city),
    state: emptyToNull(input.state),
    postalCode: emptyToNull(input.postalCode),
    country: emptyToNull(input.country),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated branch ${updated.code} (${updated.name})`,
    changes: {
      code: { from: existing.code, to: updated.code },
      name: { from: existing.name, to: updated.name },
      type: { from: existing.type, to: updated.type },
      isHeadOffice: { from: existing.isHeadOffice, to: updated.isHeadOffice },
      entity: { from: existing.entity.code, to: updated.entity.code },
      status: { from: existing.status, to: updated.status },
    },
  });

  return toDetail(updated);
}

async function assertCanLeaveService(
  branch: BranchDetailRow,
  actor: ActorContext,
  kind: "deactivate" | "delete",
): Promise<void> {
  if (actor.branchId === branch.id) {
    throw new ForbiddenError(
      kind === "delete" ? BRANCH_MESSAGES.OWN_BRANCH_DELETE : BRANCH_MESSAGES.OWN_BRANCH_DEACTIVATE,
    );
  }

  if (branch.isHeadOffice) {
    throw new ForbiddenError(
      kind === "delete" ? BRANCH_MESSAGES.HEAD_OFFICE_DELETE : BRANCH_MESSAGES.HEAD_OFFICE_DEACTIVATE,
    );
  }

  const assigned = await userRepository.countByBranch(branch.id);
  if (assigned > 0) {
    throw new ForbiddenError(
      kind === "delete"
        ? BRANCH_MESSAGES.USERS_ASSIGNED_DELETE
        : BRANCH_MESSAGES.USERS_ASSIGNED_DEACTIVATE,
    );
  }
}

export async function setBranchStatus(
  publicId: string,
  status: RecordStatus,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<BranchDetail> {
  const existing = await requireBranch(publicId);

  if (existing.status === status) {
    return toDetail(existing);
  }

  if (status === RECORD_STATUS.INACTIVE) {
    await assertCanLeaveService(existing, actor, "deactivate");
  }

  const updated = await branchRepository.update(publicId, { status });
  const action =
    status === RECORD_STATUS.ACTIVE ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE;

  await writeAudit(actor, meta, {
    action,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `${status === RECORD_STATUS.ACTIVE ? "Activated" : "Deactivated"} branch ${updated.code}`,
    changes: { status: { from: existing.status, to: status } },
  });

  return toDetail(updated);
}

export async function deleteBranch(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireBranch(publicId);
  await assertCanLeaveService(existing, actor, "delete");

  const remaining = await branchRepository.countNotDeleted(existing.organizationId);
  if (remaining <= 1) {
    throw new ForbiddenError(BRANCH_MESSAGES.LAST_BRANCH);
  }

  const deleted = await branchRepository.softDelete(publicId);

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted branch ${existing.code} (${existing.name})`,
  });
}

export async function exportBranches(
  filters: ExportBranchesInput,
): Promise<BranchExportResult> {
  const scope = await getWorkspaceScope();

  const { rows, total } = await branchRepository.listMatching(
    {
      search: filters.search,
      status: filters.status,
      type: filters.type,
      ...(scope ? { entityId: scope.entityId } : {}),
    },
    EXPORT_MAX_ROWS,
    { sortBy: "name", sortDir: "asc" },
  );

  const csv = toCsv(
    [
      "Code",
      "Name",
      "Entity",
      "Type",
      "Head office",
      "Status",
      "Email",
      "Phone",
      "City",
      "State",
      "Users",
      "Created",
    ],
    rows.map((row) => [
      row.code,
      row.name,
      row.entity.name,
      BRANCH_TYPE_LABELS[row.type as BranchType],
      row.isHeadOffice,
      RECORD_STATUS_LABELS[row.status],
      row.email,
      row.phone,
      row.city,
      row.state,
      row._count.users,
      formatDate(row.createdAt),
    ]),
  );

  const stamp = new Date().toISOString().slice(0, 10);

  return {
    csv,
    filename: `branches-${stamp}.csv`,
    rowCount: rows.length,
    truncated: total > rows.length,
  };
}
