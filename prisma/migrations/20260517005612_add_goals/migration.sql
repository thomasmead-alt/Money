-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SAVINGS_TARGET',
    "targetAmount" INTEGER NOT NULL,
    "targetDate" DATETIME,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "linkedAccountId" TEXT,
    "monthlyContribution" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_linkedAccountId_fkey" FOREIGN KEY ("linkedAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Goal_targetDate_idx" ON "Goal"("targetDate");
