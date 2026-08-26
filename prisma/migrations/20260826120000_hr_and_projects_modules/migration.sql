-- CreateEnum
CREATE TYPE "attendance_day_status" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'WEEK_OFF');

-- CreateEnum
CREATE TYPE "leave_type" AS ENUM ('CASUAL', 'SICK', 'EARNED', 'UNPAID');

-- CreateEnum
CREATE TYPE "leave_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "holiday_type" AS ENUM ('NATIONAL', 'OPTIONAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "code_normalized" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "name_normalized" VARCHAR(160) NOT NULL,
    "description" VARCHAR(400),
    "branch_id" INTEGER,
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designations" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "code_normalized" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "name_normalized" VARCHAR(160) NOT NULL,
    "description" VARCHAR(400),
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "join_date" DATE,
ADD COLUMN "department_id" INTEGER,
ADD COLUMN "designation_id" INTEGER;

-- Drop the free-text designation now that the master exists.
ALTER TABLE "users" DROP COLUMN "designation";

-- CreateTable
CREATE TABLE "attendance_days" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "work_date" DATE NOT NULL,
    "status" "attendance_day_status" NOT NULL,
    "check_in" VARCHAR(8),
    "check_out" VARCHAR(8),
    "notes" VARCHAR(400),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "leave_type" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" VARCHAR(400),
    "status" "leave_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "holiday_date" DATE NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" "holiday_type" NOT NULL,
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "notes" VARCHAR(400),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "code_normalized" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "name_normalized" VARCHAR(160) NOT NULL,
    "description" VARCHAR(400),
    "owner_user_id" INTEGER NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "status" "project_status" NOT NULL DEFAULT 'PLANNED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(400),
    "assignee_user_id" INTEGER,
    "due_date" DATE,
    "status" "task_status" NOT NULL DEFAULT 'TODO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worklogs" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "work_date" DATE NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "notes" VARCHAR(400),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worklogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_public_id_key" ON "departments"("public_id");
CREATE UNIQUE INDEX "departments_code_normalized_key" ON "departments"("code_normalized");
CREATE UNIQUE INDEX "departments_name_normalized_key" ON "departments"("name_normalized");
CREATE INDEX "departments_status_idx" ON "departments"("status");
CREATE INDEX "departments_branch_id_idx" ON "departments"("branch_id");

CREATE UNIQUE INDEX "designations_public_id_key" ON "designations"("public_id");
CREATE UNIQUE INDEX "designations_code_normalized_key" ON "designations"("code_normalized");
CREATE UNIQUE INDEX "designations_name_normalized_key" ON "designations"("name_normalized");
CREATE INDEX "designations_status_idx" ON "designations"("status");

CREATE INDEX "users_department_id_idx" ON "users"("department_id");
CREATE INDEX "users_designation_id_idx" ON "users"("designation_id");

CREATE UNIQUE INDEX "attendance_days_public_id_key" ON "attendance_days"("public_id");
CREATE UNIQUE INDEX "attendance_days_user_id_work_date_key" ON "attendance_days"("user_id", "work_date");
CREATE INDEX "attendance_days_work_date_idx" ON "attendance_days"("work_date");
CREATE INDEX "attendance_days_status_idx" ON "attendance_days"("status");

CREATE UNIQUE INDEX "leave_requests_public_id_key" ON "leave_requests"("public_id");
CREATE INDEX "leave_requests_user_id_idx" ON "leave_requests"("user_id");
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");
CREATE INDEX "leave_requests_start_date_end_date_idx" ON "leave_requests"("start_date", "end_date");

CREATE UNIQUE INDEX "holidays_public_id_key" ON "holidays"("public_id");
CREATE UNIQUE INDEX "holidays_holiday_date_key" ON "holidays"("holiday_date");
CREATE INDEX "holidays_status_idx" ON "holidays"("status");

CREATE UNIQUE INDEX "projects_public_id_key" ON "projects"("public_id");
CREATE UNIQUE INDEX "projects_code_normalized_key" ON "projects"("code_normalized");
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_owner_user_id_idx" ON "projects"("owner_user_id");
CREATE INDEX "projects_name_normalized_idx" ON "projects"("name_normalized");

CREATE UNIQUE INDEX "tasks_public_id_key" ON "tasks"("public_id");
CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");
CREATE INDEX "tasks_assignee_user_id_idx" ON "tasks"("assignee_user_id");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

CREATE UNIQUE INDEX "worklogs_public_id_key" ON "worklogs"("public_id");
CREATE INDEX "worklogs_task_id_idx" ON "worklogs"("task_id");
CREATE INDEX "worklogs_user_id_idx" ON "worklogs"("user_id");
CREATE INDEX "worklogs_work_date_idx" ON "worklogs"("work_date");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_days" ADD CONSTRAINT "attendance_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "worklogs" ADD CONSTRAINT "worklogs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worklogs" ADD CONSTRAINT "worklogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
