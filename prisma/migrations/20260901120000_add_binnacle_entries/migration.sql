-- CreateEnum
CREATE TYPE "BinnacleCategory" AS ENUM ('AUTHENTICATION', 'USER_ACTION', 'SYSTEM', 'SECURITY', 'ERROR');

CREATE TYPE "BinnacleSeverity" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'CRITICAL', 'ALERT');

-- CreateTable
CREATE TABLE "binnacle_entries" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_category" "BinnacleCategory" NOT NULL DEFAULT 'SYSTEM',
    "event_severity" "BinnacleSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject_type" TEXT,
    "subject_id" TEXT,
    "subject_identifier" TEXT,
    "object_type" TEXT,
    "object_id" TEXT,
    "object_identifier" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "request_method" VARCHAR(10),
    "request_url" TEXT,
    "session_id" VARCHAR(200),
    "old_values" JSONB,
    "new_values" JSONB,
    "changed_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "binnacle_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "binnacle_entries_event_type_idx"
    ON "binnacle_entries" ("event_type");

CREATE INDEX "binnacle_entries_event_category_idx"
    ON "binnacle_entries" ("event_category");

CREATE INDEX "binnacle_entries_event_severity_idx"
    ON "binnacle_entries" ("event_severity");

CREATE INDEX "binnacle_entries_subject_type_subject_id_created_at_idx"
    ON "binnacle_entries" ("subject_type", "subject_id", "created_at");

CREATE INDEX "binnacle_entries_object_type_object_id_created_at_idx"
    ON "binnacle_entries" ("object_type", "object_id", "created_at");

CREATE INDEX "binnacle_entries_created_at_idx"
    ON "binnacle_entries" ("created_at");

CREATE INDEX "binnacle_entries_ip_address_idx"
    ON "binnacle_entries" ("ip_address");

-- Guardrail: audit rows are append-only for integrity.
CREATE OR REPLACE FUNCTION prevent_binnacle_entry_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'binnacle_entries is immutable: updates and deletes are forbidden';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER binnacle_entries_immutable
BEFORE UPDATE OR DELETE ON "binnacle_entries"
FOR EACH ROW
EXECUTE FUNCTION prevent_binnacle_entry_modification();
