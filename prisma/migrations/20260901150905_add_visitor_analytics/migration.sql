-- CreateTable
CREATE TABLE "visitor_sessions" (
    "id" TEXT NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "referrer" TEXT,
    "is_organic" BOOLEAN NOT NULL DEFAULT false,
    "pages_viewed" INTEGER NOT NULL DEFAULT 1,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "bounced" BOOLEAN NOT NULL DEFAULT true,
    "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "is_organic" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visitor_sessions_fingerprint_key" ON "visitor_sessions"("fingerprint");

-- CreateIndex
CREATE INDEX "visitor_sessions_first_seen_idx" ON "visitor_sessions"("first_seen");

-- CreateIndex
CREATE INDEX "visitor_sessions_last_seen_idx" ON "visitor_sessions"("last_seen");

-- CreateIndex
CREATE INDEX "visitor_sessions_country_idx" ON "visitor_sessions"("country");

-- CreateIndex
CREATE INDEX "visitor_sessions_is_organic_idx" ON "visitor_sessions"("is_organic");

-- CreateIndex
CREATE INDEX "page_views_path_idx" ON "page_views"("path");

-- CreateIndex
CREATE INDEX "page_views_session_id_idx" ON "page_views"("session_id");

-- CreateIndex
CREATE INDEX "page_views_created_at_idx" ON "page_views"("created_at");
