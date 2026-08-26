import "server-only";

import type { ProjectStatus } from "@/constants/status";
import { normalizeCode, normalizeKey } from "@/lib/normalize";
import { buildPaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { PaginatedResult, PaginationParams, SortParams } from "@/types/pagination";
import { contains, findPageAndTotal, orderByWithTiebreak } from "./base";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

const OWNER_SELECT = {
  publicId: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const LIST_SELECT = {
  id: true,
  publicId: true,
  code: true,
  name: true,
  description: true,
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  owner: { select: OWNER_SELECT },
  _count: { select: { tasks: true } },
} satisfies Prisma.ProjectSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

export type ProjectListRow = Prisma.ProjectGetPayload<{ select: typeof LIST_SELECT }>;
export type ProjectDetailRow = Prisma.ProjectGetPayload<{ select: typeof DETAIL_SELECT }>;

export const PROJECT_SORT_FIELDS = ["name", "code", "status", "createdAt"] as const;
export type ProjectSortField = (typeof PROJECT_SORT_FIELDS)[number];

export interface ProjectListFilters {
  readonly search?: string | undefined;
  readonly status?: ProjectStatus | undefined;
  readonly ownerUserId?: number | undefined;
}

export interface CreateProjectInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly ownerUserId: number;
  readonly startDate?: Date | null;
  readonly endDate?: Date | null;
  readonly status: ProjectStatus;
}

export interface UpdateProjectInput {
  readonly code?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly ownerUserId?: number;
  readonly startDate?: Date | null;
  readonly endDate?: Date | null;
  readonly status?: ProjectStatus;
}

export async function list(
  filters: ProjectListFilters,
  pagination: PaginationParams,
  sort: SortParams<ProjectSortField>,
): Promise<PaginatedResult<ProjectListRow>> {
  const where: Prisma.ProjectWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.ownerUserId !== undefined) where.ownerUserId = filters.ownerUserId;

  const term = filters.search?.trim();
  if (term) {
    where.OR = [
      { name: contains(term) },
      { code: contains(term) },
      { description: contains(term) },
    ];
  }

  const [items, total] = await withPrismaErrors("project.list", () =>
    findPageAndTotal(
      prisma.project.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.project.count({ where }),
    ),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function findByPublicId(publicId: string): Promise<ProjectDetailRow | null> {
  return withPrismaErrors("project.findByPublicId", () =>
    prisma.project.findUnique({ where: { publicId }, select: DETAIL_SELECT }),
  );
}

export function findIdByPublicId(publicId: string): Promise<number | null> {
  return withPrismaErrors("project.findIdByPublicId", async () => {
    const row = await prisma.project.findUnique({ where: { publicId }, select: { id: true } });
    return row?.id ?? null;
  });
}

export function listOptions(): Promise<{ publicId: string; code: string; name: string }[]> {
  return withPrismaErrors("project.listOptions", () =>
    prisma.project.findMany({
      select: { publicId: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
  );
}

export function create(input: CreateProjectInput): Promise<ProjectDetailRow> {
  return withPrismaErrors("project.create", () =>
    prisma.project.create({
      data: {
        code: input.code,
        codeNormalized: normalizeCode(input.code),
        name: input.name,
        nameNormalized: normalizeKey(input.name),
        description: input.description ?? null,
        ownerUserId: input.ownerUserId,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        status: input.status,
      },
      select: DETAIL_SELECT,
    }),
  );
}

export function update(publicId: string, input: UpdateProjectInput): Promise<ProjectDetailRow> {
  const data: Prisma.ProjectUpdateInput = {};
  if (input.code !== undefined) {
    data.code = input.code;
    data.codeNormalized = normalizeCode(input.code);
  }
  if (input.name !== undefined) {
    data.name = input.name;
    data.nameNormalized = normalizeKey(input.name);
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.ownerUserId !== undefined) data.owner = { connect: { id: input.ownerUserId } };
  if (input.startDate !== undefined) data.startDate = input.startDate;
  if (input.endDate !== undefined) data.endDate = input.endDate;
  if (input.status !== undefined) data.status = input.status;

  return withPrismaErrors("project.update", () =>
    prisma.project.update({ where: { publicId }, data, select: DETAIL_SELECT }),
  );
}

export function remove(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("project.remove", () =>
    prisma.project.delete({ where: { publicId }, select: { id: true } }),
  );
}

export function countByStatus(): Promise<{ status: ProjectStatus; count: number }[]> {
  return withPrismaErrors("project.countByStatus", async () => {
    const grouped = await prisma.project.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    return grouped.map((row) => ({ status: row.status, count: row._count._all }));
  });
}

export function isCodeTaken(code: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("project.isCodeTaken", async () => {
    const found = await prisma.project.findFirst({
      where: {
        codeNormalized: normalizeCode(code),
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}
