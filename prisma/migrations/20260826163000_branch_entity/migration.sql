-- Attach each branch to a legal entity. Existing branches are backfilled onto
-- the first entity, creating one from the organisation when the table is empty.

INSERT INTO "business_entities" (
    "public_id",
    "code",
    "code_normalized",
    "name",
    "name_normalized",
    "legal_name",
    "email",
    "phone",
    "tax_id",
    "address_line",
    "city",
    "state",
    "postal_code",
    "country",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    left('c' || md5(o."public_id"), 24),
    o."code",
    o."code_normalized",
    o."name",
    lower(regexp_replace(btrim(o."name"), '\s+', ' ', 'g')),
    o."legal_name",
    o."email",
    o."phone",
    o."tax_id",
    o."address_line",
    o."city",
    o."state",
    o."postal_code",
    o."country",
    o."status",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "organizations" o
WHERE NOT EXISTS (SELECT 1 FROM "business_entities")
ORDER BY o."id" ASC
LIMIT 1;

ALTER TABLE "branches" ADD COLUMN "entity_id" INTEGER;

UPDATE "branches"
SET "entity_id" = (SELECT "id" FROM "business_entities" ORDER BY "id" ASC LIMIT 1)
WHERE "entity_id" IS NULL;

ALTER TABLE "branches" ALTER COLUMN "entity_id" SET NOT NULL;

ALTER TABLE "branches" ADD CONSTRAINT "branches_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "business_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "branches_organization_id_code_normalized_key";

CREATE UNIQUE INDEX "branches_entity_id_code_normalized_key" ON "branches"("entity_id", "code_normalized");

CREATE INDEX "branches_entity_id_idx" ON "branches"("entity_id");
