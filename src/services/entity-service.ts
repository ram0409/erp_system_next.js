import "server-only";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ENTITY_MESSAGES, ERROR_MESSAGES } from "@/constants/messages";
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
import * as entityRepository from "@/repositories/entity-repository";
import {
  ENTITY_SORT_FIELDS,
  type EntityDetailRow,
  type EntityListRow,
} from "@/repositories/entity-repository";
import type { EntityDetail, EntityListItem, EntityOption } from "@/types/entity";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";
import type { CreateEntityInput, UpdateEntityInput } from "@/validations/entity";
import type { Prisma } from "@generated/prisma/client";

const AUDIT_ENTITY_TYPE = "Entity";

interface AuditMeta {
  readonly userAgent?: string | null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function requireEntity(publicId: string): Promise<EntityDetailRow> {
  const row = await entityRepository.findByPublicId(publicId);
  if (!row) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  return row;
}

function toListItem(row: EntityListRow): EntityListItem {
  return {
    publicId: row.publicId,
    code: row.code,
    name: row.name,
    legalName: row.legalName,
    email: row.email,
    phone: row.phone,
    city: row.city,
    country: row.country,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    branchCount: row._count.branches,
  };
}

function toDetail(row: EntityDetailRow): EntityDetail {
  return {
    ...toListItem(row),
    taxId: row.taxId,
    addressLine: row.addressLine,
    state: row.state,
    postalCode: row.postalCode,
    notes: row.notes,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function optionalFields(input: CreateEntityInput | UpdateEntityInput) {
  return {
    legalName: emptyToNull(input.legalName),
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    taxId: emptyToNull(input.taxId),
    addressLine: emptyToNull(input.addressLine),
    city: emptyToNull(input.city),
    state: emptyToNull(input.state),
    postalCode: emptyToNull(input.postalCode),
    country: emptyToNull(input.country),
    notes: emptyToNull(input.notes),
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
    entityType: AUDIT_ENTITY_TYPE,
    entityId: entry.entityId,
    entityPublicId: entry.entityPublicId,
    summary: entry.summary,
    ...(entry.changes ? { changes: entry.changes } : {}),
    ipAddress: actor.ipAddress,
    userAgent: meta.userAgent ?? null,
  });
}

export async function listEntities(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<EntityListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, ENTITY_SORT_FIELDS, "createdAt");
  const result = await entityRepository.list(
    {
      search: resolveSearchTerm(searchParams),
      status: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES),
    },
    pagination,
    sort,
  );

  return { items: result.items.map(toListItem), meta: result.meta };
}

export async function getEntity(publicId: string): Promise<EntityDetail> {
  return toDetail(await requireEntity(publicId));
}

export async function listEntityOptions(): Promise<EntityOption[]> {
  return entityRepository.listOptions(true);
}

export async function createEntity(
  input: CreateEntityInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<EntityDetail> {
  if (await entityRepository.isCodeTaken(input.code)) {
    throw duplicateFieldError("code", "Entity code");
  }
  if (await entityRepository.isNameTaken(input.name)) {
    throw duplicateFieldError("name", "Entity name");
  }

  const created = await entityRepository.create({
    code: input.code,
    name: input.name,
    ...optionalFields(input),
    status: RECORD_STATUS.ACTIVE,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Created entity ${created.name}`,
    changes: { name: created.name, code: created.code },
  });

  return toDetail(created);
}

export async function updateEntity(
  input: UpdateEntityInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<EntityDetail> {
  const existing = await requireEntity(input.publicId);

  if (await entityRepository.isCodeTaken(input.code, input.publicId)) {
    throw duplicateFieldError("code", "Entity code");
  }
  if (await entityRepository.isNameTaken(input.name, input.publicId)) {
    throw duplicateFieldError("name", "Entity name");
  }

  const updated = await entityRepository.update(input.publicId, {
    code: input.code,
    name: input.name,
    ...optionalFields(input),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated entity ${updated.name}`,
    changes: {
      name: { from: existing.name, to: updated.name },
      code: { from: existing.code, to: updated.code },
    },
  });

  return toDetail(updated);
}

async function assertUnassigned(row: EntityDetailRow, kind: "deactivate" | "delete"): Promise<void> {
  if (row._count.branches > 0) {
    throw new ForbiddenError(
      kind === "delete"
        ? ENTITY_MESSAGES.BRANCHES_ASSIGNED_DELETE
        : ENTITY_MESSAGES.BRANCHES_ASSIGNED_DEACTIVATE,
    );
  }
}

export async function setEntityStatus(
  publicId: string,
  status: RecordStatus,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<EntityDetail> {
  const existing = await requireEntity(publicId);
  if (existing.status === status) {
    return toDetail(existing);
  }
  if (status === RECORD_STATUS.INACTIVE) {
    await assertUnassigned(existing, "deactivate");
  }

  const updated = await entityRepository.update(publicId, { status });
  await writeAudit(actor, meta, {
    action: status === RECORD_STATUS.ACTIVE ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `${status === RECORD_STATUS.ACTIVE ? "Activated" : "Deactivated"} entity ${updated.name}`,
    changes: { status: { from: existing.status, to: status } },
  });

  return toDetail(updated);
}

export async function deleteEntity(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireEntity(publicId);
  await assertUnassigned(existing, "delete");
  const deleted = await entityRepository.remove(publicId);

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted entity ${existing.name}`,
  });
}
