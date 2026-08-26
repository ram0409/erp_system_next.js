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
  _count: { select: { users: { where: { deletedAt: null } } } },
} satisfies Prisma.DesignationSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  updatedAt: true,
} satisfies Prisma.DesignationSelect;

export type DesignationListRow = Prisma.DesignationGetPayload<{ select: typeof LIST_SELECT }>;
export type DesignationDetailRow = Prisma.DesignationGetPayload<{ select: typeof DETAIL_SELECT }>;

export const DESIGNATION_SORT_FIELDS = ["name", "code", "status", "createdAt"] as const;
export type DesignationSortField = (typeof DESIGNATION_SORT_FIELDS)[number];

export interface DesignationListFilters {
  readonly search?: string | undefined;
  readonly status?: RecordStatus | undefined;
}

export interface CreateDesignationInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly status: RecordStatus;
}

export interface UpdateDesignationInput {
  readonly code?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly status?: RecordStatus;
}

export async function list(
  filters: DesignationListFilters,
  pagination: PaginationParams,
  sort: SortParams<DesignationSortField>,
): Promise<PaginatedResult<DesignationListRow>> {
  const where: Prisma.DesignationWhereInput = {};
  if (filters.status) where.status = filters.status;

  const term = filters.search?.trim();
  if (term) {
    where.OR = [{ name: contains(term) }, { code: contains(term) }];
  }

  const [items, total] = await withPrismaErrors("designation.list", () =>
    prisma.$transaction([
      prisma.designation.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.designation.count({ where }),
    ]),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function findByPublicId(publicId: string): Promise<DesignationDetailRow | null> {
  return withPrismaErrors("designation.findByPublicId", () =>
    prisma.designation.findUnique({ where: { publicId }, select: DETAIL_SELECT }),
  );
}

export function findIdByPublicId(publicId: string): Promise<number | null> {
  return withPrismaErrors("designation.findIdByPublicId", async () => {
    const row = await prisma.designation.findUnique({ where: { publicId }, select: { id: true } });
    return row?.id ?? null;
  });
}

export function listOptions(): Promise<{ publicId: string; code: string; name: string }[]> {
  return withPrismaErrors("designation.listOptions", () =>
    prisma.designation.findMany({
      where: { status: "ACTIVE" },
      select: { publicId: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
  );
}

export function create(input: CreateDesignationInput): Promise<DesignationDetailRow> {
  return withPrismaErrors("designation.create", () =>
    prisma.designation.create({
      data: {
        code: input.code,
        codeNormalized: normalizeCode(input.code),
        name: input.name,
        nameNormalized: normalizeKey(input.name),
        description: input.description ?? null,
        status: input.status,
      },
      select: DETAIL_SELECT,
    }),
  );
}

export function update(
  publicId: string,
  input: UpdateDesignationInput,
): Promise<DesignationDetailRow> {
  const data: Prisma.DesignationUpdateInput = {};
  if (input.code !== undefined) {
    data.code = input.code;
    data.codeNormalized = normalizeCode(input.code);
  }
  if (input.name !== undefined) {
    data.name = input.name;
    data.nameNormalized = normalizeKey(input.name);
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;

  return withPrismaErrors("designation.update", () =>
    prisma.designation.update({ where: { publicId }, data, select: DETAIL_SELECT }),
  );
}

export function remove(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("designation.remove", () =>
    prisma.designation.delete({ where: { publicId }, select: { id: true } }),
  );
}

export function isCodeTaken(code: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("designation.isCodeTaken", async () => {
    const found = await prisma.designation.findFirst({
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
  return withPrismaErrors("designation.isNameTaken", async () => {
    const found = await prisma.designation.findFirst({
      where: {
        nameNormalized: normalizeKey(name),
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}
