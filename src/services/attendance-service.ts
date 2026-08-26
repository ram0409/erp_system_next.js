import "server-only";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ATTENDANCE_MESSAGES, ERROR_MESSAGES } from "@/constants/messages";
import { ATTENDANCE_DAY_STATUS_VALUES, AUDIT_ACTIONS } from "@/constants/status";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  resolveAllowedValue,
  resolvePagination,
  resolveQueryValue,
  resolveSearchTerm,
  resolveSort,
} from "@/lib/pagination";
import * as attendanceRepository from "@/repositories/attendance-repository";
import {
  ATTENDANCE_SORT_FIELDS,
  type AttendanceDetailRow,
  type AttendanceListRow,
} from "@/repositories/attendance-repository";
import * as auditRepository from "@/repositories/audit-repository";
import * as userRepository from "@/repositories/user-repository";
import type { AttendanceDetail, AttendanceListItem } from "@/types/hr";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";
import type { CreateAttendanceInput, UpdateAttendanceInput } from "@/validations/attendance";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "Attendance";
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

function parseTime(value: string | undefined): string | null {
  const trimmed = emptyToNull(value);
  return trimmed ? trimmed.slice(0, 5) : null;
}

function toEmployee(user: AttendanceListRow["user"]) {
  return {
    publicId: user.publicId,
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function toListItem(row: AttendanceListRow): AttendanceListItem {
  return {
    publicId: row.publicId,
    workDate: row.workDate.toISOString(),
    status: row.status,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    user: toEmployee(row.user),
  };
}

function toDetail(row: AttendanceDetailRow): AttendanceDetail {
  return {
    ...toListItem(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireAttendance(publicId: string): Promise<AttendanceDetailRow> {
  const row = await attendanceRepository.findByPublicId(publicId);
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

export async function listAttendance(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<AttendanceListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, ATTENDANCE_SORT_FIELDS, "createdAt");
  const result = await attendanceRepository.list(
    {
      search: resolveSearchTerm(searchParams),
      status: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, ATTENDANCE_DAY_STATUS_VALUES),
      userId: await resolveUserFilter(resolveQueryValue(searchParams, TABLE_QUERY_KEYS.EMPLOYEE)),
    },
    pagination,
    sort,
  );

  return { items: result.items.map(toListItem), meta: result.meta };
}

export async function getAttendance(publicId: string): Promise<AttendanceDetail> {
  return toDetail(await requireAttendance(publicId));
}

export async function createAttendance(
  input: CreateAttendanceInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<AttendanceDetail> {
  const userId = await requireUserId(input.userPublicId);
  const workDate = parseDate(input.workDate, "workDate");

  if (await attendanceRepository.isUserDateTaken(userId, workDate)) {
    throw new ConflictError(ATTENDANCE_MESSAGES.DUPLICATE_DAY, {
      fieldErrors: [{ field: "workDate", message: ATTENDANCE_MESSAGES.DUPLICATE_DAY }],
    });
  }

  const created = await attendanceRepository.create({
    userId,
    workDate,
    status: input.status,
    checkIn: parseTime(input.checkIn),
    checkOut: parseTime(input.checkOut),
    notes: emptyToNull(input.notes),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Recorded attendance for ${formatFullName(created.user.firstName, created.user.lastName)} on ${input.workDate}`,
    changes: { workDate: input.workDate, status: created.status },
  });

  return toDetail(created);
}

export async function updateAttendance(
  input: UpdateAttendanceInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<AttendanceDetail> {
  const existing = await requireAttendance(input.publicId);
  const userId = await requireUserId(input.userPublicId);
  const workDate = parseDate(input.workDate, "workDate");

  if (await attendanceRepository.isUserDateTaken(userId, workDate, input.publicId)) {
    throw new ConflictError(ATTENDANCE_MESSAGES.DUPLICATE_DAY, {
      fieldErrors: [{ field: "workDate", message: ATTENDANCE_MESSAGES.DUPLICATE_DAY }],
    });
  }

  const updated = await attendanceRepository.update(input.publicId, {
    userId,
    workDate,
    status: input.status,
    checkIn: parseTime(input.checkIn),
    checkOut: parseTime(input.checkOut),
    notes: emptyToNull(input.notes),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated attendance for ${formatFullName(updated.user.firstName, updated.user.lastName)} on ${input.workDate}`,
    changes: {
      status: { from: existing.status, to: updated.status },
      workDate: { from: existing.workDate.toISOString(), to: updated.workDate.toISOString() },
    },
  });

  return toDetail(updated);
}

export async function deleteAttendance(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireAttendance(publicId);
  const deleted = await attendanceRepository.remove(publicId);

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted attendance for ${formatFullName(existing.user.firstName, existing.user.lastName)}`,
  });
}
