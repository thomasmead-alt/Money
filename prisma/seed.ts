import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { addDays, addMonths, subMonths } from "date-fns";
import "dotenv/config";

const url = (process.env.DATABASE_URL ?? "file:./data/money.db").replace(
  /^file:/,
  "",
);
const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url }),
});

const GBP = (n: number) => Math.round(n * 100);

async function main() {
  // Wipe in dependency order
  await db.transaction.deleteMany();
  await db.importBatch.deleteMany();
  await db.recurringExpense.deleteMany();
  await db.scheduledOneOff.deleteMany();
  await db.budgetLine.deleteMany();
  await db.budgetPeriod.deleteMany();
  await db.creditCardOffer.deleteMany();
  await db.mortgageDetails.deleteMany();
  await db.balanceSnapshot.deleteMany();
  await db.categoryRule.deleteMany();
  await db.account.deleteMany();
  await db.category.deleteMany();

  // Categories
  const groceries = await db.category.create({
    data: { name: "Groceries", kind: "EXPENSE", isSystem: true },
  });
  const eatingOut = await db.category.create({
    data: { name: "Eating out", kind: "EXPENSE", isSystem: true },
  });
  const transport = await db.category.create({
    data: { name: "Transport", kind: "EXPENSE", isSystem: true },
  });
  const utilities = await db.category.create({
    data: { name: "Utilities", kind: "EXPENSE", isSystem: true },
  });
  const subscriptions = await db.category.create({
    data: { name: "Subscriptions", kind: "EXPENSE", isSystem: true },
  });
  const housing = await db.category.create({
    data: { name: "Housing", kind: "EXPENSE", isSystem: true },
  });
  const salary = await db.category.create({
    data: { name: "Salary", kind: "INCOME", isSystem: true },
  });
  const holidays = await db.category.create({
    data: { name: "Holidays", kind: "EXPENSE", isSystem: true },
  });
  const isaCat = await db.category.create({
    data: {
      name: "ISA contribution",
      kind: "TRANSFER",
      isSystem: true,
      taxBucket: "ISA_CONTRIBUTION",
    },
  });
  const pensionCat = await db.category.create({
    data: {
      name: "Pension contribution",
      kind: "EXPENSE",
      isSystem: true,
      taxBucket: "PENSION_CONTRIBUTION",
    },
  });
  const interestCat = await db.category.create({
    data: {
      name: "Savings interest",
      kind: "INCOME",
      isSystem: true,
      taxBucket: "SAVINGS_INTEREST",
    },
  });
  const dividendCat = await db.category.create({
    data: {
      name: "Dividends",
      kind: "INCOME",
      isSystem: true,
      taxBucket: "DIVIDEND_INCOME",
    },
  });

  // Accounts
  const current = await db.account.create({
    data: {
      name: "Monzo Current",
      type: "CURRENT",
      institution: "Monzo",
      openingBalance: GBP(1250),
      currentBalance: GBP(1250),
      provider: "MANUAL",
    },
  });
  const savings = await db.account.create({
    data: {
      name: "Chip Easy-Access Savings",
      type: "SAVINGS",
      institution: "Chip",
      openingBalance: GBP(8500),
      currentBalance: GBP(8500),
      provider: "MANUAL",
    },
  });
  const barclayCard = await db.account.create({
    data: {
      name: "Barclaycard Platinum",
      type: "CREDIT_CARD",
      institution: "Barclays",
      openingBalance: GBP(-3200),
      currentBalance: GBP(-3200),
      creditLimit: GBP(8000),
      provider: "MANUAL",
    },
  });
  const halifaxCard = await db.account.create({
    data: {
      name: "Halifax Clarity",
      type: "CREDIT_CARD",
      institution: "Halifax",
      openingBalance: GBP(-180),
      currentBalance: GBP(-180),
      creditLimit: GBP(5000),
      provider: "MANUAL",
    },
  });
  const mortgage = await db.account.create({
    data: {
      name: "Home mortgage",
      type: "MORTGAGE",
      institution: "Nationwide",
      openingBalance: GBP(-180000),
      currentBalance: GBP(-178400),
      provider: "MANUAL",
    },
  });

  // Mortgage details
  await db.mortgageDetails.create({
    data: {
      accountId: mortgage.id,
      originalPrincipal: GBP(220000),
      currentRate: 4.74,
      rateType: "FIXED",
      rateEndDate: addMonths(new Date(), 14),
      termMonths: 300,
      startDate: subMonths(new Date(), 24),
      monthlyPayment: GBP(1248.5),
      paymentDay: 5,
    },
  });

  // Credit card offers
  await db.creditCardOffer.create({
    data: {
      accountId: barclayCard.id,
      offerType: "BALANCE_TRANSFER",
      description: "0% BT 21 months — 2.99% fee",
      amount: GBP(3200),
      feePercent: 2.99,
      feeAmount: GBP(95.68),
      promoApr: 0,
      promoStartDate: subMonths(new Date(), 3),
      promoEndDate: addMonths(new Date(), 18),
      postPromoApr: 24.9,
      status: "ACTIVE",
    },
  });
  await db.creditCardOffer.create({
    data: {
      accountId: halifaxCard.id,
      offerType: "PURCHASE",
      description: "0% on purchases for 23 months",
      amount: 0,
      feePercent: 0,
      promoApr: 0,
      promoStartDate: subMonths(new Date(), 1),
      promoEndDate: addMonths(new Date(), 22),
      postPromoApr: 22.9,
      status: "ACTIVE",
    },
  });

  // Recurring expenses
  const today = new Date();
  await db.recurringExpense.createMany({
    data: [
      {
        name: "Salary",
        amount: GBP(3450),
        accountId: current.id,
        categoryId: salary.id,
        frequency: "MONTHLY",
        interval: 1,
        startDate: subMonths(today, 9),
        nextDue: new Date(today.getFullYear(), today.getMonth(), 25),
        dayOfMonth: 25,
        isCommitted: true,
      },
      {
        name: "Council tax",
        amount: GBP(-185),
        accountId: current.id,
        categoryId: housing.id,
        frequency: "MONTHLY",
        interval: 1,
        startDate: subMonths(today, 9),
        nextDue: new Date(today.getFullYear(), today.getMonth(), 1),
        dayOfMonth: 1,
        isCommitted: true,
      },
      {
        name: "Netflix",
        amount: GBP(-12.99),
        accountId: current.id,
        categoryId: subscriptions.id,
        frequency: "MONTHLY",
        interval: 1,
        startDate: subMonths(today, 9),
        nextDue: new Date(today.getFullYear(), today.getMonth(), 14),
        dayOfMonth: 14,
        isCommitted: true,
      },
      {
        name: "Gym",
        amount: GBP(-35),
        accountId: current.id,
        categoryId: subscriptions.id,
        frequency: "MONTHLY",
        interval: 1,
        startDate: subMonths(today, 9),
        nextDue: new Date(today.getFullYear(), today.getMonth(), 3),
        dayOfMonth: 3,
        isCommitted: true,
      },
      {
        name: "Weekly food shop",
        amount: GBP(-85),
        accountId: current.id,
        categoryId: groceries.id,
        frequency: "WEEKLY",
        interval: 1,
        startDate: subMonths(today, 9),
        nextDue: addDays(today, 2),
        dayOfWeek: 6, // Saturday
        isCommitted: true,
      },
      {
        name: "Daily coffee",
        amount: GBP(-3.5),
        accountId: current.id,
        categoryId: eatingOut.id,
        frequency: "DAILY",
        interval: 1,
        startDate: subMonths(today, 9),
        nextDue: addDays(today, 1),
        isCommitted: false,
      },
      {
        name: "TV licence",
        amount: GBP(-169.5),
        accountId: current.id,
        categoryId: utilities.id,
        frequency: "ANNUALLY",
        interval: 1,
        startDate: subMonths(today, 6),
        nextDue: addMonths(today, 6),
        dayOfMonth: 15,
        monthOfYear: ((today.getMonth() + 6) % 12) + 1,
        isCommitted: true,
      },
    ],
  });

  // Scheduled one-offs
  await db.scheduledOneOff.createMany({
    data: [
      {
        name: "Summer holiday",
        amount: GBP(-1200),
        accountId: current.id,
        categoryId: holidays.id,
        date: addMonths(today, 3),
        isCommitted: true,
      },
      {
        name: "Christmas",
        amount: GBP(-600),
        accountId: current.id,
        date: new Date(today.getFullYear(), 11, 20),
        isCommitted: true,
      },
      {
        name: "MOT & service",
        amount: GBP(-280),
        accountId: current.id,
        categoryId: transport.id,
        date: addMonths(today, 5),
        isCommitted: true,
      },
    ],
  });

  // Historical transactions — 6 months of activity
  for (let i = 0; i < 180; i++) {
    const date = addDays(subMonths(today, 6), i);
    const day = date.getDay();
    // Salary on the 25th
    if (date.getDate() === 25) {
      await db.transaction.create({
        data: {
          accountId: current.id,
          date,
          amount: GBP(3450),
          description: "ACME Ltd salary",
          categoryId: salary.id,
        },
      });
    }
    // Council tax on the 1st
    if (date.getDate() === 1) {
      await db.transaction.create({
        data: {
          accountId: current.id,
          date,
          amount: GBP(-185),
          description: "Council tax",
          categoryId: housing.id,
        },
      });
    }
    // Weekly shop on Saturday
    if (day === 6) {
      await db.transaction.create({
        data: {
          accountId: current.id,
          date,
          amount: GBP(-(75 + Math.round(Math.random() * 25))),
          description: "Tesco superstore",
          categoryId: groceries.id,
        },
      });
    }
    // Coffee weekdays
    if (day >= 1 && day <= 5 && Math.random() > 0.3) {
      await db.transaction.create({
        data: {
          accountId: current.id,
          date,
          amount: GBP(-3.5),
          description: "Pret a Manger",
          categoryId: eatingOut.id,
        },
      });
    }
    // Random Amazon-ish credit card spending
    if (Math.random() > 0.85) {
      await db.transaction.create({
        data: {
          accountId: halifaxCard.id,
          date,
          amount: GBP(-(10 + Math.round(Math.random() * 50))),
          description: "AMAZON.CO.UK",
        },
      });
    }
    // Netflix subscription on the 14th (so the detector picks it up)
    if (date.getDate() === 14) {
      await db.transaction.create({
        data: {
          accountId: current.id,
          date,
          amount: GBP(-12.99),
          description: "NETFLIX.COM",
          merchant: "Netflix",
          categoryId: subscriptions.id,
        },
      });
    }
    // Spotify on the 7th
    if (date.getDate() === 7) {
      await db.transaction.create({
        data: {
          accountId: current.id,
          date,
          amount: GBP(-11.99),
          description: "SPOTIFY UK",
          merchant: "Spotify",
        },
      });
    }
    // Monthly ISA contribution on the 26th — for the tax page
    if (date.getDate() === 26) {
      await db.transaction.create({
        data: {
          accountId: savings.id,
          date,
          amount: GBP(500),
          description: "Transfer from current",
          categoryId: isaCat.id,
        },
      });
      await db.transaction.create({
        data: {
          accountId: current.id,
          date,
          amount: GBP(-500),
          description: "Transfer to ISA",
          categoryId: isaCat.id,
        },
      });
    }
    // Pension contribution (workplace, salary sacrifice equivalent)
    if (date.getDate() === 25) {
      await db.transaction.create({
        data: {
          accountId: current.id,
          date,
          amount: GBP(-345),
          description: "Workplace pension contribution",
          categoryId: pensionCat.id,
        },
      });
    }
    // Quarterly dividend
    const isQuarterly = [1, 4, 7, 10].includes(date.getMonth() + 1);
    if (isQuarterly && date.getDate() === 12) {
      await db.transaction.create({
        data: {
          accountId: current.id,
          date,
          amount: GBP(85),
          description: "Vanguard FTSE Global dividend",
          categoryId: dividendCat.id,
        },
      });
    }
    // Monthly savings interest
    if (date.getDate() === 1) {
      await db.transaction.create({
        data: {
          accountId: savings.id,
          date,
          amount: GBP(35.5),
          description: "Interest payment",
          categoryId: interestCat.id,
        },
      });
    }
  }

  // Recompute cached balances after seed
  const accountIds = [
    current.id,
    savings.id,
    barclayCard.id,
    halifaxCard.id,
    mortgage.id,
  ];
  for (const id of accountIds) {
    const acc = await db.account.findUnique({
      where: { id },
      select: { openingBalance: true },
    });
    if (!acc) continue;
    const agg = await db.transaction.aggregate({
      where: { accountId: id },
      _sum: { amount: true },
    });
    await db.account.update({
      where: { id },
      data: { currentBalance: acc.openingBalance + (agg._sum.amount ?? 0) },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
