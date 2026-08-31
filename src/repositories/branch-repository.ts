import "server-only";

import type { BranchType, RecordStatus } from "@/constants/status";
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
  type: true,
  isHeadOffice: true,
  email: true,
  phone: true,
  city: true,
  state: true,
  logoPath: true,
  status: true,
  createdAt: true,
  _count: { select: { users: { where: NOT_DELETED } } },
} satisfies Prisma.BranchSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  addressLine1: true,
  addressLine2: true,
  postalCode: true,
  country: true,
  organizationId: true,
  entityId: true,
  updatedAt: true,
} satisfies Prisma.BranchSelect;

export type BranchListRow = Prisma.BranchGetPayload<{ select: typeof LIST_SELECT }>;
export type BranchDetailRow = Prisma.BranchGetPayload<{ select: typeof DETAIL_SELECT }>;

export const BRANCH_SORT_FIELDS = ["code", "name", "type", "status", "createdAt"] as const;
export type BranchSortField = (typeof BRANCH_SORT_FIELDS)[number];

export interface BranchListFilters {
  readonly search?: string | undefined;
  readonly status?: RecordStatus | undefined;
  readonly type?: BranchType | undefined;
}

export interface CreateBranchInput {
  readonly organizationId: number;
  readonly entityId: number;
  readonly code: string;
  readonly name: string;
  readonly type: BranchType;
  readonly isHeadOffice: boolean;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly postalCode?: string | null;
  readonly country?: string | null;
  readonly status: RecordStatus;
}

export type UpdateBranchInput = Partial<Omit<CreateBranchInput, "organizationId">>;

function listWhere(filters: BranchListFilters): Prisma.BranchWhereInput {
  const where: Prisma.BranchWhereInput = { ...NOT_DELETED };

  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;

  const term = filters.search?.trim();
  if (term) {
    where.OR = [{ code: contains(term) }, { name: contains(term) }, { city: contains(term) }];
  }

  return where;
}

export async function list(
  filters: BranchListFilters,
  pagination: PaginationParams,
  sort: SortParams<BranchSortField>,
): Promise<PaginatedResult<BranchListRow>> {
  const where = listWhere(filters);

  const [items, total] = await withPrismaErrors("branch.list", () =>
    findPageAndTotal(
      prisma.branch.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.branch.count({ where }),
    ),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function findByPublicId(publicId: string): Promise<BranchDetailRow | null> {
  return withPrismaErrors("branch.findByPublicId", () =>
    prisma.branch.findFirst({ where: { publicId, ...NOT_DELETED }, select: DETAIL_SELECT }),
  );
}

export function findIdByPublicId(publicId: string): Promise<number | null> {
  return withPrismaErrors("branch.findIdByPublicId", async () => {
    const row = await prisma.branch.findFirst({
      where: { publicId, ...NOT_DELETED },
      select: { id: true },
    });
    return row?.id ?? null;
  });
}

/** Active branches for workspace and assignment dropdowns. */
export function listOptions(): Promise<
  { publicId: string; code: string; name: string; logoPath: string | null }[]
> {
  return withPrismaErrors("branch.listOptions", () =>
    prisma.branch.findMany({
      where: {
        ...NOT_DELETED,
        status: "ACTIVE",
      },
      select: { publicId: true, code: true, name: true, logoPath: true },
      orderBy: { name: "asc" },
    }),
  );
}

function toCreateData(input: CreateBranchInput): Prisma.BranchCreateInput {
  return {
    organization: { connect: { id: input.organizationId } },
    entity: { connect: { id: input.entityId } },
    code: input.code,
    codeNormalized: normalizeCode(input.code),
    name: input.name,
    nameNormalized: normalizeKey(input.name),
    type: input.type,
    isHeadOffice: input.isHeadOffice,
    email: input.email ?? null,
    phone: input.phone ?? null,
    addressLine1: input.addressLine1 ?? null,
    addressLine2: input.addressLine2 ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    postalCode: input.postalCode ?? null,
    country: input.country ?? null,
    status: input.status,
  };
}

function toUpdateData(input: UpdateBranchInput): Prisma.BranchUpdateInput {
  const data: Prisma.BranchUpdateInput = {};

  if (input.code !== undefined) {
    data.code = input.code;
    data.codeNormalized = normalizeCode(input.code);
  }
  if (input.name !== undefined) {
    data.name = input.name;
    data.nameNormalized = normalizeKey(input.name);
  }
  if (input.entityId !== undefined) data.entity = { connect: { id: input.entityId } };
  if (input.type !== undefined) data.type = input.type;
  if (input.isHeadOffice !== undefined) data.isHeadOffice = input.isHeadOffice;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.addressLine1 !== undefined) data.addressLine1 = input.addressLine1;
  if (input.addressLine2 !== undefined) data.addressLine2 = input.addressLine2;
  if (input.city !== undefined) data.city = input.city;
  if (input.state !== undefined) data.state = input.state;
  if (input.postalCode !== undefined) data.postalCode = input.postalCode;
  if (input.country !== undefined) data.country = input.country;
  if (input.status !== undefined) data.status = input.status;

  return data;
}

async function unsetOtherHeadOffices(
  organizationId: number,
  exceptPublicId?: string,
): Promise<void> {
  await prisma.branch.updateMany({
    where: {
      organizationId,
      isHeadOffice: true,
      ...NOT_DELETED,
      ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
    },
    data: { isHeadOffice: false },
  });
}

export function create(input: CreateBranchInput): Promise<BranchDetailRow> {
  return withPrismaErrors("branch.create", async () => {
    if (input.isHeadOffice) {
      await unsetOtherHeadOffices(input.organizationId);
    }

    return prisma.branch.create({
      data: toCreateData(input),
      select: DETAIL_SELECT,
    });
  });
}

export function update(publicId: string, input: UpdateBranchInput): Promise<BranchDetailRow> {
  return withPrismaErrors("branch.update", async () => {
    const data = toUpdateData(input);

    if (input.isHeadOffice) {
      const current = await prisma.branch.findFirst({
        where: { publicId },
        select: { organizationId: true },
      });
      if (current) {
        await unsetOtherHeadOffices(current.organizationId, publicId);
      }
    }

    return prisma.branch.update({ where: { publicId }, data, select: DETAIL_SELECT });
  });
}

export function softDelete(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("branch.softDelete", () =>
    prisma.branch.update({
      where: { publicId },
      data: { deletedAt: new Date(), status: "INACTIVE" },
      select: { id: true },
    }),
  );
}

export function updateLogoPath(
  publicId: string,
  logoPath: string | null,
): Promise<{ logoPath: string | null }> {
  return withPrismaErrors("branch.updateLogoPath", () =>
    prisma.branch.update({
      where: { publicId },
      data: { logoPath },
      select: { logoPath: true },
    }),
  );
}

export function isCodeTaken(code: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("branch.isCodeTaken", async () => {
    const found = await prisma.branch.findFirst({
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
  return withPrismaErrors("branch.isNameTaken", async () => {
    const found = await prisma.branch.findFirst({
      where: {
        nameNormalized: normalizeKey(name),
        ...NOT_DELETED,
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}

export function countNotDeleted(organizationId: number): Promise<number> {
  return withPrismaErrors("branch.countNotDeleted", () =>
    prisma.branch.count({ where: { organizationId, ...NOT_DELETED } }),
  );
}

export function countHeadOffices(organizationId: number): Promise<number> {
  return withPrismaErrors("branch.countHeadOffices", () =>
    prisma.branch.count({ where: { organizationId, isHeadOffice: true, ...NOT_DELETED } }),
  );
}

/**
 * Unpaginated matching rows for CSV export. `take` is the hard cap; `total` is
 * the un-capped match count so the caller can report truncation.
 */
export async function listMatching(
  filters: BranchListFilters,
  take: number,
  sort: SortParams<BranchSortField>,
): Promise<{ rows: BranchListRow[]; total: number }> {
  const where = listWhere(filters);

  const [rows, total] = await withPrismaErrors("branch.listMatching", () =>
    findPageAndTotal(
      prisma.branch.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        take,
      }),
      prisma.branch.count({ where }),
    ),
  );

  return { rows, total };
}

export function countActive(): Promise<number> {
  return withPrismaErrors("branch.countActive", () =>
    prisma.branch.count({ where: { ...NOT_DELETED, status: "ACTIVE" } }),
  );
}

export function countByStatus(): Promise<{ status: RecordStatus; count: number }[]> {
  return withPrismaErrors("branch.countByStatus", async () => {
    const grouped = await prisma.branch.groupBy({
      by: ["status"],
      where: { ...NOT_DELETED },
      _count: { _all: true },
    });
    return grouped.map((row) => ({ status: row.status, count: row._count._all }));
  });
}
