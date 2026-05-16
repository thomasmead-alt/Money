import { createHash } from "node:crypto";
import type { ImportResult, ParsedTransaction } from "./types";

/**
 * Minimal OFX 1.x SGML parser. OFX files used by UK banks ship as
 * tag-soup with values delimited by line breaks rather than closing tags.
 * We rely on STMTTRN blocks and the standard fields within them.
 */
export function parseOfx(text: string, filename?: string): ImportResult {
  const warnings: string[] = [];
  // Strip header (everything up to <OFX>).
  const ofxStart = text.indexOf("<OFX>");
  const body = ofxStart >= 0 ? text.slice(ofxStart) : text;

  const transactions: ParsedTransaction[] = [];
  const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  for (const match of body.matchAll(blockRegex)) {
    const block = match[1];
    const tx = parseStmtTrn(block);
    if (tx) transactions.push(tx);
    else warnings.push("Skipped malformed STMTTRN");
  }

  const rawHash = createHash("sha256").update(text).digest("hex");

  return {
    source: "OFX",
    filename,
    rowCount: transactions.length,
    duplicateCount: 0,
    transactions,
    rawHash,
    warnings,
  };
}

function parseStmtTrn(block: string): ParsedTransaction | null {
  const pick = (tag: string) => {
    const m = block.match(
      new RegExp(`<${tag}>([^<\\n\\r]*)`, "i"),
    );
    return m ? m[1].trim() : "";
  };

  const dtPosted = pick("DTPOSTED");
  const amountStr = pick("TRNAMT");
  const name = pick("NAME") || pick("MEMO");
  const memo = pick("MEMO");
  const fitid = pick("FITID");

  if (!dtPosted || !amountStr) return null;
  const date = parseOfxDate(dtPosted);
  if (!date) return null;

  const pounds = Number(amountStr);
  if (!Number.isFinite(pounds)) return null;
  const amount = Math.round(pounds * 100);

  return {
    date,
    postedDate: date,
    amount,
    description: name || memo || "(no description)",
    merchant: name || undefined,
    externalId: fitid ? `ofx:${fitid}` : undefined,
  };
}

function parseOfxDate(raw: string): Date | null {
  // YYYYMMDD or YYYYMMDDHHMMSS, optionally with [tz].
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d)),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}
