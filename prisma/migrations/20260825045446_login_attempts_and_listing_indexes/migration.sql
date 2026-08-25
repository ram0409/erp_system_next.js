-- DropIndex
DROP INDEX "audit_logs_entity_type_entity_id_idx";

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" SERIAL NOT NULL,
    "email_attempted" VARCHAR(160) NOT NULL,
    "email_normalized" VARCHAR(160) NOT NULL,
    "ip_address" VARCHAR(64),
    "successful" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_attempts_email_normalized_created_at_idx" ON "login_attempts"("email_normalized", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_address_created_at_idx" ON "login_attempts"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "users_branch_id_status_idx" ON "users"("branch_id", "status");

-- CreateIndex
CREATE INDEX "users_role_id_status_idx" ON "users"("role_id", "status");
