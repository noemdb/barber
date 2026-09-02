-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "paletteSlug" TEXT;

-- CreateTable
CREATE TABLE "color_palettes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "accentLight" TEXT NOT NULL,
    "accentDark" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "color_palettes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "color_palettes_slug_key" ON "color_palettes"("slug");

-- CreateIndex
CREATE INDEX "color_palettes_order_idx" ON "color_palettes"("order");
