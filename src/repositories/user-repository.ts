import "server-only";

import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  isPermissionKey,
  type PermissionKey,
} from "@/constants/permissions";
import { RECORD_STATUS, type RecordStatus } from "@/constants/status";
import { normalizeCode, normalizeEmail, normalizeKey } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { buildPaginatedResult } from "@/lib/pagination";
import type { PaginatedResult, PaginationParams, SortParams } from "@/types/pagination";
import { NOT_DELETED, contains, orderByWithTiebreak } from "./base";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

/**
 * All database access for users. Services call these methods; nothing else may
 * import the Prisma client (enforced in eslint.config.mjs).
 *
 * Every projection is an explicit `select`. A bare `findMany` would return
 * `passwordHash` along with everything else, and that row is one careless
 * `return user` away from a browser.
 */

/** Identity and authorization state needed to resolve the current actor. */
const ACTOR_SELECT = {
  id: true,
  publicId: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  designation: { select: { name: true } },
  avatarPath: true,
  status: true,
  tokenVersion: true,
  mustChangePassword: true,
  branchId: true,
  roleId: true,
  role: {
    select: {
      publicId: true,
      slug: true,
      name: true,
      isSuperAdmin: true,
      status: true,
      permissions: {
        select: { permission: { select: { module: true, action: true } } },
      },
    },
  },
  branch: {
    select: { publicId: true, code: true, name: true, status: true, deletedAt: true },
  },
} satisfies Prisma.UserSelect;

/** The actor projection plus the fields only the sign-in path may see. */
const CREDENTIAL_SELECT = {
  ...ACTOR_SELECT,
  passwordHash: true,
  failedLoginAttempts: true,
  lockedUntil: true,
} satisfies Prisma.UserSelect;

/** Safe for listings: no hash, no lockout internals. */
const LIST_SELECT = {
  id: true,
  publicId: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  joinDate: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { publicId: true, name: true, slug: true, isSuperAdmin: true } },
  branch: { select: { publicId: true, code: true, name: true } },
  department: { select: { publicId: true, code: true, name: true } },
  designation: { select: { publicId: true, code: true, name: true } },
} satisfies Prisma.UserSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  updatedAt: true,
  mustChangePassword: true,
  role: {
    select: {
      publicId: true,
      name: true,
      slug: true,
      isSuperAdmin: true,
      status: true,
    },
  },
  branch: { select: { publicId: true, code: true, name: true, status: true } },
} satisfies Prisma.UserSelect;

export type ActorRow = Prisma.UserGetPayload<{ select: typeof ACTOR_SELECT }>;
export type CredentialRow = Prisma.UserGetPayload<{ select: typeof CREDENTIAL_SELECT }>;
export type UserListRow = Prisma.UserGetPayload<{ select: typeof LIST_SELECT }>;
export type UserDetailRow = Prisma.UserGetPayload<{ select: typeof DETAIL_SELECT }>;

export const USER_SORT_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "employeeCode",
  "status",
  "createdAt",
  "lastLoginAt",
] as const;

export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export interface UserListFilters {
  readonly search?: string | undefined;
  readonly branchId?: number | undefined;
  readonly roleId?: number | undefined;
  readonly status?: RecordStatus | undefined;
  readonly excludeSuperAdmin?: boolean | undefined;
}

export interface CreateUserInput {
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly phone?: string | null;
  readonly joinDate?: Date | null;
  readonly departmentId?: number | null;
  readonly designationId?: number | null;
  readonly branchId: number;
  readonly roleId: number;
  readonly status: RecordStatus;
  readonly mustChangePassword: boolean;
}

export interface UpdateUserInput {
  readonly employeeCode?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly email?: string;
  readonly phone?: string | null;
  readonly joinDate?: Date | null;
  readonly departmentId?: number | null;
  readonly designationId?: number | null;
  readonly branchId?: number;
  readonly roleId?: number;
  readonly status?: RecordStatus;
  /** Invalidates issued sessions — used when deactivating or changing role. */
  readonly incrementTokenVersion?: boolean;
  readonly avatarPath?: string | null;
}

function buildListWhere(filters: UserListFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { ...NOT_DELETED };

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.branchId !== undefined) {
    where.branchId = filters.branchId;
  }
  if (filters.roleId !== undefined) {
    where.roleId = filters.roleId;
  }
  if (filters.excludeSuperAdmin) {
    where.role = { isSuperAdmin: false };
  }

  const term = filters.search?.trim();
  if (term) {
    where.OR = [
      { firstName: contains(term) },
      { lastName: contains(term) },
      { email: contains(term) },
      { employeeCode: contains(term) },
      { department: { name: contains(term) } },
      { designation: { name: contains(term) } },
    ];
  }

  return where;
}

/**
 * Looks up an account for sign-in by work email or employee code. Returns the
 * row even when the user is inactive or locked: the sign-in service must still
 * verify the password before deciding what to say, otherwise response timing
 * and wording reveal which accounts exist.
 */
export function findByEmailForAuth(identifier: string): Promise<CredentialRow | null> {
  const emailNormalized = normalizeEmail(identifier);
  const employeeCodeNormalized = normalizeCode(identifier);

  return withPrismaErrors("user.findByEmailForAuth", () =>
    prisma.user.findFirst({
      where: {
        ...NOT_DELETED,
        OR: [{ emailNormalized }, { employeeCodeNormalized }],
      },
      select: CREDENTIAL_SELECT,
    }),
  );
}

/** Email-only lookup for password reset. A username must not trigger a reset email. */
export function findByNormalizedEmail(
  email: string,
): Promise<{ id: number; publicId: string; email: string; status: RecordStatus } | null> {
  return withPrismaErrors("user.findByNormalizedEmail", () =>
    prisma.user.findFirst({
      where: { emailNormalized: normalizeEmail(email), ...NOT_DELETED },
      select: { id: true, publicId: true, email: true, status: true },
    }),
  );
}

export function listEmployeeOptions(): Promise<
  { publicId: string; employeeCode: string; firstName: string; lastName: string }[]
> {
  return withPrismaErrors("user.listEmployeeOptions", () =>
    prisma.user.findMany({
      where: { ...NOT_DELETED, status: "ACTIVE", role: { isSuperAdmin: false } },
      select: { publicId: true, employeeCode: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  );
}

export function findByIdForPasswordReset(userId: number): Promise<{
  id: number;
  publicId: string;
  email: string;
  status: RecordStatus;
  passwordHash: string;
} | null> {
  return withPrismaErrors("user.findByIdForPasswordReset", () =>
    prisma.user.findFirst({
      where: { id: userId, ...NOT_DELETED },
      select: {
        id: true,
        publicId: true,
        email: true,
        status: true,
        passwordHash: true,
      },
    }),
  );
}

/** Resolves the actor behind a session cookie on every request. */
export function findActorByPublicId(publicId: string): Promise<ActorRow | null> {
  return withPrismaErrors("user.findActorByPublicId", () =>
    prisma.user.findFirst({
      where: { publicId, ...NOT_DELETED },
      select: ACTOR_SELECT,
    }),
  );
}

export function findByPublicId(publicId: string): Promise<UserDetailRow | null> {
  return withPrismaErrors("user.findByPublicId", () =>
    prisma.user.findFirst({ where: { publicId, ...NOT_DELETED }, select: DETAIL_SELECT }),
  );
}

export function findIdByPublicId(publicId: string): Promise<number | null> {
  return withPrismaErrors("user.findIdByPublicId", async () => {
    const row = await prisma.user.findFirst({
      where: { publicId, ...NOT_DELETED },
      select: { id: true },
    });
    return row?.id ?? null;
  });
}

export function findPasswordHash(
  userId: number,
): Promise<{ passwordHash: string; tokenVersion: number } | null> {
  return withPrismaErrors("user.findPasswordHash", () =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, tokenVersion: true },
    }),
  );
}

export async function list(
  filters: UserListFilters,
  pagination: PaginationParams,
  sort: SortParams<UserSortField>,
): Promise<PaginatedResult<UserListRow>> {
  const where = buildListWhere(filters);

  // One transaction so the count and the page describe the same snapshot;
  // otherwise a concurrent insert can report a total that the page contradicts.
  const [items, total] = await withPrismaErrors("user.list", () =>
    prisma.$transaction([
      prisma.user.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.user.count({ where }),
    ]),
  );

  return buildPaginatedResult(items, total, pagination);
}

export function create(input: CreateUserInput): Promise<UserDetailRow> {
  return withPrismaErrors("user.create", () =>
    prisma.user.create({
      data: {
        employeeCode: input.employeeCode,
        employeeCodeNormalized: normalizeCode(input.employeeCode),
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        emailNormalized: normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        phone: input.phone ?? null,
        joinDate: input.joinDate ?? null,
        departmentId: input.departmentId ?? null,
        designationId: input.designationId ?? null,
        branchId: input.branchId,
        roleId: input.roleId,
        status: input.status,
        mustChangePassword: input.mustChangePassword,
        passwordChangedAt: new Date(),
      },
      select: DETAIL_SELECT,
    }),
  );
}

export function update(publicId: string, input: UpdateUserInput): Promise<UserDetailRow> {
  const data: Prisma.UserUpdateInput = {};

  if (input.employeeCode !== undefined) {
    data.employeeCode = input.employeeCode;
    data.employeeCodeNormalized = normalizeCode(input.employeeCode);
  }
  if (input.email !== undefined) {
    data.email = input.email;
    data.emailNormalized = normalizeEmail(input.email);
  }
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.joinDate !== undefined) data.joinDate = input.joinDate;
  if (input.departmentId !== undefined) {
    data.department =
      input.departmentId === null ? { disconnect: true } : { connect: { id: input.departmentId } };
  }
  if (input.designationId !== undefined) {
    data.designation =
      input.designationId === null
        ? { disconnect: true }
        : { connect: { id: input.designationId } };
  }
  if (input.status !== undefined) data.status = input.status;
  if (input.branchId !== undefined) data.branch = { connect: { id: input.branchId } };
  if (input.roleId !== undefined) data.role = { connect: { id: input.roleId } };
  if (input.incrementTokenVersion) data.tokenVersion = { increment: 1 };
  if (input.avatarPath !== undefined) data.avatarPath = input.avatarPath;

  return withPrismaErrors("user.update", () =>
    prisma.user.update({ where: { publicId }, data, select: DETAIL_SELECT }),
  );
}

export function findAvatarPath(userId: number): Promise<{ avatarPath: string | null } | null> {
  return withPrismaErrors("user.findAvatarPath", () =>
    prisma.user.findFirst({
      where: { id: userId, ...NOT_DELETED },
      select: { avatarPath: true },
    }),
  );
}

export function updateAvatarPath(
  userId: number,
  avatarPath: string | null,
): Promise<{ avatarPath: string | null }> {
  return withPrismaErrors("user.updateAvatarPath", () =>
    prisma.user.update({
      where: { id: userId },
      data: { avatarPath },
      select: { avatarPath: true },
    }),
  );
}

/**
 * Soft delete. The token version is bumped in the same statement so any session
 * the user currently holds stops working immediately.
 */
export function softDelete(publicId: string): Promise<{ id: number }> {
  return withPrismaErrors("user.softDelete", () =>
    prisma.user.update({
      where: { publicId },
      data: { deletedAt: new Date(), tokenVersion: { increment: 1 } },
      select: { id: true },
    }),
  );
}

export function recordSuccessfulLogin(userId: number): Promise<void> {
  return withPrismaErrors("user.recordSuccessfulLogin", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });
  });
}

/**
 * Counts a failed attempt and locks the account once the threshold is reached.
 * The increment happens in the database rather than read-modify-write, so
 * concurrent attempts cannot both read the same count and lose one.
 */
export function recordFailedLogin(
  userId: number,
  maxAttempts: number,
  lockoutMinutes: number,
): Promise<{ failedLoginAttempts: number; lockedUntil: Date | null }> {
  return withPrismaErrors("user.recordFailedLogin", async () => {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });

    if (updated.failedLoginAttempts < maxAttempts) {
      return updated;
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + lockoutMinutes * 60_000),
        failedLoginAttempts: 0,
      },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });
  });
}

/**
 * Replaces the password and invalidates every session issued under the old one,
 * which is what makes "change password" end a stolen session.
 */
export function setPassword(userId: number, passwordHash: string): Promise<void> {
  return withPrismaErrors("user.setPassword", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  });
}

/**
 * Rewrites the stored hash without touching `tokenVersion`.
 *
 * Used when a correct password verifies against a hash made with weaker
 * parameters: the password itself has not changed, so existing sessions must
 * survive — unlike `setPassword`, which deliberately invalidates them.
 */
export function refreshPasswordHash(userId: number, passwordHash: string): Promise<void> {
  return withPrismaErrors("user.refreshPasswordHash", async () => {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  });
}

export function countByBranch(branchId: number): Promise<number> {
  return withPrismaErrors("user.countByBranch", () =>
    prisma.user.count({ where: { branchId, ...NOT_DELETED } }),
  );
}

export function countByRole(roleId: number): Promise<number> {
  return withPrismaErrors("user.countByRole", () =>
    prisma.user.count({ where: { roleId, ...NOT_DELETED } }),
  );
}

export function countSuperAdmins(): Promise<number> {
  return withPrismaErrors("user.countSuperAdmins", () =>
    prisma.user.count({ where: { ...NOT_DELETED, role: { isSuperAdmin: true } } }),
  );
}

export async function listMatching(
  filters: UserListFilters,
  take: number,
  sort: SortParams<UserSortField>,
): Promise<{ rows: UserListRow[]; total: number }> {
  const where = buildListWhere(filters);

  const [rows, total] = await withPrismaErrors("user.listMatching", () =>
    prisma.$transaction([
      prisma.user.findMany({
        where,
        select: LIST_SELECT,
        orderBy: orderByWithTiebreak(sort.sortBy, sort.sortDir),
        take,
      }),
      prisma.user.count({ where }),
    ]),
  );

  return { rows, total };
}

export function countByStatus(): Promise<{ status: RecordStatus; count: number }[]> {
  return withPrismaErrors("user.countByStatus", async () => {
    const grouped = await prisma.user.groupBy({
      by: ["status"],
      where: NOT_DELETED,
      _count: { _all: true },
    });
    return grouped.map((row) => ({ status: row.status, count: row._count._all }));
  });
}

/** Workforce counts used by the dashboard. Super Admin is not an employee record. */
export function countEmployeesByStatus(): Promise<{ status: RecordStatus; count: number }[]> {
  return withPrismaErrors("user.countEmployeesByStatus", async () => {
    const grouped = await prisma.user.groupBy({
      by: ["status"],
      where: { ...NOT_DELETED, role: { isSuperAdmin: false } },
      _count: { _all: true },
    });
    return grouped.map((row) => ({ status: row.status, count: row._count._all }));
  });
}

export async function countGroupedByBranch(): Promise<
  { publicId: string; code: string; name: string; count: number }[]
> {
  return withPrismaErrors("user.countGroupedByBranch", async () => {
    const grouped = await prisma.user.groupBy({
      by: ["branchId"],
      where: NOT_DELETED,
      _count: { _all: true },
    });

    if (grouped.length === 0) {
      return [];
    }

    const branches = await prisma.branch.findMany({
      where: { id: { in: grouped.map((row) => row.branchId) } },
      select: { id: true, publicId: true, code: true, name: true },
    });
    const byId = new Map(branches.map((branch) => [branch.id, branch]));

    return grouped
      .flatMap((row) => {
        const branch = byId.get(row.branchId);
        if (!branch) {
          return [];
        }
        return [
          {
            publicId: branch.publicId,
            code: branch.code,
            name: branch.name,
            count: row._count._all,
          },
        ];
      })
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
  });
}

export async function countGroupedByRole(): Promise<
  { publicId: string; name: string; slug: string; count: number }[]
> {
  return withPrismaErrors("user.countGroupedByRole", async () => {
    const grouped = await prisma.user.groupBy({
      by: ["roleId"],
      where: NOT_DELETED,
      _count: { _all: true },
    });

    if (grouped.length === 0) {
      return [];
    }

    const roles = await prisma.role.findMany({
      where: { id: { in: grouped.map((row) => row.roleId) } },
      select: { id: true, publicId: true, name: true, slug: true },
    });
    const byId = new Map(roles.map((role) => [role.id, role]));

    return grouped
      .flatMap((row) => {
        const role = byId.get(row.roleId);
        if (!role) {
          return [];
        }
        return [
          {
            publicId: role.publicId,
            name: role.name,
            slug: role.slug,
            count: row._count._all,
          },
        ];
      })
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
  });
}

/**
 * Uniqueness pre-checks so a form can report a duplicate on the field itself.
 * The unique index remains the real guarantee — two concurrent submissions can
 * both pass this check, and P2002 is translated for that case.
 */
export function isEmailTaken(email: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("user.isEmailTaken", async () => {
    const found = await prisma.user.findFirst({
      where: {
        emailNormalized: normalizeEmail(email),
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}

export function isEmployeeCodeTaken(code: string, exceptPublicId?: string): Promise<boolean> {
  return withPrismaErrors("user.isEmployeeCodeTaken", async () => {
    const found = await prisma.user.findFirst({
      where: {
        employeeCodeNormalized: normalizeCode(code),
        ...(exceptPublicId ? { publicId: { not: exceptPublicId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  });
}

/**
 * Super Admins and users who can edit leave (HR / managers). Used to fan out
 * leave-raised notifications without sending them back to the requester.
 */
export function findLeaveReviewerIds(excludeUserId: number): Promise<number[]> {
  return withPrismaErrors("user.findLeaveReviewerIds", async () => {
    const rows = await prisma.user.findMany({
      where: {
        ...NOT_DELETED,
        status: RECORD_STATUS.ACTIVE,
        id: { not: excludeUserId },
        role: {
          status: RECORD_STATUS.ACTIVE,
          OR: [
            { isSuperAdmin: true },
            {
              permissions: {
                some: {
                  permission: {
                    module: PERMISSION_MODULES.LEAVE,
                    action: PERMISSION_ACTIONS.EDIT,
                  },
                },
              },
            },
          ],
        },
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  });
}

/** Flattens the nested grant rows into the permission keys the guards compare. */
export function toPermissionKeys(actor: ActorRow): PermissionKey[] {
  return actor.role.permissions
    .map((grant) => `${grant.permission.module}:${grant.permission.action}`)
    .filter(isPermissionKey);
}

/** Exposed for the role service, which must not import Prisma directly. */
export function normalizeUserName(value: string): string {
  return normalizeKey(value);
}
