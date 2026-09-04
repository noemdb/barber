-- CreateTable
CREATE TABLE "SlotHold" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlotHold_barberId_startsAt_idx" ON "SlotHold"("barberId", "startsAt");

-- CreateIndex
CREATE INDEX "SlotHold_token_idx" ON "SlotHold"("token");

-- CreateIndex
CREATE INDEX "SlotHold_expiresAt_idx" ON "SlotHold"("expiresAt");
