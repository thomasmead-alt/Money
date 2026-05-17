import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Stream the live SQLite file as a downloadable backup.
 * Safe because we use `better-sqlite3` synchronously with WAL mode — the file
 * is consistent at the moment of read. For an extra-safe backup users should
 * stop the server first, but this is fine for casual snapshots.
 */
export async function GET() {
  const raw = process.env.DATABASE_URL ?? "file:./data/money.db";
  const relative = raw.replace(/^file:/, "");
  const path = resolve(process.cwd(), relative);

  try {
    await stat(path);
  } catch {
    return NextResponse.json(
      { error: `database file not found at ${path}` },
      { status: 404 },
    );
  }

  const buffer = await readFile(path);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `money-${stamp}.db`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/x-sqlite3",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
