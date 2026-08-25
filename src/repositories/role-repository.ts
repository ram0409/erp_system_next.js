import "server-only";

import type { RecordStatus } from "@/constants/status";
import { normalizeKey, normalizeSlug } from "@/lib/normalize";
import { buildPaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { PaginatedResult, PaginationParams, SortParams } from "@/types/pagination";
import { contains, orderByWithTiebreak } from "./base";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

/**
 * Roles are hard-deletable, unlike branches and users, because a role holds no
 * historical record of its own. `User.roleId` is `Restrict` at the database
 * level, so a role still assigned to anyone cannot be removed even if a service
 * forgets to check.
 */

const LIST_SELECT = {
  id: true,
  publicId: true,
  slug: true,
  name: true,
  description: true,
  isSystem: true,
  isSuperAdmin: true,
  status: true,
  createdAt: true,
  _count: { select: { users: { where: { deletedAt: null } }, permissions: true } },
} satisfies Prisma.RoleSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  updatedAt: true,
} satisfies Prisma.RoleSelect;

export type RoleListRow = Prisma.RoleGetPayload<{ select: typeof LIST_SELECT }>;
export type RoleDetailRow = Prisma.RoleGetPayload<{ select: typeof DETAIL_SELECT }>;

export const ROLE_SORT_FIELDS = ["name", "slug", "status", "createdAt"] as const;
export type RoleSortField = (typeof ROLE_SORT_FIELDS)[number];

export interface RoleListFilters {
  readonly search?: string | undefined;
  readonly status?: RecordStatus | undefined;
}

export interface CreateRoleInput {
  readonly slug: string;
  readonly name: string;
  readonly description?: string | null;
  readonly status: RecordStatus;
}

export interface UpdateRoleInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly status?: RecordStatus;
}

export async function list(
  filters: RoleListFilters,
  pagination: PaginationParams,
  sort: SortParams<RoleSortField>,
): Promise<PaginatedResult<RoleListRow>> {
  const where: Prisma.RoleWhereInput = {};

  if (filters.status) where.status = filters.status;

  const term = filters.search?.trim();
  if (term) {
    where.OR = [{ name: contains(term) }, { slug: contains(term) }];
  }

  const [items, total] = await withPrismaErrors("role.list", () =>
    prisma.$transaction([
      prisma.role.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.role.count({ where }),
    ]),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function findByPublicId(publicId: string): Promise<RoleDetailRow | null> {
  return withPrismaErrors("role.findByPublicId", () =>
    prisma.role.findUnique({ where: { publicId }, select: DETAIL_SELECT }),
  );
}

export function findIdByPublicId(publicId: string): Promise<number | null> {
  return withPrismaErrors("role.findIdByPublicId", async () => {
    const row = await prisma.role.findUnique({ where: { publicId }, select: { id: true } });
    return row?.id ?? null;
  });
}

export function listOptions(): Promise<
  { publicId: string; name: string; slug: string; isSuperAdmin: boolean }[]
> {
  return withPrismaErrors("role.listOptions", () =>
    prisma.role.findMany({
      where: { status: "ACTIVE" },
      select: { publicId: true, name: true, slug: true, isSuperAdmin: true },
      orderBy: { name: "asc" },
    }),
  );
}

const MATRIX_SELECT = {
  publicId: true,
  name: true,
  slug: true,
  isSuperAdmin: true,
  isSystem: true,
  status: true,
} satisfies Prisma.RoleSelect;

export type MatrixRoleRow = Prisma.RoleGetPayload<{ select: typeof MATRIX_SELECT }>;

/** Every role, including inactive ones, for the permission matrix selector. */
export function listForMatrix(): Promise<MatrixRoleRow[]> {
  return withPrismaErrors("role.listForMatrix", () =>
    prisma.role.findMany({
      select: MATRIX_SELECT,
      orderBy: [{ isSuperAdmin: "desc" }, { name: "asc" }],
    }),
  );
}

export function create(input: CreateRoleInput): Promise<RoleDetailRow> {
  return withPrismaErrors("role.create", () =>
    prisma.role.create({
      data: {
        slug: normalizeSlug(input.slug),
        name: input.name,
        nameNormalized: normalizeKey(input.name),
        description: input.description ?? null,
        isSystem: false,
        isSuperAdmin: false,
        status: input.status,
      },
      select: DETAIL_SELECT,
    }),
  );
}

/**
 * The slug and the super-admin flag are deliberately not updatable: code and
 * seeds reference the slug, and privilege escalation by renaming a flag is
 * exactly the kind of edit that must require a migration.
 */
export function update(publicId: string, input: UpdateRoleInput): Promise<RoleDetailRow> {
  const data: Prisma.RoleUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
    data.nameNormalized = normalizeKey(input.name);
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;

  return withPrismaErrors("role.update", () =>
    prisma.role.update({ where: { publicId }, data, select: DETAIL_SELECT }),
  );
}

export function remove(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("role.remove", () =>
    prisma.role.delete({ where: { publicId }, select: { id: true } }),
  );
}

/** Permission keys currently granted to a role. */
export function findGrantedKeys(roleId: number): Promise<string[]> {
  return withPrismaErrors("role.findGrantedKeys", async () => {
    const grants = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permission: { select: { module: true, action: true } } },
    });
    return grants.map((grant) => `${grant.permission.module}:${grant.permission.action}`);
  });
}

/**
 * Replaces a role's grants with exactly `permissionIds`.
 *
 * Delete-then-insert inside one transaction, rather than diffing: the matrix is
 * submitted as a complete desired state, and a partial diff that fails halfway
 * would leave a role holding a combination nobody chose.
 */
export function replacePermissions(
  roleId: number,
  permissionIds: readonly number[],
): Promise<number> {
  return withPrismaErrors("role.replacePermissions", async () => {
    const [, created] = await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      }),
    ]);
    return created.count;
  });
}

export function countUsers(roleId: number): Promise<number> {
  return withPrismaErrors("role.countUsers", () =>
    prisma.user.count({ where: { roleId, deletedAt: null } }),
  );
}

export function countByStatus(): Promise<{ status: RecordStatus; count: number }[]> {
  return withPrismaErrors("role.countByStatus", async () => {
    const grouped = await prisma.role.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    return grouped.map((row) => ({ status: row.status, count: row._count._all }));
  });
}

export function isSlugTaken(slug: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("role.isSlugTaken", async () => {
    const found = await prisma.role.findFirst({
      where: {
        slug: normalizeSlug(slug),
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}

export function isNameTaken(name: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("role.isNameTaken", async () => {
    const found = await prisma.role.findFirst({
      where: {
        nameNormalized: normalizeKey(name),
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}
