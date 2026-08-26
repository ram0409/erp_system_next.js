import "server-only";

import type { RecordStatus } from "@/constants/status";
import { normalizeCode, normalizeKey } from "@/lib/normalize";
import { buildPaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { PaginatedResult, PaginationParams, SortParams } from "@/types/pagination";
import { contains, orderByWithTiebreak } from "./base";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

const LIST_SELECT = {
  id: true,
  publicId: true,
  code: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
  branch: { select: { publicId: true, code: true, name: true } },
  _count: { select: { users: { where: { deletedAt: null } } } },
} satisfies Prisma.DepartmentSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  updatedAt: true,
  branch: { select: { publicId: true, code: true, name: true, status: true } },
} satisfies Prisma.DepartmentSelect;

export type DepartmentListRow = Prisma.DepartmentGetPayload<{ select: typeof LIST_SELECT }>;
export type DepartmentDetailRow = Prisma.DepartmentGetPayload<{ select: typeof DETAIL_SELECT }>;

export const DEPARTMENT_SORT_FIELDS = ["name", "code", "status", "createdAt"] as const;
export type DepartmentSortField = (typeof DEPARTMENT_SORT_FIELDS)[number];

export interface DepartmentListFilters {
  readonly search?: string | undefined;
  readonly status?: RecordStatus | undefined;
  readonly branchId?: number | undefined;
}

export interface CreateDepartmentInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly branchId?: number | null;
  readonly status: RecordStatus;
}

export interface UpdateDepartmentInput {
  readonly code?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly branchId?: number | null;
  readonly status?: RecordStatus;
}

export async function list(
  filters: DepartmentListFilters,
  pagination: PaginationParams,
  sort: SortParams<DepartmentSortField>,
): Promise<PaginatedResult<DepartmentListRow>> {
  const where: Prisma.DepartmentWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.branchId !== undefined) where.branchId = filters.branchId;

  const term = filters.search?.trim();
  if (term) {
    where.OR = [{ name: contains(term) }, { code: contains(term) }];
  }

  const [items, total] = await withPrismaErrors("department.list", () =>
    prisma.$transaction([
      prisma.department.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.department.count({ where }),
    ]),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function findByPublicId(publicId: string): Promise<DepartmentDetailRow | null> {
  return withPrismaErrors("department.findByPublicId", () =>
    prisma.department.findUnique({ where: { publicId }, select: DETAIL_SELECT }),
  );
}

export function findIdByPublicId(publicId: string): Promise<number | null> {
  return withPrismaErrors("department.findIdByPublicId", async () => {
    const row = await prisma.department.findUnique({ where: { publicId }, select: { id: true } });
    return row?.id ?? null;
  });
}

export function listOptions(): Promise<{ publicId: string; code: string; name: string }[]> {
  return withPrismaErrors("department.listOptions", () =>
    prisma.department.findMany({
      where: { status: "ACTIVE" },
      select: { publicId: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
  );
}

export function create(input: CreateDepartmentInput): Promise<DepartmentDetailRow> {
  return withPrismaErrors("department.create", () =>
    prisma.department.create({
      data: {
        code: input.code,
        codeNormalized: normalizeCode(input.code),
        name: input.name,
        nameNormalized: normalizeKey(input.name),
        description: input.description ?? null,
        branchId: input.branchId ?? null,
        status: input.status,
      },
      select: DETAIL_SELECT,
    }),
  );
}

export function update(publicId: string, input: UpdateDepartmentInput): Promise<DepartmentDetailRow> {
  const data: Prisma.DepartmentUpdateInput = {};
  if (input.code !== undefined) {
    data.code = input.code;
    data.codeNormalized = normalizeCode(input.code);
  }
  if (input.name !== undefined) {
    data.name = input.name;
    data.nameNormalized = normalizeKey(input.name);
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.branchId !== undefined) {
    data.branch = input.branchId === null ? { disconnect: true } : { connect: { id: input.branchId } };
  }
  if (input.status !== undefined) data.status = input.status;

  return withPrismaErrors("department.update", () =>
    prisma.department.update({ where: { publicId }, data, select: DETAIL_SELECT }),
  );
}

export function remove(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("department.remove", () =>
    prisma.department.delete({ where: { publicId }, select: { id: true } }),
  );
}

export function isCodeTaken(code: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("department.isCodeTaken", async () => {
    const found = await prisma.department.findFirst({
      where: {
        codeNormalized: normalizeCode(code),
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}

export function isNameTaken(name: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("department.isNameTaken", async () => {
    const found = await prisma.department.findFirst({
      where: {
        nameNormalized: normalizeKey(name),
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}
