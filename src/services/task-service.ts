import "server-only";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ERROR_MESSAGES, TASK_MESSAGES } from "@/constants/messages";
import { AUDIT_ACTIONS, TASK_STATUS, TASK_STATUS_VALUES } from "@/constants/status";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  resolveAllowedValue,
  resolvePagination,
  resolveQueryValue,
  resolveSearchTerm,
  resolveSort,
} from "@/lib/pagination";
import * as auditRepository from "@/repositories/audit-repository";
import * as projectRepository from "@/repositories/project-repository";
import * as taskRepository from "@/repositories/task-repository";
import {
  TASK_SORT_FIELDS,
  type TaskDetailRow,
  type TaskListRow,
} from "@/repositories/task-repository";
import * as userRepository from "@/repositories/user-repository";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { ActorContext } from "@/types/session";
import type { TaskDetail, TaskListItem, TaskOption } from "@/types/work";
import { formatFullName } from "@/utils/format";
import type { CreateTaskInput, UpdateTaskInput } from "@/validations/task";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "Task";
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

function toEmployee(user: NonNullable<TaskListRow["assignee"]>) {
  return {
    publicId: user.publicId,
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function toListItem(row: TaskListRow): TaskListItem {
  return {
    publicId: row.publicId,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    worklogCount: row._count.worklogs,
    project: row.project,
    assignee: row.assignee ? toEmployee(row.assignee) : null,
  };
}

function toDetail(row: TaskDetailRow): TaskDetail {
  return {
    ...toListItem(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireTask(publicId: string): Promise<TaskDetailRow> {
  const row = await taskRepository.findByPublicId(publicId);
  if (!row) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  return row;
}

async function requireProjectId(publicId: string): Promise<number> {
  const id = await projectRepository.findIdByPublicId(publicId);
  if (id === null) {
    throw new ValidationError(ERROR_MESSAGES.NOT_FOUND, {
      fieldErrors: [{ field: "projectPublicId", message: "Select a valid project." }],
    });
  }
  return id;
}

async function resolveOptionalUserId(publicId: string | undefined): Promise<number | null> {
  const trimmed = publicId?.trim();
  if (!trimmed) return null;
  const id = await userRepository.findIdByPublicId(trimmed);
  if (id === null) {
    throw new ValidationError(ERROR_MESSAGES.NOT_FOUND, {
      fieldErrors: [{ field: "assigneeUserPublicId", message: "Select a valid employee." }],
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

async function resolveIdFilter(
  publicId: string | undefined,
  lookup: (id: string) => Promise<number | null>,
): Promise<number | undefined> {
  if (!publicId) return undefined;
  const id = await lookup(publicId);
  return id ?? MISSING_FILTER_ID;
}

export async function listTasks(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<TaskListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, TASK_SORT_FIELDS, "createdAt");
  const [projectId, assigneeUserId] = await Promise.all([
    resolveIdFilter(
      resolveQueryValue(searchParams, TABLE_QUERY_KEYS.PROJECT),
      projectRepository.findIdByPublicId,
    ),
    resolveIdFilter(
      resolveQueryValue(searchParams, TABLE_QUERY_KEYS.EMPLOYEE),
      userRepository.findIdByPublicId,
    ),
  ]);

  const result = await taskRepository.list(
    {
      search: resolveSearchTerm(searchParams),
      status: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, TASK_STATUS_VALUES),
      projectId,
      assigneeUserId,
    },
    pagination,
    sort,
  );

  return { items: result.items.map(toListItem), meta: result.meta };
}

export async function getTask(publicId: string): Promise<TaskDetail> {
  return toDetail(await requireTask(publicId));
}

export function listTaskOptions(): Promise<TaskOption[]> {
  return taskRepository.listOptions();
}

export async function createTask(
  input: CreateTaskInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<TaskDetail> {
  const created = await taskRepository.create({
    projectId: await requireProjectId(input.projectPublicId),
    title: input.title,
    description: emptyToNull(input.description),
    assigneeUserId: await resolveOptionalUserId(input.assigneeUserPublicId),
    dueDate: parseOptionalDate(input.dueDate, "dueDate"),
    status: input.status ?? TASK_STATUS.TODO,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Created task ${created.title}`,
    changes: { title: created.title, project: created.project.code },
  });

  return toDetail(created);
}

export async function updateTask(
  input: UpdateTaskInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<TaskDetail> {
  const existing = await requireTask(input.publicId);
  const updated = await taskRepository.update(input.publicId, {
    projectId: await requireProjectId(input.projectPublicId),
    title: input.title,
    description: emptyToNull(input.description),
    assigneeUserId: await resolveOptionalUserId(input.assigneeUserPublicId),
    dueDate: parseOptionalDate(input.dueDate, "dueDate"),
    status: input.status,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated task ${updated.title}`,
    changes: {
      title: { from: existing.title, to: updated.title },
      status: { from: existing.status, to: updated.status },
    },
  });

  return toDetail(updated);
}

export async function deleteTask(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireTask(publicId);
  if (existing._count.worklogs > 0) {
    throw new ForbiddenError(TASK_MESSAGES.WORKLOGS_ASSIGNED_DELETE);
  }

  const deleted = await taskRepository.remove(publicId);
  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted task ${existing.title}`,
  });
}
