import "server-only";

import type { AttendanceDayStatus } from "@/constants/status";
import { buildPaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { PaginatedResult, PaginationParams, SortParams } from "@/types/pagination";
import { contains, orderByWithTiebreak } from "./base";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

const USER_SELECT = {
  publicId: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const LIST_SELECT = {
  id: true,
  publicId: true,
  workDate: true,
  status: true,
  checkIn: true,
  checkOut: true,
  notes: true,
  createdAt: true,
  user: { select: USER_SELECT },
} satisfies Prisma.AttendanceSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  updatedAt: true,
} satisfies Prisma.AttendanceSelect;

export type AttendanceListRow = Prisma.AttendanceGetPayload<{ select: typeof LIST_SELECT }>;
export type AttendanceDetailRow = Prisma.AttendanceGetPayload<{ select: typeof DETAIL_SELECT }>;

export const ATTENDANCE_SORT_FIELDS = ["workDate", "status", "createdAt"] as const;
export type AttendanceSortField = (typeof ATTENDANCE_SORT_FIELDS)[number];

export interface AttendanceListFilters {
  readonly search?: string | undefined;
  readonly status?: AttendanceDayStatus | undefined;
  readonly userId?: number | undefined;
}

export interface CreateAttendanceInput {
  readonly userId: number;
  readonly workDate: Date;
  readonly status: AttendanceDayStatus;
  readonly checkIn?: string | null;
  readonly checkOut?: string | null;
  readonly notes?: string | null;
}

export interface UpdateAttendanceInput {
  readonly userId?: number;
  readonly workDate?: Date;
  readonly status?: AttendanceDayStatus;
  readonly checkIn?: string | null;
  readonly checkOut?: string | null;
  readonly notes?: string | null;
}

export async function list(
  filters: AttendanceListFilters,
  pagination: PaginationParams,
  sort: SortParams<AttendanceSortField>,
): Promise<PaginatedResult<AttendanceListRow>> {
  const where: Prisma.AttendanceWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.userId !== undefined) where.userId = filters.userId;

  const term = filters.search?.trim();
  if (term) {
    where.OR = [
      { notes: contains(term) },
      { user: { firstName: contains(term) } },
      { user: { lastName: contains(term) } },
      { user: { employeeCode: contains(term) } },
    ];
  }

  const [items, total] = await withPrismaErrors("attendance.list", () =>
    prisma.$transaction([
      prisma.attendance.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.attendance.count({ where }),
    ]),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function findByPublicId(publicId: string): Promise<AttendanceDetailRow | null> {
  return withPrismaErrors("attendance.findByPublicId", () =>
    prisma.attendance.findUnique({ where: { publicId }, select: DETAIL_SELECT }),
  );
}

export function create(input: CreateAttendanceInput): Promise<AttendanceDetailRow> {
  return withPrismaErrors("attendance.create", () =>
    prisma.attendance.create({
      data: {
        userId: input.userId,
        workDate: input.workDate,
        status: input.status,
        checkIn: input.checkIn ?? null,
        checkOut: input.checkOut ?? null,
        notes: input.notes ?? null,
      },
      select: DETAIL_SELECT,
    }),
  );
}

export function update(publicId: string, input: UpdateAttendanceInput): Promise<AttendanceDetailRow> {
  const data: Prisma.AttendanceUpdateInput = {};
  if (input.userId !== undefined) data.user = { connect: { id: input.userId } };
  if (input.workDate !== undefined) data.workDate = input.workDate;
  if (input.status !== undefined) data.status = input.status;
  if (input.checkIn !== undefined) data.checkIn = input.checkIn;
  if (input.checkOut !== undefined) data.checkOut = input.checkOut;
  if (input.notes !== undefined) data.notes = input.notes;

  return withPrismaErrors("attendance.update", () =>
    prisma.attendance.update({ where: { publicId }, data, select: DETAIL_SELECT }),
  );
}

export function remove(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("attendance.remove", () =>
    prisma.attendance.delete({ where: { publicId }, select: { id: true } }),
  );
}

export function countByStatusForDate(
  workDate: Date,
): Promise<{ status: AttendanceDayStatus; count: number }[]> {
  return withPrismaErrors("attendance.countByStatusForDate", async () => {
    const grouped = await prisma.attendance.groupBy({
      by: ["status"],
      where: { workDate },
      _count: { _all: true },
    });
    return grouped.map((row) => ({ status: row.status, count: row._count._all }));
  });
}

export function isUserDateTaken(
  userId: number,
  workDate: Date,
  exceptPublicId?: string,
): Promise<boolean> {
  return withPrismaErrors("attendance.isUserDateTaken", async () => {
    const found = await prisma.attendance.findFirst({
      where: {
        userId,
        workDate,
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}
