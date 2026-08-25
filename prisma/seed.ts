import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import {
  PERMISSION_ACTION_LABELS,
  PERMISSION_CATALOG,
  buildPermissionKey,
} from "../src/constants/permissions";
import { SEEDED_ROLE_GRANTS } from "../src/constants/role-grants";
import { BRANCH_TYPES, RECORD_STATUS, ROLE_SLUGS, type RoleSlug } from "../src/constants/status";
import { normalizeCode, normalizeKey } from "../src/lib/normalize";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Idempotent seed: safe to run repeatedly against an existing database.
 *
 * Seeds catalog data only: organization, branch, roles and permissions.
 * User accounts are never created or updated here — sign-in uses whatever
 * administrators already exist in the database.
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

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  const organizationName = readEnv("SEED_ORG_NAME", "Netkathir Enterprises");
  const organizationCode = readEnv("SEED_ORG_CODE", "NK");
  const branchCode = readEnv("SEED_BRANCH_CODE", "HO");
  const branchName = readEnv("SEED_BRANCH_NAME", "Head Office");

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

      const admins = await tx.user.findMany({
        where: { deletedAt: null, role: { isSuperAdmin: true } },
        select: { email: true, employeeCode: true, firstName: true, lastName: true, status: true },
        orderBy: { id: "asc" },
      });

      return {
        organization,
        branch,
        permissionCount,
        roleCount: ROLE_SEEDS.length,
        admins,
      };
    },
    { timeout: 30_000 },
  );

  console.log("Seed complete.\n");
  console.log(`  Organization : ${summary.organization.name} (${summary.organization.code})`);
  console.log(`  Branch       : ${summary.branch.name} (${summary.branch.code})`);
  console.log(`  Permissions  : ${summary.permissionCount}`);
  console.log(`  Roles        : ${summary.roleCount}`);

  if (summary.admins.length === 0) {
    console.log(
      "\n  No Super Admin user was found in the database. Seed does not create accounts;\n" +
        "  sign in with an existing user, or create one in the users table.",
    );
    return;
  }

  console.log("\n  Super Admin accounts in the database (passwords are not changed):");
  for (const admin of summary.admins) {
    console.log(
      `    - ${admin.email} (${admin.employeeCode}) ${admin.firstName} ${admin.lastName} [${admin.status}]`,
    );
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
