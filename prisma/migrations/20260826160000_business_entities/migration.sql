-- CreateTable
CREATE TABLE "business_entities" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "code_normalized" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "name_normalized" VARCHAR(160) NOT NULL,
    "legal_name" VARCHAR(200),
    "email" VARCHAR(160),
    "phone" VARCHAR(32),
    "tax_id" VARCHAR(64),
    "address_line" VARCHAR(240),
    "city" VARCHAR(80),
    "state" VARCHAR(80),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(80),
    "notes" VARCHAR(400),
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_entities_public_id_key" ON "business_entities"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_entities_code_normalized_key" ON "business_entities"("code_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "business_entities_name_normalized_key" ON "business_entities"("name_normalized");

-- CreateIndex
CREATE INDEX "business_entities_status_idx" ON "business_entities"("status");
