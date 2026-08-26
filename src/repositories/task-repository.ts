import "server-only";

import type { TaskStatus } from "@/constants/status";
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

const PROJECT_SELECT = {
  publicId: true,
  code: true,
  name: true,
} satisfies Prisma.ProjectSelect;

const LIST_SELECT = {
  id: true,
  publicId: true,
  title: true,
  description: true,
  dueDate: true,
  status: true,
  createdAt: true,
  project: { select: PROJECT_SELECT },
  assignee: { select: USER_SELECT },
  _count: { select: { worklogs: true } },
} satisfies Prisma.TaskSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  updatedAt: true,
} satisfies Prisma.TaskSelect;

export type TaskListRow = Prisma.TaskGetPayload<{ select: typeof LIST_SELECT }>;
export type TaskDetailRow = Prisma.TaskGetPayload<{ select: typeof DETAIL_SELECT }>;

export const TASK_SORT_FIELDS = ["title", "status", "dueDate", "createdAt"] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

export interface TaskListFilters {
  readonly search?: string | undefined;
  readonly status?: TaskStatus | undefined;
  readonly projectId?: number | undefined;
  readonly assigneeUserId?: number | undefined;
}

export interface CreateTaskInput {
  readonly projectId: number;
  readonly title: string;
  readonly description?: string | null;
  readonly assigneeUserId?: number | null;
  readonly dueDate?: Date | null;
  readonly status: TaskStatus;
}

export interface UpdateTaskInput {
  readonly projectId?: number;
  readonly title?: string;
  readonly description?: string | null;
  readonly assigneeUserId?: number | null;
  readonly dueDate?: Date | null;
  readonly status?: TaskStatus;
}

export async function list(
  filters: TaskListFilters,
  pagination: PaginationParams,
  sort: SortParams<TaskSortField>,
): Promise<PaginatedResult<TaskListRow>> {
  const where: Prisma.TaskWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.projectId !== undefined) where.projectId = filters.projectId;
  if (filters.assigneeUserId !== undefined) where.assigneeUserId = filters.assigneeUserId;

  const term = filters.search?.trim();
  if (term) {
    where.OR = [
      { title: contains(term) },
      { description: contains(term) },
      { project: { name: contains(term) } },
      { project: { code: contains(term) } },
    ];
  }

  const [items, total] = await withPrismaErrors("task.list", () =>
    findPageAndTotal(
      prisma.task.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.task.count({ where }),
    ),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function findByPublicId(publicId: string): Promise<TaskDetailRow | null> {
  return withPrismaErrors("task.findByPublicId", () =>
    prisma.task.findUnique({ where: { publicId }, select: DETAIL_SELECT }),
  );
}

export function findIdByPublicId(publicId: string): Promise<number | null> {
  return withPrismaErrors("task.findIdByPublicId", async () => {
    const row = await prisma.task.findUnique({ where: { publicId }, select: { id: true } });
    return row?.id ?? null;
  });
}

export function listOptions(): Promise<
  { publicId: string; title: string; project: { publicId: string; code: string; name: string } }[]
> {
  return withPrismaErrors("task.listOptions", () =>
    prisma.task.findMany({
      select: {
        publicId: true,
        title: true,
        project: { select: { publicId: true, code: true, name: true } },
      },
      orderBy: { title: "asc" },
    }),
  );
}

export function create(input: CreateTaskInput): Promise<TaskDetailRow> {
  return withPrismaErrors("task.create", () =>
    prisma.task.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? null,
        assigneeUserId: input.assigneeUserId ?? null,
        dueDate: input.dueDate ?? null,
        status: input.status,
      },
      select: DETAIL_SELECT,
    }),
  );
}

export function update(publicId: string, input: UpdateTaskInput): Promise<TaskDetailRow> {
  const data: Prisma.TaskUpdateInput = {};
  if (input.projectId !== undefined) data.project = { connect: { id: input.projectId } };
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.assigneeUserId !== undefined) {
    data.assignee =
      input.assigneeUserId === null ? { disconnect: true } : { connect: { id: input.assigneeUserId } };
  }
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  if (input.status !== undefined) data.status = input.status;

  return withPrismaErrors("task.update", () =>
    prisma.task.update({ where: { publicId }, data, select: DETAIL_SELECT }),
  );
}

export function remove(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("task.remove", () =>
    prisma.task.delete({ where: { publicId }, select: { id: true } }),
  );
}

export function countByStatus(): Promise<{ status: TaskStatus; count: number }[]> {
  return withPrismaErrors("task.countByStatus", async () => {
    const grouped = await prisma.task.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    return grouped.map((row) => ({ status: row.status, count: row._count._all }));
  });
}
