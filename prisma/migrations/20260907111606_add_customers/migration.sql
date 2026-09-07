-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "code_normalized" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "name_normalized" VARCHAR(160) NOT NULL,
    "contact_person" VARCHAR(120),
    "email" VARCHAR(160),
    "phone" VARCHAR(32),
    "address_line1" VARCHAR(240),
    "address_line2" VARCHAR(240),
    "city" VARCHAR(80),
    "state" VARCHAR(80),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(80),
    "notes" VARCHAR(500),
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_public_id_key" ON "customers"("public_id");

-- CreateIndex
CREATE INDEX "customers_organization_id_idx" ON "customers"("organization_id");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateIndex
CREATE INDEX "customers_name_normalized_idx" ON "customers"("name_normalized");

-- CreateIndex
CREATE INDEX "customers_code_normalized_idx" ON "customers"("code_normalized");

-- Active-only uniqueness so soft-deleted codes/names can be reused.
CREATE UNIQUE INDEX "customers_code_normalized_active_key"
  ON "customers"("code_normalized")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "customers_name_normalized_active_key"
  ON "customers"("name_normalized")
  WHERE "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
