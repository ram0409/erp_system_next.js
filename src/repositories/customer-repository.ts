import "server-only";

import type { RecordStatus } from "@/constants/status";
import { normalizeCode, normalizeKey } from "@/lib/normalize";
import { buildPaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { PaginatedResult, PaginationParams, SortParams } from "@/types/pagination";
import { NOT_DELETED, contains, findPageAndTotal, orderByWithTiebreak } from "./base";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

const BRANCH_SELECT = {
  publicId: true,
  code: true,
  name: true,
} satisfies Prisma.BranchSelect;

const LIST_SELECT = {
  id: true,
  publicId: true,
  code: true,
  name: true,
  contactPerson: true,
  email: true,
  phone: true,
  city: true,
  state: true,
  status: true,
  createdAt: true,
  branch: { select: BRANCH_SELECT },
} satisfies Prisma.CustomerSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  addressLine1: true,
  addressLine2: true,
  postalCode: true,
  country: true,
  notes: true,
  organizationId: true,
  branchId: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;

export type CustomerListRow = Prisma.CustomerGetPayload<{ select: typeof LIST_SELECT }>;
export type CustomerDetailRow = Prisma.CustomerGetPayload<{ select: typeof DETAIL_SELECT }>;

export const CUSTOMER_SORT_FIELDS = ["code", "name", "city", "status", "createdAt"] as const;
export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

export interface CustomerListFilters {
  readonly search?: string | undefined;
  readonly status?: RecordStatus | undefined;
  readonly branchId?: number | undefined;
}

export interface CreateCustomerInput {
  readonly organizationId: number;
  readonly branchId: number;
  readonly code: string;
  readonly name: string;
  readonly contactPerson?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly postalCode?: string | null;
  readonly country?: string | null;
  readonly notes?: string | null;
  readonly status: RecordStatus;
}

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, "organizationId">>;

function listWhere(filters: CustomerListFilters): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = { ...NOT_DELETED };

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.branchId !== undefined) {
    where.branchId = filters.branchId;
  }

  const term = filters.search?.trim();
  if (term) {
    where.OR = [
      { code: contains(term) },
      { name: contains(term) },
      { contactPerson: contains(term) },
      { email: contains(term) },
      { city: contains(term) },
    ];
  }

  return where;
}

export async function list(
  filters: CustomerListFilters,
  pagination: PaginationParams,
  sort: SortParams<CustomerSortField>,
): Promise<PaginatedResult<CustomerListRow>> {
  const where = listWhere(filters);

  const [items, total] = await withPrismaErrors("customer.list", () =>
    findPageAndTotal(
      prisma.customer.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.customer.count({ where }),
    ),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function findByPublicId(publicId: string): Promise<CustomerDetailRow | null> {
  return withPrismaErrors("customer.findByPublicId", () =>
    prisma.customer.findFirst({ where: { publicId, ...NOT_DELETED }, select: DETAIL_SELECT }),
  );
}

export function create(input: CreateCustomerInput): Promise<CustomerDetailRow> {
  return withPrismaErrors("customer.create", () =>
    prisma.customer.create({
      data: {
        organization: { connect: { id: input.organizationId } },
        branch: { connect: { id: input.branchId } },
        code: input.code,
        codeNormalized: normalizeCode(input.code),
        name: input.name,
        nameNormalized: normalizeKey(input.name),
        contactPerson: input.contactPerson ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        addressLine1: input.addressLine1 ?? null,
        addressLine2: input.addressLine2 ?? null,
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

export function update(publicId: string, input: UpdateCustomerInput): Promise<CustomerDetailRow> {
  return withPrismaErrors("customer.update", () => {
    const data: Prisma.CustomerUpdateInput = {};

    if (input.branchId !== undefined) {
      data.branch = { connect: { id: input.branchId } };
    }
    if (input.code !== undefined) {
      data.code = input.code;
      data.codeNormalized = normalizeCode(input.code);
    }
    if (input.name !== undefined) {
      data.name = input.name;
      data.nameNormalized = normalizeKey(input.name);
    }
    if (input.contactPerson !== undefined) data.contactPerson = input.contactPerson;
    if (input.email !== undefined) data.email = input.email;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.addressLine1 !== undefined) data.addressLine1 = input.addressLine1;
    if (input.addressLine2 !== undefined) data.addressLine2 = input.addressLine2;
    if (input.city !== undefined) data.city = input.city;
    if (input.state !== undefined) data.state = input.state;
    if (input.postalCode !== undefined) data.postalCode = input.postalCode;
    if (input.country !== undefined) data.country = input.country;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.status !== undefined) data.status = input.status;

    return prisma.customer.update({ where: { publicId }, data, select: DETAIL_SELECT });
  });
}

export function softDelete(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("customer.softDelete", () =>
    prisma.customer.update({
      where: { publicId },
      data: { deletedAt: new Date(), status: "INACTIVE" },
      select: { id: true },
    }),
  );
}

export function isCodeTaken(code: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("customer.isCodeTaken", async () => {
    const found = await prisma.customer.findFirst({
      where: {
        codeNormalized: normalizeCode(code),
        ...NOT_DELETED,
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}

export function isNameTaken(name: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("customer.isNameTaken", async () => {
    const found = await prisma.customer.findFirst({
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

export async function listMatching(
  filters: CustomerListFilters,
  take: number,
  sort: SortParams<CustomerSortField>,
): Promise<{ rows: CustomerListRow[]; total: number }> {
  const where = listWhere(filters);

  const [rows, total] = await withPrismaErrors("customer.listMatching", () =>
    findPageAndTotal(
      prisma.customer.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        take,
      }),
      prisma.customer.count({ where }),
    ),
  );

  return { rows, total };
}
