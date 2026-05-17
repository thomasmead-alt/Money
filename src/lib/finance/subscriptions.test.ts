import { describe, expect, it } from "vitest";
import { detectSubscriptions, normaliseMerchant } from "./subscriptions";

describe("normaliseMerchant", () => {
  it("collapses casing and punctuation", () => {
    expect(normaliseMerchant("NETFLIX.COM 866-579-7172")).toBe("netflix com");
    expect(normaliseMerchant("Card payment to Spotify UK Ltd")).toBe("spotify");
  });
});

describe("detectSubscriptions", () => {
  const start = new Date("2026-01-01");

  function tx(
    id: string,
    daysFromStart: number,
    amount: number,
    description: string,
  ) {
    const d = new Date(start);
    d.setDate(start.getDate() + daysFromStart);
    return { id, date: d, amount, description, merchant: description };
  }

  it("identifies a monthly subscription", () => {
    const transactions = [
      tx("a", 0, -1299, "Netflix"),
      tx("b", 30, -1299, "Netflix"),
      tx("c", 60, -1299, "Netflix"),
      tx("d", 90, -1299, "Netflix"),
    ];
    const result = detectSubscriptions(transactions, new Date("2026-04-15"));
    expect(result).toHaveLength(1);
    expect(result[0].estimatedFrequency).toBe("MONTHLY");
    expect(result[0].averageAmount).toBe(-1299);
    expect(result[0].occurrences).toBe(4);
    expect(result[0].confidence).toBeGreaterThan(0.5);
  });

  it("ignores income transactions", () => {
    const transactions = [
      tx("a", 0, 345000, "Salary"),
      tx("b", 30, 345000, "Salary"),
      tx("c", 60, 345000, "Salary"),
    ];
    expect(detectSubscriptions(transactions)).toHaveLength(0);
  });

  it("rejects irregular cadences", () => {
    const transactions = [
      tx("a", 0, -1000, "Random Shop"),
      tx("b", 3, -1000, "Random Shop"),
      tx("c", 47, -1000, "Random Shop"),
    ];
    expect(detectSubscriptions(transactions)).toHaveLength(0);
  });

  it("rejects clusters of fewer than 3 hits", () => {
    const transactions = [
      tx("a", 0, -1299, "Netflix"),
      tx("b", 30, -1299, "Netflix"),
    ];
    expect(detectSubscriptions(transactions)).toHaveLength(0);
  });

  it("tolerates small price changes", () => {
    const transactions = [
      tx("a", 0, -999, "Spotify"),
      tx("b", 30, -999, "Spotify"),
      tx("c", 60, -1099, "Spotify"), // price went up
      tx("d", 90, -1099, "Spotify"),
    ];
    const result = detectSubscriptions(transactions, new Date("2026-04-15"));
    expect(result).toHaveLength(1);
    expect(result[0].estimatedFrequency).toBe("MONTHLY");
  });

  it("identifies a weekly subscription", () => {
    const transactions = [
      tx("a", 0, -350, "Weekly news"),
      tx("b", 7, -350, "Weekly news"),
      tx("c", 14, -350, "Weekly news"),
      tx("d", 21, -350, "Weekly news"),
    ];
    const result = detectSubscriptions(transactions, new Date("2026-02-01"));
    expect(result).toHaveLength(1);
    expect(result[0].estimatedFrequency).toBe("WEEKLY");
  });
});
