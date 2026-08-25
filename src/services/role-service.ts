import "server-only";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ERROR_MESSAGES, ROLE_MESSAGES } from "@/constants/messages";
import {
  AUDIT_ACTIONS,
  RECORD_STATUS,
  RECORD_STATUS_VALUES,
  type RecordStatus,
} from "@/constants/status";
import { duplicateFieldError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { normalizeSlug } from "@/lib/normalize";
import {
  resolveAllowedValue,
  resolvePagination,
  resolveSearchTerm,
  resolveSort,
} from "@/lib/pagination";
import * as auditRepository from "@/repositories/audit-repository";
import * as roleRepository from "@/repositories/role-repository";
import {
  ROLE_SORT_FIELDS,
  type RoleDetailRow,
  type RoleListRow,
} from "@/repositories/role-repository";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { RoleDetail, RoleListItem } from "@/types/role";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";
import type { CreateRoleInput, UpdateRoleInput } from "@/validations/role";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "Role";

interface AuditMeta {
  readonly userAgent?: string | null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function requireRole(publicId: string): Promise<RoleDetailRow> {
  const row = await roleRepository.findByPublicId(publicId);
  if (!row) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  return row;
}

function toListItem(row: RoleListRow): RoleListItem {
  return {
    publicId: row.publicId,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    isSuperAdmin: row.isSuperAdmin,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    userCount: row._count.users,
    permissionCount: row._count.permissions,
  };
}

function toDetail(row: RoleDetailRow): RoleDetail {
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

export async function listRoles(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<RoleListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, ROLE_SORT_FIELDS, "createdAt");
  const result = await roleRepository.list(
    {
      search: resolveSearchTerm(searchParams),
      status: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES),
    },
    pagination,
    sort,
  );

  return {
    items: result.items.map(toListItem),
    meta: result.meta,
  };
}

export async function getRole(publicId: string): Promise<RoleDetail> {
  return toDetail(await requireRole(publicId));
}

async function assertUniqueName(name: string, exceptPublicId?: string): Promise<void> {
  if (await roleRepository.isNameTaken(name, exceptPublicId)) {
    throw duplicateFieldError("name", "Role name");
  }
}

async function assertUniqueSlug(slug: string, exceptPublicId?: string): Promise<void> {
  if (await roleRepository.isSlugTaken(slug, exceptPublicId)) {
    throw duplicateFieldError("slug", "Role slug");
  }
}

export async function createRole(
  input: CreateRoleInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<RoleDetail> {
  const slug = normalizeSlug(input.slug);
  if (!slug) {
    throw new ValidationError(ROLE_MESSAGES.SLUG_INVALID, {
      fieldErrors: [{ field: "slug", message: ROLE_MESSAGES.SLUG_INVALID }],
    });
  }

  await assertUniqueName(input.name);
  await assertUniqueSlug(slug);

  const created = await roleRepository.create({
    slug,
    name: input.name,
    description: emptyToNull(input.description),
    status: RECORD_STATUS.ACTIVE,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Created role ${created.name}`,
    changes: { name: created.name, slug: created.slug },
  });

  return toDetail(created);
}

export async function updateRole(
  input: UpdateRoleInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<RoleDetail> {
  const existing = await requireRole(input.publicId);
  await assertUniqueName(input.name, input.publicId);

  const updated = await roleRepository.update(input.publicId, {
    name: input.name,
    description: emptyToNull(input.description),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated role ${updated.name}`,
    changes: {
      name: { from: existing.name, to: updated.name },
      description: { from: existing.description, to: updated.description },
    },
  });

  return toDetail(updated);
}

async function assertCanLeaveService(
  role: RoleDetailRow,
  actor: ActorContext,
  kind: "deactivate" | "delete",
): Promise<void> {
  if (actor.roleId === role.id) {
    throw new ForbiddenError(
      kind === "delete" ? ROLE_MESSAGES.OWN_ROLE_DELETE : ROLE_MESSAGES.OWN_ROLE_DEACTIVATE,
    );
  }

  if (role.isSuperAdmin) {
    throw new ForbiddenError(
      kind === "delete" ? ROLE_MESSAGES.SUPER_ADMIN_DELETE : ROLE_MESSAGES.SUPER_ADMIN_DEACTIVATE,
    );
  }

  if (kind === "delete" && role.isSystem) {
    throw new ForbiddenError(ROLE_MESSAGES.SYSTEM_ROLE_DELETE);
  }

  const assigned = role._count.users;
  if (assigned > 0) {
    throw new ForbiddenError(
      kind === "delete"
        ? ROLE_MESSAGES.USERS_ASSIGNED_DELETE
        : ROLE_MESSAGES.USERS_ASSIGNED_DEACTIVATE,
    );
  }
}

export async function setRoleStatus(
  publicId: string,
  status: RecordStatus,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<RoleDetail> {
  const existing = await requireRole(publicId);

  if (existing.status === status) {
    return toDetail(existing);
  }

  if (status === RECORD_STATUS.INACTIVE) {
    await assertCanLeaveService(existing, actor, "deactivate");
  }

  const updated = await roleRepository.update(publicId, { status });
  const action =
    status === RECORD_STATUS.ACTIVE ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE;

  await writeAudit(actor, meta, {
    action,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `${status === RECORD_STATUS.ACTIVE ? "Activated" : "Deactivated"} role ${updated.name}`,
    changes: { status: { from: existing.status, to: status } },
  });

  return toDetail(updated);
}

export async function deleteRole(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireRole(publicId);
  await assertCanLeaveService(existing, actor, "delete");

  const deleted = await roleRepository.remove(publicId);

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted role ${existing.name}`,
  });
}
