import "server-only";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ERROR_MESSAGES, WORKLOG_MESSAGES } from "@/constants/messages";
import { AUDIT_ACTIONS } from "@/constants/status";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  resolvePagination,
  resolveQueryValue,
  resolveSearchTerm,
  resolveSort,
} from "@/lib/pagination";
import * as auditRepository from "@/repositories/audit-repository";
import * as projectRepository from "@/repositories/project-repository";
import * as taskRepository from "@/repositories/task-repository";
import * as userRepository from "@/repositories/user-repository";
import * as worklogRepository from "@/repositories/worklog-repository";
import {
  WORKLOG_SORT_FIELDS,
  type WorklogDetailRow,
  type WorklogListRow,
} from "@/repositories/worklog-repository";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { ActorContext } from "@/types/session";
import type { WorklogDetail, WorklogListItem } from "@/types/work";
import { formatFullName } from "@/utils/format";
import type { CreateWorklogInput, UpdateWorklogInput } from "@/validations/worklog";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "Worklog";
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

function toEmployee(user: WorklogListRow["user"]) {
  return {
    publicId: user.publicId,
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function toListItem(row: WorklogListRow): WorklogListItem {
  return {
    publicId: row.publicId,
    workDate: row.workDate.toISOString(),
    hours: Number(row.hours),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    task: row.task,
    user: toEmployee(row.user),
  };
}

function toDetail(row: WorklogDetailRow): WorklogDetail {
  return {
    ...toListItem(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireWorklog(publicId: string): Promise<WorklogDetailRow> {
  const row = await worklogRepository.findByPublicId(publicId);
  if (!row) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  return row;
}

async function requireUserId(publicId: string): Promise<number> {
  const id = await userRepository.findIdByPublicId(publicId);
  if (id === null) {
    throw new ValidationError(ERROR_MESSAGES.NOT_FOUND, {
      fieldErrors: [{ field: "userPublicId", message: "Select a valid employee." }],
    });
  }
  return id;
}

async function requireTaskId(publicId: string): Promise<number> {
  const id = await taskRepository.findIdByPublicId(publicId);
  if (id === null) {
    throw new ValidationError(ERROR_MESSAGES.NOT_FOUND, {
      fieldErrors: [{ field: "taskPublicId", message: "Select a valid task." }],
    });
  }
  return id;
}

function assertHours(hours: number): void {
  if (!Number.isFinite(hours) || hours < 0.25 || hours > 24) {
    throw new ValidationError(WORKLOG_MESSAGES.HOURS_RANGE, {
      fieldErrors: [{ field: "hours", message: WORKLOG_MESSAGES.HOURS_RANGE }],
    });
  }
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

async function resolveIdFilter(
  publicId: string | undefined,
  lookup: (id: string) => Promise<number | null>,
): Promise<number | undefined> {
  if (!publicId) return undefined;
  const id = await lookup(publicId);
  return id ?? MISSING_FILTER_ID;
}

export async function listWorklogs(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<WorklogListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, WORKLOG_SORT_FIELDS, "createdAt");
  const [userId, projectId] = await Promise.all([
    resolveIdFilter(
      resolveQueryValue(searchParams, TABLE_QUERY_KEYS.EMPLOYEE),
      userRepository.findIdByPublicId,
    ),
    resolveIdFilter(
      resolveQueryValue(searchParams, TABLE_QUERY_KEYS.PROJECT),
      projectRepository.findIdByPublicId,
    ),
  ]);

  const result = await worklogRepository.list(
    {
      search: resolveSearchTerm(searchParams),
      userId,
      projectId,
    },
    pagination,
    sort,
  );

  return { items: result.items.map(toListItem), meta: result.meta };
}

export async function getWorklog(publicId: string): Promise<WorklogDetail> {
  return toDetail(await requireWorklog(publicId));
}

export async function createWorklog(
  input: CreateWorklogInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<WorklogDetail> {
  assertHours(input.hours);
  const created = await worklogRepository.create({
    taskId: await requireTaskId(input.taskPublicId),
    userId: await requireUserId(input.userPublicId),
    workDate: parseDate(input.workDate, "workDate"),
    hours: input.hours,
    notes: emptyToNull(input.notes),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Logged ${input.hours} hours for ${formatFullName(created.user.firstName, created.user.lastName)}`,
    changes: { hours: input.hours, workDate: input.workDate },
  });

  return toDetail(created);
}

export async function updateWorklog(
  input: UpdateWorklogInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<WorklogDetail> {
  const existing = await requireWorklog(input.publicId);
  assertHours(input.hours);
  const updated = await worklogRepository.update(input.publicId, {
    taskId: await requireTaskId(input.taskPublicId),
    userId: await requireUserId(input.userPublicId),
    workDate: parseDate(input.workDate, "workDate"),
    hours: input.hours,
    notes: emptyToNull(input.notes),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated worklog for ${formatFullName(updated.user.firstName, updated.user.lastName)}`,
    changes: {
      hours: { from: Number(existing.hours), to: Number(updated.hours) },
      workDate: {
        from: existing.workDate.toISOString(),
        to: updated.workDate.toISOString(),
      },
    },
  });

  return toDetail(updated);
}

export async function deleteWorklog(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireWorklog(publicId);
  const deleted = await worklogRepository.remove(publicId);

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted worklog for ${formatFullName(existing.user.firstName, existing.user.lastName)}`,
  });
}
