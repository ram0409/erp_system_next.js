import "server-only";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ERROR_MESSAGES, LEAVE_MESSAGES } from "@/constants/messages";
import {
  AUDIT_ACTIONS,
  LEAVE_STATUS,
  LEAVE_STATUS_VALUES,
  LEAVE_TYPE_VALUES,
} from "@/constants/status";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  resolveAllowedValue,
  resolvePagination,
  resolveQueryValue,
  resolveSearchTerm,
  resolveSort,
} from "@/lib/pagination";
import * as auditRepository from "@/repositories/audit-repository";
import * as leaveRepository from "@/repositories/leave-repository";
import {
  LEAVE_SORT_FIELDS,
  type LeaveDetailRow,
  type LeaveListRow,
} from "@/repositories/leave-repository";
import * as userRepository from "@/repositories/user-repository";
import * as notificationService from "@/services/notification-service";
import type { LeaveDetail, LeaveListItem } from "@/types/hr";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";
import type { CreateLeaveInput, UpdateLeaveInput } from "@/validations/leave";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "LeaveRequest";
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

function toEmployee(user: LeaveListRow["user"]) {
  return {
    publicId: user.publicId,
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function toListItem(row: LeaveListRow): LeaveListItem {
  return {
    publicId: row.publicId,
    type: row.type,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    user: toEmployee(row.user),
  };
}

function toDetail(row: LeaveDetailRow): LeaveDetail {
  return {
    ...toListItem(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireLeave(publicId: string): Promise<LeaveDetailRow> {
  const row = await leaveRepository.findByPublicId(publicId);
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

async function resolveUserFilter(publicId: string | undefined): Promise<number | undefined> {
  if (!publicId) return undefined;
  const id = await userRepository.findIdByPublicId(publicId);
  return id ?? MISSING_FILTER_ID;
}

export async function listLeave(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<LeaveListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, LEAVE_SORT_FIELDS, "createdAt");
  const result = await leaveRepository.list(
    {
      search: resolveSearchTerm(searchParams),
      status: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, LEAVE_STATUS_VALUES),
      type: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.TYPE, LEAVE_TYPE_VALUES),
      userId: await resolveUserFilter(resolveQueryValue(searchParams, TABLE_QUERY_KEYS.EMPLOYEE)),
    },
    pagination,
    sort,
  );

  return { items: result.items.map(toListItem), meta: result.meta };
}

export async function getLeave(publicId: string): Promise<LeaveDetail> {
  return toDetail(await requireLeave(publicId));
}

function assertDateOrder(startDate: Date, endDate: Date): void {
  if (endDate < startDate) {
    throw new ValidationError(LEAVE_MESSAGES.DATE_ORDER, {
      fieldErrors: [{ field: "endDate", message: LEAVE_MESSAGES.DATE_ORDER }],
    });
  }
}

export async function createLeave(
  input: CreateLeaveInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<LeaveDetail> {
  const userId = await requireUserId(input.userPublicId);
  const startDate = parseDate(input.startDate, "startDate");
  const endDate = parseDate(input.endDate, "endDate");
  assertDateOrder(startDate, endDate);

  const created = await leaveRepository.create({
    userId,
    type: input.type,
    startDate,
    endDate,
    reason: emptyToNull(input.reason),
    status: input.status ?? LEAVE_STATUS.PENDING,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Created leave request for ${formatFullName(created.user.firstName, created.user.lastName)}`,
    changes: { type: created.type, status: created.status },
  });

  await notificationService.notifyLeaveRequested(created, actor.userId);

  return toDetail(created);
}

export async function updateLeave(
  input: UpdateLeaveInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<LeaveDetail> {
  const existing = await requireLeave(input.publicId);
  const userId = await requireUserId(input.userPublicId);
  const startDate = parseDate(input.startDate, "startDate");
  const endDate = parseDate(input.endDate, "endDate");
  assertDateOrder(startDate, endDate);

  const updated = await leaveRepository.update(input.publicId, {
    userId,
    type: input.type,
    startDate,
    endDate,
    reason: emptyToNull(input.reason),
    status: input.status,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated leave request for ${formatFullName(updated.user.firstName, updated.user.lastName)}`,
    changes: {
      status: { from: existing.status, to: updated.status },
      type: { from: existing.type, to: updated.type },
    },
  });

  return toDetail(updated);
}

export async function deleteLeave(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireLeave(publicId);
  const deleted = await leaveRepository.remove(publicId);

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted leave request for ${formatFullName(existing.user.firstName, existing.user.lastName)}`,
  });
}
