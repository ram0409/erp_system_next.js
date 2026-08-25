import "dotenv/config";

import { randomInt } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PASSWORD_RULES } from "../src/constants/auth";
import {
  PERMISSION_ACTION_LABELS,
  PERMISSION_CATALOG,
  buildPermissionKey,
} from "../src/constants/permissions";
import { SEEDED_ROLE_GRANTS } from "../src/constants/role-grants";
import { BRANCH_TYPES, RECORD_STATUS, ROLE_SLUGS, type RoleSlug } from "../src/constants/status";
import { normalizeCode, normalizeEmail, normalizeKey } from "../src/lib/normalize";
import { hashPassword } from "../src/lib/password";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Idempotent seed: safe to run repeatedly against an existing database.
 *
 * Every write is an upsert keyed on a stable natural key (permission module+action,
 * role slug, normalized email), so re-running never duplicates rows and never
 * resets an administrator's edits to names or descriptions of records they own.
 *
 * The one deliberate exception is that an existing admin user's password is left
 * untouched — re-seeding must not silently reset live credentials.
 */

type RoleSeed = {
  readonly slug: RoleSlug;
  readonly name: string;
  readonly description: string;
  readonly isSuperAdmin: boolean;
};

const ROLE_SEEDS: readonly RoleSeed[] = [
  {
    slug: ROLE_SLUGS.SUPER_ADMIN,
    name: "Super Admin",
    description: "Unrestricted access, including the role permission matrix.",
    isSuperAdmin: true,
  },
  {
    slug: ROLE_SLUGS.ADMIN,
    name: "Administrator",
    description: "Manages users, roles and branches, but not the permission matrix.",
    isSuperAdmin: false,
  },
  {
    slug: ROLE_SLUGS.MANAGER,
    name: "Manager",
    description: "Onboards and edits staff; reads the role and branch masters.",
    isSuperAdmin: false,
  },
  {
    slug: ROLE_SLUGS.EMPLOYEE,
    name: "Employee",
    description: "Day-to-day access with read-only visibility of the masters.",
    isSuperAdmin: false,
  },
  {
    slug: ROLE_SLUGS.VIEWER,
    name: "Viewer",
    description: "Read-only access for audit and reporting.",
    isSuperAdmin: false,
  },
];

function readEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value.trim() === "" ? fallback : value.trim();
}

/**
 * Generates a password that satisfies PASSWORD_RULES. Used only when no
 * SEED_ADMIN_PASSWORD is supplied; the value is printed once and never stored.
 */
function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+";
  const all = upper + lower + digits + symbols;

  const pick = (source: string): string => source[randomInt(source.length)] as string;

  // One character from each required class guarantees the policy is met, then the
  // remainder is filled at random and the whole thing shuffled so the classes are
  // not in a predictable position.
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const remaining = Array.from({ length: 16 - required.length }, () => pick(all));
  const characters = [...required, ...remaining];

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    const current = characters[index] as string;
    characters[index] = characters[swap] as string;
    characters[swap] = current;
  }

  return characters.join("");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  const organizationName = readEnv("SEED_ORG_NAME", "Netkathir Enterprises");
  const organizationCode = readEnv("SEED_ORG_CODE", "NK");
  const branchCode = readEnv("SEED_BRANCH_CODE", "HO");
  const branchName = readEnv("SEED_BRANCH_NAME", "Head Office");

  const adminEmail = readEnv("SEED_ADMIN_EMAIL", "systemadmin@sample.com");
  const adminEmployeeCode = readEnv("SEED_ADMIN_EMPLOYEE_CODE", "systemadmin.sample");
  const adminFirstName = readEnv("SEED_ADMIN_FIRST_NAME", "System");
  const adminLastName = readEnv("SEED_ADMIN_LAST_NAME", "Administrator");

  const suppliedPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
  const adminPassword =
    suppliedPassword && suppliedPassword.length > 0 ? suppliedPassword : generatePassword();
  const passwordWasGenerated = !suppliedPassword;

  if (adminPassword.length < PASSWORD_RULES.MIN_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD must be at least ${PASSWORD_RULES.MIN_LENGTH} characters.`,
    );
  }

  // Hashed outside the transaction: Argon2 is intentionally slow and would eat
  // into the transaction timeout budget.
  const passwordHash = await hashPassword(adminPassword);

  const summary = await prisma.$transaction(
    async (tx) => {
      const organization = await tx.organization.upsert({
        where: { codeNormalized: normalizeCode(organizationCode) },
        update: {},
        create: {
          name: organizationName,
          code: organizationCode,
          codeNormalized: normalizeCode(organizationCode),
          status: RECORD_STATUS.ACTIVE,
        },
        select: { id: true, name: true, code: true },
      });

      const branch = await tx.branch.upsert({
        where: {
          organizationId_codeNormalized: {
            organizationId: organization.id,
            codeNormalized: normalizeCode(branchCode),
          },
        },
        update: {},
        create: {
          organizationId: organization.id,
          code: branchCode,
          codeNormalized: normalizeCode(branchCode),
          name: branchName,
          nameNormalized: normalizeKey(branchName),
          type: BRANCH_TYPES.HEAD_OFFICE,
          isHeadOffice: true,
          status: RECORD_STATUS.ACTIVE,
        },
        select: { id: true, code: true, name: true },
      });

      // Permission rows are generated from the catalog, so adding an ERP module is
      // a constants edit plus a re-seed rather than a migration.
      const permissionIdsByKey = new Map<string, number>();
      let permissionCount = 0;

      for (const definition of PERMISSION_CATALOG) {
        for (const [actionIndex, action] of definition.actions.entries()) {
          const key = buildPermissionKey(definition.module, action);
          const label = `${definition.label} - ${PERMISSION_ACTION_LABELS[action]}`;
          const sortOrder = definition.order * 100 + actionIndex;

          const permission = await tx.permission.upsert({
            where: { module_action: { module: definition.module, action } },
            // Labels and ordering are catalog-owned, so they are refreshed on every
            // run; grants reference the row by id and are unaffected.
            update: { label, description: definition.description, sortOrder },
            create: {
              module: definition.module,
              action,
              label,
              description: definition.description,
              sortOrder,
            },
            select: { id: true },
          });

          permissionIdsByKey.set(key, permission.id);
          permissionCount += 1;
        }
      }

      const roleIdsBySlug = new Map<string, number>();

      for (const roleSeed of ROLE_SEEDS) {
        const role = await tx.role.upsert({
          where: { slug: roleSeed.slug },
          // Name and description stay editable by administrators, so an existing
          // role is not overwritten. The flags are enforced because they are
          // security-relevant.
          update: { isSystem: true, isSuperAdmin: roleSeed.isSuperAdmin },
          create: {
            slug: roleSeed.slug,
            name: roleSeed.name,
            nameNormalized: normalizeKey(roleSeed.name),
            description: roleSeed.description,
            isSystem: true,
            isSuperAdmin: roleSeed.isSuperAdmin,
            status: RECORD_STATUS.ACTIVE,
          },
          select: { id: true },
        });

        roleIdsBySlug.set(roleSeed.slug, role.id);

        const keys = SEEDED_ROLE_GRANTS[roleSeed.slug] ?? [...permissionIdsByKey.keys()];

        for (const key of keys) {
          const permissionId = permissionIdsByKey.get(key);
          if (permissionId === undefined) {
            throw new Error(
              `Role "${roleSeed.slug}" references unknown permission "${key}". ` +
                "The catalog and the role seed have diverged.",
            );
          }

          await tx.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId } },
            update: {},
            create: { roleId: role.id, permissionId },
          });
        }
      }

      const superAdminRoleId = roleIdsBySlug.get(ROLE_SLUGS.SUPER_ADMIN);
      if (superAdminRoleId === undefined) {
        throw new Error("Super admin role was not seeded.");
      }

      const emailNormalized = normalizeEmail(adminEmail);
      const existing = await tx.user.findUnique({
        where: { emailNormalized },
        select: { id: true },
      });

      const resetExistingPassword = process.env.SEED_ADMIN_RESET_PASSWORD === "true";
      const shouldWritePassword = existing === null || resetExistingPassword;

      const admin = await tx.user.upsert({
        where: { emailNormalized },
        // An existing account keeps its password unless SEED_ADMIN_RESET_PASSWORD
        // is set: re-seeding must never reset a live credential by accident.
        // Employee code and break-glass status are re-asserted so the seeded
        // administrator cannot be left deactivated, demoted, or renamed away
        // from the documented login identity.
        update: {
          employeeCode: adminEmployeeCode,
          employeeCodeNormalized: normalizeCode(adminEmployeeCode),
          roleId: superAdminRoleId,
          branchId: branch.id,
          status: RECORD_STATUS.ACTIVE,
          deletedAt: null,
          lockedUntil: null,
          failedLoginAttempts: 0,
          ...(shouldWritePassword
            ? {
                passwordHash,
                mustChangePassword: passwordWasGenerated,
                passwordChangedAt: new Date(),
              }
            : {}),
        },
        create: {
          employeeCode: adminEmployeeCode,
          employeeCodeNormalized: normalizeCode(adminEmployeeCode),
          firstName: adminFirstName,
          lastName: adminLastName,
          email: adminEmail,
          emailNormalized,
          passwordHash,
          designation: "System Administrator",
          branchId: branch.id,
          roleId: superAdminRoleId,
          status: RECORD_STATUS.ACTIVE,
          mustChangePassword: passwordWasGenerated,
          passwordChangedAt: new Date(),
        },
        select: { id: true, email: true, employeeCode: true },
      });

      return {
        organization,
        branch,
        permissionCount,
        roleCount: ROLE_SEEDS.length,
        admin,
        adminAlreadyExisted: existing !== null,
      };
    },
    { timeout: 30_000 },
  );

  console.log("Seed complete.\n");
  console.log(`  Organization : ${summary.organization.name} (${summary.organization.code})`);
  console.log(`  Branch       : ${summary.branch.name} (${summary.branch.code})`);
  console.log(`  Permissions  : ${summary.permissionCount}`);
  console.log(`  Roles        : ${summary.roleCount}`);
  console.log(`  Super admin  : ${summary.admin.email} (${summary.admin.employeeCode})`);

  if (summary.adminAlreadyExisted && !process.env.SEED_ADMIN_RESET_PASSWORD) {
    console.log(
      "\n  The admin account already existed, so its password was left unchanged.\n" +
        "  Set SEED_ADMIN_PASSWORD and SEED_ADMIN_RESET_PASSWORD=true if you need a new one.",
    );
    return;
  }

  if (summary.adminAlreadyExisted && process.env.SEED_ADMIN_RESET_PASSWORD === "true") {
    console.log("\n  Existing admin password was reset (SEED_ADMIN_RESET_PASSWORD=true).");
  }

  if (passwordWasGenerated) {
    console.log("\n  ------------------------------------------------------------");
    console.log(`  Generated password: ${adminPassword}`);
    console.log("  Shown once and not stored anywhere. Save it now.");
    console.log("  A password change is required at first sign-in.");
    console.log("  ------------------------------------------------------------");
  } else {
    console.log("\n  Password was taken from SEED_ADMIN_PASSWORD.");
  }
}

// Not top-level await: package.json has no "type": "module", so the seed is
// transpiled to CommonJS where top-level await is unavailable.
main()
  .catch((error: unknown) => {
    console.error("\nSeed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
