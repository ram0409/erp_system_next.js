-- AlterEnum
ALTER TYPE "two_factor_method" ADD VALUE 'SMS';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "sms_otp_enabled_at" TIMESTAMP(3);
