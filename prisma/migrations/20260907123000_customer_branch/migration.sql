-- AlterTable
ALTER TABLE "customers" ADD COLUMN "branch_id" INTEGER;

-- Backfill existing customers onto the head office (or first active branch).
UPDATE "customers"
SET "branch_id" = (
  SELECT "id"
  FROM "branches"
  WHERE "deleted_at" IS NULL
  ORDER BY "is_head_office" DESC, "id" ASC
  LIMIT 1
)
WHERE "branch_id" IS NULL;

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "branch_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "customers_branch_id_idx" ON "customers"("branch_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
