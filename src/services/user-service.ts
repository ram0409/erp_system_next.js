import "server-only";

import { env } from "@/config/env";
import { PASSWORD_RESET_COOLDOWN_SECONDS, temporaryPasswordExpiresAt } from "@/constants/auth";
import { EXPORT_MAX_ROWS, TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ERROR_MESSAGES, USER_MESSAGES } from "@/constants/messages";
import {
  AUDIT_ACTIONS,
  RECORD_STATUS,
  RECORD_STATUS_LABELS,
  RECORD_STATUS_VALUES,
  type RecordStatus,
} from "@/constants/status";
import { ROUTES } from "@/constants/routes";
import { duplicateFieldError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sendAccountWelcomeEmail, sendPasswordResetEmail } from "@/lib/mail";
import {
  resolveAllowedValue,
  resolvePagination,
  resolveQueryValue,
  resolveSearchTerm,
  resolveSort,
} from "@/lib/pagination";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { issuePasswordResetToken } from "@/lib/password-reset-token";
import { getWorkspaceScope } from "@/lib/workspace-scope";
import * as auditRepository from "@/repositories/audit-repository";
import * as branchRepository from "@/repositories/branch-repository";
import * as passwordResetRepository from "@/repositories/password-reset-repository";
import * as roleRepository from "@/repositories/role-repository";
import * as userRepository from "@/repositories/user-repository";
import * as settingsService from "@/services/settings-service";
import {
  USER_SORT_FIELDS,
  type UserDetailRow,
  type UserListRow,
} from "@/repositories/user-repository";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { ActorContext } from "@/types/session";
import type {
  UserAssignmentOptions,
  UserDetail,
  UserExportResult,
  UserListItem,
} from "@/types/user";
import { toCsv } from "@/utils/csv";
import { formatDate, formatDateTime, formatFullName } from "@/utils/format";
import type { CreateUserInput, ExportUsersInput, UpdateUserInput } from "@/validations/user";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "User";
const MISSING_FILTER_ID = -1;

interface AuditMeta {
  readonly userAgent?: string | null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toListItem(row: UserListRow | UserDetailRow): UserListItem {
  return {
    publicId: row.publicId,
    employeeCode: row.employeeCode,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    joinDate: row.joinDate ? row.joinDate.toISOString() : null,
    status: row.status,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    isSuperAdmin: row.role.isSuperAdmin,
    role: {
      publicId: row.role.publicId,
      name: row.role.name,
      slug: row.role.slug,
    },
    branch: {
      publicId: row.branch.publicId,
      code: row.branch.code,
      name: row.branch.name,
    },
  };
}

function toDetail(row: UserDetailRow): UserDetail {
  return {
    ...toListItem(row),
    updatedAt: row.updatedAt.toISOString(),
    mustChangePassword: row.mustChangePassword,
    role: {
      publicId: row.role.publicId,
      name: row.role.name,
      slug: row.role.slug,
      isSuperAdmin: row.role.isSuperAdmin,
      status: row.role.status,
    },
    branch: {
      publicId: row.branch.publicId,
      code: row.branch.code,
      name: row.branch.name,
      status: row.branch.status,
    },
  };
}

async function requireUser(publicId: string): Promise<UserDetailRow> {
  const row = await userRepository.findByPublicId(publicId);
  if (!row) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  return row;
}

async function writeAudit(
  actor: ActorContext,
  meta: AuditMeta,
  entry: {
    readonly action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
    readonly entityId: number;
    readonly entityPublicId: string;
    readonly summary: string;
    readonly changes?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await auditRepository.record({
    action: entry.action,
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    actorName: formatFullName(actor.user.firstName, actor.user.lastName),
    entityType: ENTITY_TYPE,
    entityId: entry.entityId,
    entityPublicId: entry.entityPublicId,
    summary: entry.summary,
    ...(entry.changes ? { changes: entry.changes } : {}),
    ipAddress: actor.ipAddress,
    userAgent: meta.userAgent ?? null,
  });
}

async function resolveAssignment(
  branchPublicId: string,
  rolePublicId: string,
  options: { readonly requireActiveBranch: boolean; readonly requireActiveRole: boolean },
): Promise<{
  branchId: number;
  role: NonNullable<Awaited<ReturnType<typeof roleRepository.findByPublicId>>>;
}> {
  const [branch, role] = await Promise.all([
    branchRepository.findByPublicId(branchPublicId),
    roleRepository.findByPublicId(rolePublicId),
  ]);

  if (!branch) {
    throw new ValidationError(USER_MESSAGES.BRANCH_INACTIVE, {
      fieldErrors: [{ field: "branchPublicId", message: USER_MESSAGES.BRANCH_INACTIVE }],
    });
  }
  if (options.requireActiveBranch && branch.status !== RECORD_STATUS.ACTIVE) {
    throw new ValidationError(USER_MESSAGES.BRANCH_INACTIVE, {
      fieldErrors: [{ field: "branchPublicId", message: USER_MESSAGES.BRANCH_INACTIVE }],
    });
  }

  if (!role) {
    throw new ValidationError(USER_MESSAGES.ROLE_INACTIVE, {
      fieldErrors: [{ field: "rolePublicId", message: USER_MESSAGES.ROLE_INACTIVE }],
    });
  }
  if (options.requireActiveRole && role.status !== RECORD_STATUS.ACTIVE) {
    throw new ValidationError(USER_MESSAGES.ROLE_INACTIVE, {
      fieldErrors: [{ field: "rolePublicId", message: USER_MESSAGES.ROLE_INACTIVE }],
    });
  }

  return { branchId: branch.id, role };
}

function parseJoinDate(value: string | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(ERROR_MESSAGES.VALIDATION, {
      fieldErrors: [{ field: "joinDate", message: "Enter a valid join date." }],
    });
  }
  return parsed;
}

function assertCanAssignRole(actor: ActorContext, role: { readonly isSuperAdmin: boolean }): void {
  if (role.isSuperAdmin && !actor.user.role.isSuperAdmin) {
    throw new ForbiddenError(USER_MESSAGES.SUPER_ADMIN_ASSIGN);
  }
}

async function assertUniqueEmail(email: string, exceptPublicId?: string): Promise<void> {
  if (await userRepository.isEmailTaken(email, exceptPublicId)) {
    throw duplicateFieldError("email", "Email address");
  }
}

async function assertUniqueEmployeeCode(code: string, exceptPublicId?: string): Promise<void> {
  if (await userRepository.isEmployeeCodeTaken(code, exceptPublicId)) {
    throw duplicateFieldError("employeeCode", "Employee code");
  }
}

async function resolveIds(
  branchPublicId: string | undefined,
  rolePublicId: string | undefined,
): Promise<{ branchId?: number; roleId?: number }> {
  const [branchId, roleId] = await Promise.all([
    branchPublicId
      ? branchRepository.findIdByPublicId(branchPublicId).then((id) => id ?? MISSING_FILTER_ID)
      : Promise.resolve(undefined),
    rolePublicId
      ? roleRepository.findIdByPublicId(rolePublicId).then((id) => id ?? MISSING_FILTER_ID)
      : Promise.resolve(undefined),
  ]);

  return {
    ...(branchId !== undefined ? { branchId } : {}),
    ...(roleId !== undefined ? { roleId } : {}),
  };
}

async function workspaceBranchFilter(): Promise<{ branchId?: number }> {
  const scope = await getWorkspaceScope();
  return scope ? { branchId: scope.branchId } : {};
}

async function filtersFromSearchParams(
  searchParams: RawSearchParams,
  options: { readonly excludeSuperAdmin?: boolean } = {},
) {
  const search = resolveSearchTerm(searchParams);
  const status = resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES);
  const [ids, workspace] = await Promise.all([
    resolveIds(undefined, resolveQueryValue(searchParams, TABLE_QUERY_KEYS.ROLE)),
    workspaceBranchFilter(),
  ]);

  return {
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...ids,
    ...workspace,
    ...(options.excludeSuperAdmin ? { excludeSuperAdmin: true } : {}),
  };
}

async function filtersFromExportInput(filters: ExportUsersInput) {
  const [ids, workspace] = await Promise.all([
    resolveIds(undefined, filters.rolePublicId),
    workspaceBranchFilter(),
  ]);
  return {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...ids,
    ...workspace,
    ...(filters.excludeSuperAdmin ? { excludeSuperAdmin: true } : {}),
  };
}

export async function listUsers(
  searchParams: RawSearchParams,
  options: { readonly excludeSuperAdmin?: boolean } = {},
): Promise<PaginatedResult<UserListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, USER_SORT_FIELDS, "createdAt");
  const filters = await filtersFromSearchParams(searchParams, options);
  const result = await userRepository.list(filters, pagination, sort);

  return {
    items: result.items.map(toListItem),
    meta: result.meta,
  };
}

export async function getAssignmentOptions(): Promise<UserAssignmentOptions> {
  const [branches, roles, superAdminCount] = await Promise.all([
    branchRepository.listOptions(),
    roleRepository.listOptions(),
    userRepository.countSuperAdmins(),
  ]);
  return {
    branches: branches.map((branch) => ({
      publicId: branch.publicId,
      code: branch.code,
      name: branch.name,
    })),
    roles,
    superAdminCount,
  };
}

export async function getUser(publicId: string): Promise<UserDetail> {
  return toDetail(await requireUser(publicId));
}

export async function createUser(
  input: CreateUserInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<UserDetail> {
  const assignment = await resolveAssignment(input.branchPublicId, input.rolePublicId, {
    requireActiveBranch: true,
    requireActiveRole: true,
  });
  assertCanAssignRole(actor, assignment.role);
  await assertUniqueEmail(input.email);
  await assertUniqueEmployeeCode(input.employeeCode);

  const temporaryPassword = generateTemporaryPassword(
    (await settingsService.getPasswordPolicy()).policy,
  );
  const created = await userRepository.create({
    employeeCode: input.employeeCode,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    passwordHash: await hashPassword(temporaryPassword),
    phone: emptyToNull(input.phone),
    joinDate: parseJoinDate(input.joinDate),
    branchId: assignment.branchId,
    roleId: assignment.role.id,
    status: RECORD_STATUS.ACTIVE,
    mustChangePassword: true,
    temporaryPasswordExpiresAt: temporaryPasswordExpiresAt(),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Created user ${formatFullName(created.firstName, created.lastName)}`,
    changes: {
      employeeCode: created.employeeCode,
      email: created.email,
      role: assignment.role.slug,
      branch: created.branch.code,
    },
  });

  const origin = env.AUTH_URL.replace(/\/$/, "");
  const loginUrl = `${origin}${ROUTES.LOGIN}`;
  const mailed = await sendAccountWelcomeEmail({
    to: created.email,
    recipientName: formatFullName(created.firstName, created.lastName),
    temporaryPassword,
    loginUrl,
  });

  if (!mailed) {
    throw new ValidationError(USER_MESSAGES.WELCOME_EMAIL_FAILED);
  }

  return toDetail(created);
}

export async function updateUser(
  input: UpdateUserInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<UserDetail> {
  const existing = await requireUser(input.publicId);

  if (existing.role.isSuperAdmin && !actor.user.role.isSuperAdmin) {
    throw new ForbiddenError(USER_MESSAGES.SUPER_ADMIN_EDIT);
  }

  const roleChanging = input.rolePublicId !== existing.role.publicId;
  const branchChanging = input.branchPublicId !== existing.branch.publicId;

  if (existing.id === actor.userId && roleChanging) {
    throw new ForbiddenError(USER_MESSAGES.OWN_USER_ROLE);
  }

  const assignment = await resolveAssignment(input.branchPublicId, input.rolePublicId, {
    requireActiveBranch: branchChanging,
    requireActiveRole: roleChanging,
  });
  assertCanAssignRole(actor, assignment.role);

  if (
    existing.role.isSuperAdmin &&
    !assignment.role.isSuperAdmin &&
    (await userRepository.countSuperAdmins()) <= 1
  ) {
    throw new ForbiddenError(USER_MESSAGES.LAST_SUPER_ADMIN);
  }

  await assertUniqueEmail(input.email, input.publicId);
  await assertUniqueEmployeeCode(input.employeeCode, input.publicId);

  const updated = await userRepository.update(input.publicId, {
    employeeCode: input.employeeCode,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: emptyToNull(input.phone),
    joinDate: parseJoinDate(input.joinDate),
    branchId: assignment.branchId,
    roleId: assignment.role.id,
    incrementTokenVersion: roleChanging,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated user ${formatFullName(updated.firstName, updated.lastName)}`,
    changes: {
      employeeCode: { from: existing.employeeCode, to: updated.employeeCode },
      email: { from: existing.email, to: updated.email },
      role: { from: existing.role.slug, to: updated.role.slug },
      branch: { from: existing.branch.code, to: updated.branch.code },
    },
  });

  return toDetail(updated);
}

async function assertCanLeaveService(
  user: UserDetailRow,
  actor: ActorContext,
  kind: "deactivate" | "delete",
): Promise<void> {
  if (user.id === actor.userId) {
    throw new ForbiddenError(
      kind === "delete" ? USER_MESSAGES.OWN_USER_DELETE : USER_MESSAGES.OWN_USER_DEACTIVATE,
    );
  }

  if (user.role.isSuperAdmin && !actor.user.role.isSuperAdmin) {
    throw new ForbiddenError(USER_MESSAGES.SUPER_ADMIN_EDIT);
  }

  if (user.role.isSuperAdmin && (await userRepository.countSuperAdmins()) <= 1) {
    throw new ForbiddenError(USER_MESSAGES.LAST_SUPER_ADMIN);
  }
}

export async function setUserStatus(
  publicId: string,
  status: RecordStatus,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<UserDetail> {
  const existing = await requireUser(publicId);

  if (existing.status === status) {
    return toDetail(existing);
  }

  if (status === RECORD_STATUS.INACTIVE) {
    await assertCanLeaveService(existing, actor, "deactivate");
  } else if (existing.role.isSuperAdmin && !actor.user.role.isSuperAdmin) {
    throw new ForbiddenError(USER_MESSAGES.SUPER_ADMIN_EDIT);
  }

  const updated = await userRepository.update(publicId, {
    status,
    incrementTokenVersion: status === RECORD_STATUS.INACTIVE,
  });
  const action =
    status === RECORD_STATUS.ACTIVE ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE;

  await writeAudit(actor, meta, {
    action,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `${status === RECORD_STATUS.ACTIVE ? "Activated" : "Deactivated"} user ${formatFullName(updated.firstName, updated.lastName)}`,
    changes: { status: { from: existing.status, to: status } },
  });

  return toDetail(updated);
}

export async function deleteUser(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireUser(publicId);
  await assertCanLeaveService(existing, actor, "delete");

  const deleted = await userRepository.softDelete(publicId);

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted user ${formatFullName(existing.firstName, existing.lastName)}`,
  });
}

export async function sendUserPasswordReset(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireUser(publicId);

  if (existing.role.isSuperAdmin && !actor.user.role.isSuperAdmin) {
    throw new ForbiddenError(USER_MESSAGES.SUPER_ADMIN_EDIT);
  }

  if (existing.status !== RECORD_STATUS.ACTIVE) {
    throw new ForbiddenError(USER_MESSAGES.RESET_INACTIVE);
  }

  const latest = await passwordResetRepository.findLatestCreatedAt(existing.id);
  const cooldownMs = PASSWORD_RESET_COOLDOWN_SECONDS * 1_000;
  if (latest && Date.now() - latest.getTime() < cooldownMs) {
    throw new ValidationError(USER_MESSAGES.RESET_COOLDOWN);
  }

  const issued = issuePasswordResetToken();
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000);

  await passwordResetRepository.invalidateUnusedForUser(existing.id);
  await passwordResetRepository.create({
    userId: existing.id,
    tokenHash: issued.tokenHash,
    expiresAt,
    requestedIp: actor.ipAddress,
  });

  const origin = env.AUTH_URL.replace(/\/$/, "");
  const resetUrl = `${origin}${ROUTES.RESET_PASSWORD}?token=${encodeURIComponent(issued.plaintext)}`;
  const sent = await sendPasswordResetEmail({ to: existing.email, resetUrl });

  if (!sent) {
    throw new ValidationError(USER_MESSAGES.RESET_EMAIL_FAILED);
  }

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    entityId: existing.id,
    entityPublicId: existing.publicId,
    summary: `Password reset sent for ${formatFullName(existing.firstName, existing.lastName)}`,
  });
}

export async function exportUsers(filters: ExportUsersInput): Promise<UserExportResult> {
  const resolved = await filtersFromExportInput(filters);
  const { rows, total } = await userRepository.listMatching(resolved, EXPORT_MAX_ROWS, {
    sortBy: "lastName",
    sortDir: "asc",
  });

  const csv = toCsv(
    [
      "Employee code",
      "First name",
      "Last name",
      "Email",
      "Phone",
      "Branch",
      "Role",
      "Status",
      "Last login",
      "Created",
    ],
    rows.map((row) => [
      row.employeeCode,
      row.firstName,
      row.lastName,
      row.email,
      row.phone,
      row.branch.name,
      row.role.name,
      RECORD_STATUS_LABELS[row.status],
      row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "",
      formatDate(row.createdAt),
    ]),
  );

  const stamp = new Date().toISOString().slice(0, 10);

  return {
    csv,
    filename: `users-${stamp}.csv`,
    rowCount: rows.length,
    truncated: total > rows.length,
  };
}
