-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "institution" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "openingBalance" INTEGER NOT NULL DEFAULT 0,
    "currentBalance" INTEGER NOT NULL DEFAULT 0,
    "creditLimit" INTEGER,
    "provider" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "providerMeta" TEXT,
    "includeInNetWorth" BOOLEAN NOT NULL DEFAULT true,
    "minBalanceAlert" INTEGER,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "balance" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BalanceSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "postedDate" DATETIME,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "categoryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CLEARED',
    "externalId" TEXT,
    "importBatchId" TEXT,
    "transferGroupId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'EXPENSE',
    "colour" TEXT,
    "icon" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CategoryRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchType" TEXT NOT NULL DEFAULT 'CONTAINS',
    "pattern" TEXT NOT NULL,
    "field" TEXT NOT NULL DEFAULT 'description',
    "categoryId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "frequency" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "monthOfYear" INTEGER,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "nextDue" DATETIME NOT NULL,
    "lastPaid" DATETIME,
    "isCommitted" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringExpense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduledOneOff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "isCommitted" BOOLEAN NOT NULL DEFAULT true,
    "paidAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduledOneOff_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduledOneOff_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditCardOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "offerType" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "feePercent" REAL NOT NULL DEFAULT 0,
    "feeAmount" INTEGER NOT NULL DEFAULT 0,
    "promoApr" REAL NOT NULL DEFAULT 0,
    "promoStartDate" DATETIME NOT NULL,
    "promoEndDate" DATETIME NOT NULL,
    "postPromoApr" REAL NOT NULL DEFAULT 0,
    "minPaymentPercent" REAL NOT NULL DEFAULT 2.5,
    "minPaymentFloor" INTEGER NOT NULL DEFAULT 2500,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreditCardOffer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MortgageDetails" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "originalPrincipal" INTEGER NOT NULL,
    "currentRate" REAL NOT NULL,
    "rateType" TEXT NOT NULL DEFAULT 'FIXED',
    "rateEndDate" DATETIME,
    "termMonths" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "monthlyPayment" INTEGER NOT NULL,
    "paymentDay" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MortgageDetails_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BudgetPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "horizonType" TEXT NOT NULL DEFAULT 'MONTH',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "budgetPeriodId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "plannedAmount" INTEGER NOT NULL,
    CONSTRAINT "BudgetLine_budgetPeriodId_fkey" FOREIGN KEY ("budgetPeriodId") REFERENCES "BudgetPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetLine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ForecastScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ForecastOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "payload" TEXT NOT NULL,
    CONSTRAINT "ForecastOverride_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ForecastScenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "filename" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "rawHash" TEXT,
    CONSTRAINT "ImportBatch_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "BalanceSnapshot_accountId_date_idx" ON "BalanceSnapshot"("accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BalanceSnapshot_accountId_date_key" ON "BalanceSnapshot"("accountId", "date");

-- CreateIndex
CREATE INDEX "Transaction_accountId_date_idx" ON "Transaction"("accountId", "date");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "Transaction_transferGroupId_idx" ON "Transaction"("transferGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_accountId_externalId_key" ON "Transaction"("accountId", "externalId");

-- CreateIndex
CREATE INDEX "Category_kind_idx" ON "Category"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_parentId_key" ON "Category"("name", "parentId");

-- CreateIndex
CREATE INDEX "CategoryRule_priority_idx" ON "CategoryRule"("priority");

-- CreateIndex
CREATE INDEX "RecurringExpense_nextDue_idx" ON "RecurringExpense"("nextDue");

-- CreateIndex
CREATE INDEX "RecurringExpense_accountId_idx" ON "RecurringExpense"("accountId");

-- CreateIndex
CREATE INDEX "ScheduledOneOff_date_idx" ON "ScheduledOneOff"("date");

-- CreateIndex
CREATE INDEX "CreditCardOffer_accountId_idx" ON "CreditCardOffer"("accountId");

-- CreateIndex
CREATE INDEX "CreditCardOffer_promoEndDate_idx" ON "CreditCardOffer"("promoEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "MortgageDetails_accountId_key" ON "MortgageDetails"("accountId");

-- CreateIndex
CREATE INDEX "BudgetPeriod_startDate_endDate_idx" ON "BudgetPeriod"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_budgetPeriodId_categoryId_key" ON "BudgetLine"("budgetPeriodId", "categoryId");

-- CreateIndex
CREATE INDEX "ForecastOverride_scenarioId_idx" ON "ForecastOverride"("scenarioId");

-- CreateIndex
CREATE INDEX "ImportBatch_accountId_idx" ON "ImportBatch"("accountId");
