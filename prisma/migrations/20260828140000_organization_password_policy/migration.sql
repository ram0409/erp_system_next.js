-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "password_policy" VARCHAR(32) NOT NULL DEFAULT 'strong';
