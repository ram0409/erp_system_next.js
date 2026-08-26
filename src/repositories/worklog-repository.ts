import "server-only";

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

const TASK_SELECT = {
  publicId: true,
  title: true,
  project: { select: { publicId: true, code: true, name: true } },
} satisfies Prisma.TaskSelect;

const LIST_SELECT = {
  id: true,
  publicId: true,
  workDate: true,
  hours: true,
  notes: true,
  createdAt: true,
  task: { select: TASK_SELECT },
  user: { select: USER_SELECT },
} satisfies Prisma.WorklogSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  updatedAt: true,
} satisfies Prisma.WorklogSelect;

export type WorklogListRow = Prisma.WorklogGetPayload<{ select: typeof LIST_SELECT }>;
export type WorklogDetailRow = Prisma.WorklogGetPayload<{ select: typeof DETAIL_SELECT }>;

export const WORKLOG_SORT_FIELDS = ["workDate", "hours", "createdAt"] as const;
export type WorklogSortField = (typeof WORKLOG_SORT_FIELDS)[number];

export interface WorklogListFilters {
  readonly search?: string | undefined;
  readonly userId?: number | undefined;
  readonly taskId?: number | undefined;
  readonly projectId?: number | undefined;
}

export interface CreateWorklogInput {
  readonly taskId: number;
  readonly userId: number;
  readonly workDate: Date;
  readonly hours: number;
  readonly notes?: string | null;
}

export interface UpdateWorklogInput {
  readonly taskId?: number;
  readonly userId?: number;
  readonly workDate?: Date;
  readonly hours?: number;
  readonly notes?: string | null;
}

export async function list(
  filters: WorklogListFilters,
  pagination: PaginationParams,
  sort: SortParams<WorklogSortField>,
): Promise<PaginatedResult<WorklogListRow>> {
  const where: Prisma.WorklogWhereInput = {};
  if (filters.userId !== undefined) where.userId = filters.userId;
  if (filters.taskId !== undefined) where.taskId = filters.taskId;
  if (filters.projectId !== undefined) where.task = { projectId: filters.projectId };

  const term = filters.search?.trim();
  if (term) {
    where.OR = [
      { notes: contains(term) },
      { task: { title: contains(term) } },
      { user: { firstName: contains(term) } },
      { user: { lastName: contains(term) } },
      { user: { employeeCode: contains(term) } },
    ];
  }

  const [items, total] = await withPrismaErrors("worklog.list", () =>
    prisma.$transaction([
      prisma.worklog.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.worklog.count({ where }),
    ]),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function findByPublicId(publicId: string): Promise<WorklogDetailRow | null> {
  return withPrismaErrors("worklog.findByPublicId", () =>
    prisma.worklog.findUnique({ where: { publicId }, select: DETAIL_SELECT }),
  );
}

export function create(input: CreateWorklogInput): Promise<WorklogDetailRow> {
  return withPrismaErrors("worklog.create", () =>
    prisma.worklog.create({
      data: {
        taskId: input.taskId,
        userId: input.userId,
        workDate: input.workDate,
        hours: input.hours,
        notes: input.notes ?? null,
      },
      select: DETAIL_SELECT,
    }),
  );
}

export function update(publicId: string, input: UpdateWorklogInput): Promise<WorklogDetailRow> {
  const data: Prisma.WorklogUpdateInput = {};
  if (input.taskId !== undefined) data.task = { connect: { id: input.taskId } };
  if (input.userId !== undefined) data.user = { connect: { id: input.userId } };
  if (input.workDate !== undefined) data.workDate = input.workDate;
  if (input.hours !== undefined) data.hours = input.hours;
  if (input.notes !== undefined) data.notes = input.notes;

  return withPrismaErrors("worklog.update", () =>
    prisma.worklog.update({ where: { publicId }, data, select: DETAIL_SELECT }),
  );
}

export function remove(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("worklog.remove", () =>
    prisma.worklog.delete({ where: { publicId }, select: { id: true } }),
  );
}
