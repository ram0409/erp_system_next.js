-- Soft-deleted users must not permanently occupy email / employee-code uniqueness.
-- Replace full unique indexes with partial ones that apply only while deleted_at IS NULL.

DROP INDEX IF EXISTS "users_email_normalized_key";
DROP INDEX IF EXISTS "users_employee_code_normalized_key";

CREATE UNIQUE INDEX "users_email_normalized_active_key"
  ON "users"("email_normalized")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "users_employee_code_normalized_active_key"
  ON "users"("employee_code_normalized")
  WHERE "deleted_at" IS NULL;
