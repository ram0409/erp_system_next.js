import "server-only";

import type { LeaveStatus, LeaveType } from "@/constants/status";
import { buildPaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { PaginatedResult, PaginationParams, SortParams } from "@/types/pagination";
import { contains, findPageAndTotal, orderByWithTiebreak } from "./base";
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
  type: true,
  startDate: true,
  endDate: true,
  reason: true,
  status: true,
  createdAt: true,
  user: { select: USER_SELECT },
} satisfies Prisma.LeaveRequestSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  updatedAt: true,
} satisfies Prisma.LeaveRequestSelect;

export type LeaveListRow = Prisma.LeaveRequestGetPayload<{ select: typeof LIST_SELECT }>;
export type LeaveDetailRow = Prisma.LeaveRequestGetPayload<{ select: typeof DETAIL_SELECT }>;

export const LEAVE_SORT_FIELDS = ["startDate", "endDate", "status", "createdAt"] as const;
export type LeaveSortField = (typeof LEAVE_SORT_FIELDS)[number];

export interface LeaveListFilters {
  readonly search?: string | undefined;
  readonly status?: LeaveStatus | undefined;
  readonly type?: LeaveType | undefined;
  readonly userId?: number | undefined;
}

export interface CreateLeaveInput {
  readonly userId: number;
  readonly type: LeaveType;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly reason?: string | null;
  readonly status: LeaveStatus;
}

export interface UpdateLeaveInput {
  readonly userId?: number;
  readonly type?: LeaveType;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly reason?: string | null;
  readonly status?: LeaveStatus;
}

export async function list(
  filters: LeaveListFilters,
  pagination: PaginationParams,
  sort: SortParams<LeaveSortField>,
): Promise<PaginatedResult<LeaveListRow>> {
  const where: Prisma.LeaveRequestWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  if (filters.userId !== undefined) where.userId = filters.userId;

  const term = filters.search?.trim();
  if (term) {
    where.OR = [
      { reason: contains(term) },
      { user: { firstName: contains(term) } },
      { user: { lastName: contains(term) } },
      { user: { employeeCode: contains(term) } },
    ];
  }

  const [items, total] = await withPrismaErrors("leave.list", () =>
    findPageAndTotal(
      prisma.leaveRequest.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.leaveRequest.count({ where }),
    ),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function countByStatus(): Promise<{ status: LeaveStatus; count: number }[]> {
  return withPrismaErrors("leave.countByStatus", async () => {
    const grouped = await prisma.leaveRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    return grouped.map((row) => ({ status: row.status, count: row._count._all }));
  });
}

export function findByPublicId(publicId: string): Promise<LeaveDetailRow | null> {
  return withPrismaErrors("leave.findByPublicId", () =>
    prisma.leaveRequest.findUnique({ where: { publicId }, select: DETAIL_SELECT }),
  );
}

export function create(input: CreateLeaveInput): Promise<LeaveDetailRow> {
  return withPrismaErrors("leave.create", () =>
    prisma.leaveRequest.create({
      data: {
        userId: input.userId,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason ?? null,
        status: input.status,
      },
      select: DETAIL_SELECT,
    }),
  );
}

export function update(publicId: string, input: UpdateLeaveInput): Promise<LeaveDetailRow> {
  const data: Prisma.LeaveRequestUpdateInput = {};
  if (input.userId !== undefined) data.user = { connect: { id: input.userId } };
  if (input.type !== undefined) data.type = input.type;
  if (input.startDate !== undefined) data.startDate = input.startDate;
  if (input.endDate !== undefined) data.endDate = input.endDate;
  if (input.reason !== undefined) data.reason = input.reason;
  if (input.status !== undefined) data.status = input.status;

  return withPrismaErrors("leave.update", () =>
    prisma.leaveRequest.update({ where: { publicId }, data, select: DETAIL_SELECT }),
  );
}

export function remove(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("leave.remove", () =>
    prisma.leaveRequest.delete({ where: { publicId }, select: { id: true } }),
  );
}
