-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_otp_enabled_at" TIMESTAMP(3),
ADD COLUMN "totp_enabled_at" TIMESTAMP(3),
ADD COLUMN "totp_secret_enc" VARCHAR(512);

-- CreateEnum
CREATE TYPE "two_factor_method" AS ENUM ('EMAIL', 'AUTHENTICATOR');

-- CreateEnum
CREATE TYPE "two_factor_purpose" AS ENUM ('LOGIN', 'ENROLL', 'DISABLE');

-- CreateTable
CREATE TABLE "two_factor_challenges" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "purpose" "two_factor_purpose" NOT NULL,
    "method" "two_factor_method" NOT NULL,
    "code_hash" VARCHAR(128),
    "secret_enc" VARCHAR(512),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_challenges_public_id_key" ON "two_factor_challenges"("public_id");

-- CreateIndex
CREATE INDEX "two_factor_challenges_user_id_purpose_consumed_at_idx" ON "two_factor_challenges"("user_id", "purpose", "consumed_at");

-- CreateIndex
CREATE INDEX "two_factor_challenges_expires_at_idx" ON "two_factor_challenges"("expires_at");

-- AddForeignKey
ALTER TABLE "two_factor_challenges" ADD CONSTRAINT "two_factor_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
