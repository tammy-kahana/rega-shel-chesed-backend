-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COORDINATOR', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('ESCORT_PATIENT', 'FOOD_BASKETS', 'ELDERLY_HELP', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "Area" AS ENUM ('BNEI_BRAK', 'JERUSALEM', 'BEIT_SHEMESH', 'ELAD', 'MODIIN_ILLIT', 'BEITAR_ILLIT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'TAKEN', 'DONE');

-- CreateEnum
CREATE TYPE "SignupStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VOLUNTEER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "area" "Area" NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "volunteersNeeded" INTEGER NOT NULL,
    "privateDetails" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signups" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "volunteerId" INTEGER NOT NULL,
    "status" "SignupStatus" NOT NULL DEFAULT 'ACTIVE',
    "reportedDone" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "tasks_area_idx" ON "tasks"("area");

-- CreateIndex
CREATE INDEX "tasks_type_idx" ON "tasks"("type");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_date_idx" ON "tasks"("date");

-- CreateIndex
CREATE UNIQUE INDEX "signups_taskId_volunteerId_key" ON "signups"("taskId", "volunteerId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signups" ADD CONSTRAINT "signups_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signups" ADD CONSTRAINT "signups_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity checks (אילוצי תקינות נוספים ברמת מסד הנתונים)
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_volunteersNeeded_check" CHECK ("volunteersNeeded" BETWEEN 1 AND 20);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_time_check" CHECK ("time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "users" ADD CONSTRAINT "users_phone_check" CHECK ("phone" ~ '^05[0-9]{8}$');
