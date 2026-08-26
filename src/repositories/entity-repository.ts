import "server-only";

import type { RecordStatus } from "@/constants/status";
import { normalizeCode, normalizeKey } from "@/lib/normalize";
import { buildPaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { PaginatedResult, PaginationParams, SortParams } from "@/types/pagination";
import { NOT_DELETED, contains, findPageAndTotal, orderByWithTiebreak } from "./base";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

const LIST_SELECT = {
  id: true,
  publicId: true,
  code: true,
  name: true,
  legalName: true,
  email: true,
  phone: true,
  city: true,
  country: true,
  status: true,
  createdAt: true,
  _count: { select: { branches: { where: NOT_DELETED } } },
} satisfies Prisma.BusinessEntitySelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  taxId: true,
  addressLine: true,
  state: true,
  postalCode: true,
  notes: true,
  updatedAt: true,
} satisfies Prisma.BusinessEntitySelect;

export type EntityListRow = Prisma.BusinessEntityGetPayload<{ select: typeof LIST_SELECT }>;
export type EntityDetailRow = Prisma.BusinessEntityGetPayload<{ select: typeof DETAIL_SELECT }>;

export const ENTITY_SORT_FIELDS = ["name", "code", "status", "createdAt"] as const;
export type EntitySortField = (typeof ENTITY_SORT_FIELDS)[number];

export interface EntityListFilters {
  readonly search?: string | undefined;
  readonly status?: RecordStatus | undefined;
}

export interface CreateEntityRecordInput {
  readonly code: string;
  readonly name: string;
  readonly legalName?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly taxId?: string | null;
  readonly addressLine?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly postalCode?: string | null;
  readonly country?: string | null;
  readonly notes?: string | null;
  readonly status: RecordStatus;
}

export interface UpdateEntityRecordInput {
  readonly code?: string;
  readonly name?: string;
  readonly legalName?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly taxId?: string | null;
  readonly addressLine?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly postalCode?: string | null;
  readonly country?: string | null;
  readonly notes?: string | null;
  readonly status?: RecordStatus;
}

export async function list(
  filters: EntityListFilters,
  pagination: PaginationParams,
  sort: SortParams<EntitySortField>,
): Promise<PaginatedResult<EntityListRow>> {
  const where: Prisma.BusinessEntityWhereInput = {};
  if (filters.status) where.status = filters.status;

  const term = filters.search?.trim();
  if (term) {
    where.OR = [
      { name: contains(term) },
      { code: contains(term) },
      { legalName: contains(term) },
      { city: contains(term) },
    ];
  }

  const [items, total] = await withPrismaErrors("entity.list", () =>
    findPageAndTotal(
      prisma.businessEntity.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.businessEntity.count({ where }),
    ),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function findByPublicId(publicId: string): Promise<EntityDetailRow | null> {
  return withPrismaErrors("entity.findByPublicId", () =>
    prisma.businessEntity.findUnique({ where: { publicId }, select: DETAIL_SELECT }),
  );
}

export function findIdByPublicId(publicId: string): Promise<number | null> {
  return withPrismaErrors("entity.findIdByPublicId", async () => {
    const row = await prisma.businessEntity.findUnique({
      where: { publicId },
      select: { id: true },
    });
    return row?.id ?? null;
  });
}

/** Active entities for the assignment dropdown on the branch form. */
export function listOptions(
  activeOnly = true,
): Promise<{ publicId: string; code: string; name: string }[]> {
  return withPrismaErrors("entity.listOptions", () =>
    prisma.businessEntity.findMany({
      where: activeOnly ? { status: "ACTIVE" } : {},
      select: { publicId: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
  );
}

export function create(input: CreateEntityRecordInput): Promise<EntityDetailRow> {
  return withPrismaErrors("entity.create", () =>
    prisma.businessEntity.create({
      data: {
        code: input.code,
        codeNormalized: normalizeCode(input.code),
        name: input.name,
        nameNormalized: normalizeKey(input.name),
        legalName: input.legalName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        taxId: input.taxId ?? null,
        addressLine: input.addressLine ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        postalCode: input.postalCode ?? null,
        country: input.country ?? null,
        notes: input.notes ?? null,
        status: input.status,
      },
      select: DETAIL_SELECT,
    }),
  );
}

export function update(publicId: string, input: UpdateEntityRecordInput): Promise<EntityDetailRow> {
  const data: Prisma.BusinessEntityUpdateInput = {};
  if (input.code !== undefined) {
    data.code = input.code;
    data.codeNormalized = normalizeCode(input.code);
  }
  if (input.name !== undefined) {
    data.name = input.name;
    data.nameNormalized = normalizeKey(input.name);
  }
  if (input.legalName !== undefined) data.legalName = input.legalName;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.taxId !== undefined) data.taxId = input.taxId;
  if (input.addressLine !== undefined) data.addressLine = input.addressLine;
  if (input.city !== undefined) data.city = input.city;
  if (input.state !== undefined) data.state = input.state;
  if (input.postalCode !== undefined) data.postalCode = input.postalCode;
  if (input.country !== undefined) data.country = input.country;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.status !== undefined) data.status = input.status;

  return withPrismaErrors("entity.update", () =>
    prisma.businessEntity.update({ where: { publicId }, data, select: DETAIL_SELECT }),
  );
}

export function remove(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("entity.remove", () =>
    prisma.businessEntity.delete({ where: { publicId }, select: { id: true } }),
  );
}

export function isCodeTaken(code: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("entity.isCodeTaken", async () => {
    const found = await prisma.businessEntity.findFirst({
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
  return withPrismaErrors("entity.isNameTaken", async () => {
    const found = await prisma.businessEntity.findFirst({
      where: {
        nameNormalized: normalizeKey(name),
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}

export function countByStatus(): Promise<{ status: RecordStatus; count: number }[]> {
  return withPrismaErrors("entity.countByStatus", async () => {
    const grouped = await prisma.businessEntity.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    return grouped.map((row) => ({ status: row.status, count: row._count._all }));
  });
}
