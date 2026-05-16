import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function dbUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./data/money.db";
  return raw.startsWith("file:") ? raw.slice(5) : raw;
}

function makeClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: dbUrl() });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
