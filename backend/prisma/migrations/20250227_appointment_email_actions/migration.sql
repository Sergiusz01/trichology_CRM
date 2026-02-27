-- Migration: appointment_email_actions
-- Date: 2025-02-27
-- Adds automated reminder emails with confirm/cancel/reschedule links

-- 1. Add new VisitStatus enum values
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'POTWIERDZONA';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'PROSBA_ZMIANY';

-- 2. Add reminderWithActionsSent flag to Visit
ALTER TABLE "Visit"
  ADD COLUMN IF NOT EXISTS "reminderWithActionsSent" BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create VisitEvent table (logs patient actions via email links)
CREATE TABLE IF NOT EXISTS "VisitEvent" (
  "id"        TEXT NOT NULL,
  "visitId"   TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload"   JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL DEFAULT 'patient_link',
  CONSTRAINT "VisitEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VisitEvent"
  ADD CONSTRAINT "VisitEvent_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "VisitEvent_visitId_idx"   ON "VisitEvent"("visitId");
CREATE INDEX IF NOT EXISTS "VisitEvent_createdAt_idx" ON "VisitEvent"("createdAt");

-- 4. Create NotificationLog table (logs every sent notification)
CREATE TABLE IF NOT EXISTS "NotificationLog" (
  "id"                TEXT NOT NULL,
  "visitId"           TEXT,
  "type"              TEXT NOT NULL,
  "recipient"         TEXT NOT NULL,
  "sentAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "providerMessageId" TEXT,
  "status"            TEXT NOT NULL DEFAULT 'sent',
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "NotificationLog_visitId_idx" ON "NotificationLog"("visitId");
CREATE INDEX IF NOT EXISTS "NotificationLog_sentAt_idx"  ON "NotificationLog"("sentAt");

-- 5. Create DashboardNotification table (shown in the CRM dashboard)
CREATE TABLE IF NOT EXISTS "DashboardNotification" (
  "id"          TEXT NOT NULL,
  "visitId"     TEXT,
  "patientName" TEXT NOT NULL,
  "visitDate"   TIMESTAMP(3),
  "actionType"  TEXT NOT NULL,
  "isRead"      BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DashboardNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DashboardNotification_isRead_idx"    ON "DashboardNotification"("isRead");
CREATE INDEX IF NOT EXISTS "DashboardNotification_createdAt_idx" ON "DashboardNotification"("createdAt");

-- 6. Create SpecialistSettings table (stores clinic phone, etc.)
CREATE TABLE IF NOT EXISTS "SpecialistSettings" (
  "id"           TEXT NOT NULL,
  "specialistId" TEXT NOT NULL,
  "clinicPhone"  TEXT,
  CONSTRAINT "SpecialistSettings_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "SpecialistSettings_specialistId_key" UNIQUE ("specialistId")
);

ALTER TABLE "SpecialistSettings"
  ADD CONSTRAINT "SpecialistSettings_specialistId_fkey"
    FOREIGN KEY ("specialistId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
