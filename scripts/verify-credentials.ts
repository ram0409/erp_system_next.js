import "dotenv/config";

import { verifyPassword } from "../src/lib/password";
import { findByEmailForAuth, toPermissionKeys } from "../src/repositories/user-repository";

/**
 * Exercises the real sign-in lookup: repository projection, Argon2 verification
 * and permission flattening, against the development database.
 *
 * Run with: npx tsx scripts/verify-credentials.ts <email> <password>
 */

async function main(): Promise<void> {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/verify-credentials.ts <email> <password>");
    process.exitCode = 1;
    return;
  }

  const user = await findByEmailForAuth(email);

  if (!user) {
    console.log(`No active account found for ${email}.`);
    process.exitCode = 1;
    return;
  }

  const passwordMatches = await verifyPassword(user.passwordHash, password);
  const permissions = toPermissionKeys(user);

  console.log("Account lookup");
  console.log(`  email              : ${user.email}`);
  console.log(`  employee code      : ${user.employeeCode}`);
  console.log(`  name               : ${user.firstName} ${user.lastName}`);
  console.log(`  status             : ${user.status}`);
  console.log(`  role               : ${user.role.name} (${user.role.slug})`);
  console.log(`  super admin        : ${user.role.isSuperAdmin}`);
  console.log(`  branch             : ${user.branch.name} (${user.branch.code})`);
  console.log(`  must change pw     : ${user.mustChangePassword}`);
  console.log(`  token version      : ${user.tokenVersion}`);
  console.log(`  locked until       : ${user.lockedUntil?.toISOString() ?? "not locked"}`);
  console.log(`  failed attempts    : ${user.failedLoginAttempts}`);
  console.log(`  granted permissions: ${permissions.length}`);

  console.log("\nPassword verification");
  console.log(`  supplied password  : ${passwordMatches ? "MATCHES" : "does not match"}`);
  console.log(
    `  deliberately wrong : ${(await verifyPassword(user.passwordHash, `${password}-wrong`)) ? "MATCHES (BUG)" : "correctly rejected"}`,
  );

  console.log("\nPermissions");
  for (const key of permissions.sort()) {
    console.log(`  ${key}`);
  }

  if (!passwordMatches) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error("Verification failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
