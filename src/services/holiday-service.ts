import "server-only";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ERROR_MESSAGES, HOLIDAY_MESSAGES } from "@/constants/messages";
import {
  AUDIT_ACTIONS,
  HOLIDAY_TYPE_VALUES,
  RECORD_STATUS,
  RECORD_STATUS_VALUES,
  type RecordStatus,
} from "@/constants/status";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  resolveAllowedValue,
  resolvePagination,
  resolveSearchTerm,
  resolveSort,
} from "@/lib/pagination";
import * as auditRepository from "@/repositories/audit-repository";
import * as holidayRepository from "@/repositories/holiday-repository";
import {
  HOLIDAY_SORT_FIELDS,
  type HolidayDetailRow,
  type HolidayListRow,
} from "@/repositories/holiday-repository";
import type { HolidayDetail, HolidayListItem } from "@/types/hr";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";
import type { CreateHolidayInput, UpdateHolidayInput } from "@/validations/holiday";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "Holiday";

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

function toListItem(row: HolidayListRow): HolidayListItem {
  return {
    publicId: row.publicId,
    holidayDate: row.holidayDate.toISOString(),
    name: row.name,
    type: row.type,
    notes: row.notes,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDetail(row: HolidayDetailRow): HolidayDetail {
  return {
    ...toListItem(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireHoliday(publicId: string): Promise<HolidayDetailRow> {
  const row = await holidayRepository.findByPublicId(publicId);
  if (!row) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  return row;
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

export async function listHolidays(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<HolidayListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, HOLIDAY_SORT_FIELDS, "createdAt");
  const result = await holidayRepository.list(
    {
      search: resolveSearchTerm(searchParams),
      status: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES),
      type: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.TYPE, HOLIDAY_TYPE_VALUES),
    },
    pagination,
    sort,
  );

  return { items: result.items.map(toListItem), meta: result.meta };
}

export async function getHoliday(publicId: string): Promise<HolidayDetail> {
  return toDetail(await requireHoliday(publicId));
}

export async function createHoliday(
  input: CreateHolidayInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<HolidayDetail> {
  const holidayDate = parseDate(input.holidayDate, "holidayDate");
  if (await holidayRepository.isDateTaken(holidayDate)) {
    throw new ConflictError(HOLIDAY_MESSAGES.DATE_TAKEN, {
      fieldErrors: [{ field: "holidayDate", message: HOLIDAY_MESSAGES.DATE_TAKEN }],
    });
  }

  const created = await holidayRepository.create({
    holidayDate,
    name: input.name,
    type: input.type,
    notes: emptyToNull(input.notes),
    status: RECORD_STATUS.ACTIVE,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Created holiday ${created.name}`,
    changes: { name: created.name, holidayDate: input.holidayDate },
  });

  return toDetail(created);
}

export async function updateHoliday(
  input: UpdateHolidayInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<HolidayDetail> {
  const existing = await requireHoliday(input.publicId);
  const holidayDate = parseDate(input.holidayDate, "holidayDate");
  if (await holidayRepository.isDateTaken(holidayDate, input.publicId)) {
    throw new ConflictError(HOLIDAY_MESSAGES.DATE_TAKEN, {
      fieldErrors: [{ field: "holidayDate", message: HOLIDAY_MESSAGES.DATE_TAKEN }],
    });
  }

  const updated = await holidayRepository.update(input.publicId, {
    holidayDate,
    name: input.name,
    type: input.type,
    notes: emptyToNull(input.notes),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated holiday ${updated.name}`,
    changes: {
      name: { from: existing.name, to: updated.name },
      holidayDate: {
        from: existing.holidayDate.toISOString(),
        to: updated.holidayDate.toISOString(),
      },
    },
  });

  return toDetail(updated);
}

export async function setHolidayStatus(
  publicId: string,
  status: RecordStatus,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<HolidayDetail> {
  const existing = await requireHoliday(publicId);
  if (existing.status === status) {
    return toDetail(existing);
  }

  const updated = await holidayRepository.update(publicId, { status });
  await writeAudit(actor, meta, {
    action: status === RECORD_STATUS.ACTIVE ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `${status === RECORD_STATUS.ACTIVE ? "Activated" : "Deactivated"} holiday ${updated.name}`,
    changes: { status: { from: existing.status, to: status } },
  });

  return toDetail(updated);
}

export async function deleteHoliday(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireHoliday(publicId);
  const deleted = await holidayRepository.remove(publicId);

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted holiday ${existing.name}`,
  });
}
