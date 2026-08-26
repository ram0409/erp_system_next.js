import "server-only";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ERROR_MESSAGES, PROJECT_MESSAGES } from "@/constants/messages";
import { AUDIT_ACTIONS, PROJECT_STATUS, PROJECT_STATUS_VALUES } from "@/constants/status";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  resolveAllowedValue,
  resolvePagination,
  resolveQueryValue,
  resolveSearchTerm,
  resolveSort,
} from "@/lib/pagination";
import * as auditRepository from "@/repositories/audit-repository";
import * as projectRepository from "@/repositories/project-repository";
import {
  PROJECT_SORT_FIELDS,
  type ProjectDetailRow,
  type ProjectListRow,
} from "@/repositories/project-repository";
import * as userRepository from "@/repositories/user-repository";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { ActorContext } from "@/types/session";
import type { ProjectDetail, ProjectListItem, ProjectOption } from "@/types/work";
import { formatFullName } from "@/utils/format";
import type { CreateProjectInput, UpdateProjectInput } from "@/validations/project";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "Project";
const MISSING_FILTER_ID = -1;

interface AuditMeta {
  readonly userAgent?: string | null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseDate(value: string, field: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(ERROR_MESSAGES.VALIDATION, {
      fieldErrors: [{ field, message: "Enter a valid date." }],
    });
  }
  return parsed;
}

function parseOptionalDate(value: string | undefined, field: string): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return parseDate(trimmed, field);
}

function toEmployee(user: ProjectListRow["owner"]) {
  return {
    publicId: user.publicId,
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function toListItem(row: ProjectListRow): ProjectListItem {
  return {
    publicId: row.publicId,
    code: row.code,
    name: row.name,
    description: row.description,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    endDate: row.endDate ? row.endDate.toISOString() : null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    taskCount: row._count.tasks,
    owner: toEmployee(row.owner),
  };
}

function toDetail(row: ProjectDetailRow): ProjectDetail {
  return {
    ...toListItem(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireProject(publicId: string): Promise<ProjectDetailRow> {
  const row = await projectRepository.findByPublicId(publicId);
  if (!row) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  return row;
}

async function requireUserId(publicId: string, field: string): Promise<number> {
  const id = await userRepository.findIdByPublicId(publicId);
  if (id === null) {
    throw new ValidationError(ERROR_MESSAGES.NOT_FOUND, {
      fieldErrors: [{ field, message: "Select a valid employee." }],
    });
  }
  return id;
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

function assertDateOrder(startDate: Date | null, endDate: Date | null): void {
  if (startDate && endDate && endDate < startDate) {
    throw new ValidationError(PROJECT_MESSAGES.DATE_ORDER, {
      fieldErrors: [{ field: "endDate", message: PROJECT_MESSAGES.DATE_ORDER }],
    });
  }
}

async function resolveOwnerFilter(publicId: string | undefined): Promise<number | undefined> {
  if (!publicId) return undefined;
  const id = await userRepository.findIdByPublicId(publicId);
  return id ?? MISSING_FILTER_ID;
}

export async function listProjects(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<ProjectListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, PROJECT_SORT_FIELDS, "createdAt");
  const result = await projectRepository.list(
    {
      search: resolveSearchTerm(searchParams),
      status: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, PROJECT_STATUS_VALUES),
      ownerUserId: await resolveOwnerFilter(resolveQueryValue(searchParams, TABLE_QUERY_KEYS.EMPLOYEE)),
    },
    pagination,
    sort,
  );

  return { items: result.items.map(toListItem), meta: result.meta };
}

export async function getProject(publicId: string): Promise<ProjectDetail> {
  return toDetail(await requireProject(publicId));
}

export function listProjectOptions(): Promise<ProjectOption[]> {
  return projectRepository.listOptions();
}

export async function createProject(
  input: CreateProjectInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<ProjectDetail> {
  if (await projectRepository.isCodeTaken(input.code)) {
    throw new ConflictError(PROJECT_MESSAGES.CODE_TAKEN, {
      fieldErrors: [{ field: "code", message: PROJECT_MESSAGES.CODE_TAKEN }],
    });
  }

  const startDate = parseOptionalDate(input.startDate, "startDate");
  const endDate = parseOptionalDate(input.endDate, "endDate");
  assertDateOrder(startDate, endDate);

  const created = await projectRepository.create({
    code: input.code,
    name: input.name,
    description: emptyToNull(input.description),
    ownerUserId: await requireUserId(input.ownerUserPublicId, "ownerUserPublicId"),
    startDate,
    endDate,
    status: input.status ?? PROJECT_STATUS.PLANNED,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Created project ${created.name}`,
    changes: { name: created.name, code: created.code },
  });

  return toDetail(created);
}

export async function updateProject(
  input: UpdateProjectInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<ProjectDetail> {
  const existing = await requireProject(input.publicId);
  if (await projectRepository.isCodeTaken(input.code, input.publicId)) {
    throw new ConflictError(PROJECT_MESSAGES.CODE_TAKEN, {
      fieldErrors: [{ field: "code", message: PROJECT_MESSAGES.CODE_TAKEN }],
    });
  }

  const startDate = parseOptionalDate(input.startDate, "startDate");
  const endDate = parseOptionalDate(input.endDate, "endDate");
  assertDateOrder(startDate, endDate);

  const updated = await projectRepository.update(input.publicId, {
    code: input.code,
    name: input.name,
    description: emptyToNull(input.description),
    ownerUserId: await requireUserId(input.ownerUserPublicId, "ownerUserPublicId"),
    startDate,
    endDate,
    status: input.status,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated project ${updated.name}`,
    changes: {
      name: { from: existing.name, to: updated.name },
      code: { from: existing.code, to: updated.code },
      status: { from: existing.status, to: updated.status },
    },
  });

  return toDetail(updated);
}

export async function deleteProject(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireProject(publicId);
  if (existing._count.tasks > 0) {
    throw new ForbiddenError(PROJECT_MESSAGES.TASKS_ASSIGNED_DELETE);
  }

  const deleted = await projectRepository.remove(publicId);
  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted project ${existing.name}`,
  });
}
