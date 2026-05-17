-- AlterTable
ALTER TABLE "Account" ADD COLUMN "lastValuedAt" DATETIME;

-- CreateTable
CREATE TABLE "CardRewardRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "ratePercent" REAL NOT NULL,
    "description" TEXT,
    "monthlyCapPence" INTEGER,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardRewardRule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CardRewardRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CardRewardRule_accountId_idx" ON "CardRewardRule"("accountId");

-- CreateIndex
CREATE INDEX "CardRewardRule_categoryId_idx" ON "CardRewardRule"("categoryId");
