import "server-only";

import type { HolidayType, RecordStatus } from "@/constants/status";
import { buildPaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { PaginatedResult, PaginationParams, SortParams } from "@/types/pagination";
import { contains, findPageAndTotal, orderByWithTiebreak } from "./base";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

const LIST_SELECT = {
  id: true,
  publicId: true,
  holidayDate: true,
  name: true,
  type: true,
  notes: true,
  status: true,
  createdAt: true,
} satisfies Prisma.HolidaySelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  updatedAt: true,
} satisfies Prisma.HolidaySelect;

export type HolidayListRow = Prisma.HolidayGetPayload<{ select: typeof LIST_SELECT }>;
export type HolidayDetailRow = Prisma.HolidayGetPayload<{ select: typeof DETAIL_SELECT }>;

export const HOLIDAY_SORT_FIELDS = ["holidayDate", "name", "type", "status", "createdAt"] as const;
export type HolidaySortField = (typeof HOLIDAY_SORT_FIELDS)[number];

export interface HolidayListFilters {
  readonly search?: string | undefined;
  readonly status?: RecordStatus | undefined;
  readonly type?: HolidayType | undefined;
}

export interface CreateHolidayInput {
  readonly holidayDate: Date;
  readonly name: string;
  readonly type: HolidayType;
  readonly notes?: string | null;
  readonly status: RecordStatus;
}

export interface UpdateHolidayInput {
  readonly holidayDate?: Date;
  readonly name?: string;
  readonly type?: HolidayType;
  readonly notes?: string | null;
  readonly status?: RecordStatus;
}

export async function list(
  filters: HolidayListFilters,
  pagination: PaginationParams,
  sort: SortParams<HolidaySortField>,
): Promise<PaginatedResult<HolidayListRow>> {
  const where: Prisma.HolidayWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;

  const term = filters.search?.trim();
  if (term) {
    where.OR = [{ name: contains(term) }, { notes: contains(term) }];
  }

  const [items, total] = await withPrismaErrors("holiday.list", () =>
    findPageAndTotal(
      prisma.holiday.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.holiday.count({ where }),
    ),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function findByPublicId(publicId: string): Promise<HolidayDetailRow | null> {
  return withPrismaErrors("holiday.findByPublicId", () =>
    prisma.holiday.findUnique({ where: { publicId }, select: DETAIL_SELECT }),
  );
}

export function create(input: CreateHolidayInput): Promise<HolidayDetailRow> {
  return withPrismaErrors("holiday.create", () =>
    prisma.holiday.create({
      data: {
        holidayDate: input.holidayDate,
        name: input.name,
        type: input.type,
        notes: input.notes ?? null,
        status: input.status,
      },
      select: DETAIL_SELECT,
    }),
  );
}

export function update(publicId: string, input: UpdateHolidayInput): Promise<HolidayDetailRow> {
  const data: Prisma.HolidayUpdateInput = {};
  if (input.holidayDate !== undefined) data.holidayDate = input.holidayDate;
  if (input.name !== undefined) data.name = input.name;
  if (input.type !== undefined) data.type = input.type;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.status !== undefined) data.status = input.status;

  return withPrismaErrors("holiday.update", () =>
    prisma.holiday.update({ where: { publicId }, data, select: DETAIL_SELECT }),
  );
}

export function remove(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("holiday.remove", () =>
    prisma.holiday.delete({ where: { publicId }, select: { id: true } }),
  );
}

export function listUpcoming(fromDate: Date, take: number): Promise<HolidayListRow[]> {
  return withPrismaErrors("holiday.listUpcoming", () =>
    prisma.holiday.findMany({
      where: { holidayDate: { gte: fromDate }, status: "ACTIVE" },
      select: LIST_SELECT,
      orderBy: { holidayDate: "asc" },
      take,
    }),
  );
}

export function isDateTaken(holidayDate: Date, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("holiday.isDateTaken", async () => {
    const found = await prisma.holiday.findFirst({
      where: {
        holidayDate,
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}
