import { db } from "@/lib/db";
import { Card, Stat } from "@/components/Card";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const [accountCount, transactionCount, recurringCount, importBatchCount] =
    await Promise.all([
      db.account.count(),
      db.transaction.count(),
      db.recurringExpense.count(),
      db.importBatch.count(),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Backup &amp; restore</h1>
      <p className="text-sm text-(--color-muted-foreground) -mt-3">
        Two ways to back up everything. SQLite is the canonical copy — it&apos;s
        what the app reads from. JSON is human-readable and version-control
        friendly.
      </p>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card>
          <Stat label="Accounts" value={accountCount} />
        </Card>
        <Card>
          <Stat
            label="Transactions"
            value={transactionCount.toLocaleString("en-GB")}
          />
        </Card>
        <Card>
          <Stat label="Recurring rules" value={recurringCount} />
        </Card>
        <Card>
          <Stat label="Import batches" value={importBatchCount} />
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card title="SQLite snapshot (canonical)">
          <p className="text-sm text-(--color-muted-foreground) mb-4">
            Direct copy of the database file. Re-open the app on a new machine
            by replacing <code className="px-1 py-0.5 rounded bg-(--color-muted) text-xs">data/money.db</code>{" "}
            with this download.
          </p>
          <a
            href="/api/backup/sqlite"
            download
            className="btn-primary inline-block"
          >
            Download .db
          </a>
          <p className="text-xs text-(--color-muted-foreground) mt-3">
            Safe to download while the server is running thanks to WAL mode,
            but for a guaranteed-consistent backup you can stop the dev server
            first and copy <code className="px-1 py-0.5 rounded bg-(--color-muted) text-xs">data/money.db</code>{" "}
            yourself.
          </p>
        </Card>

        <Card title="JSON export">
          <p className="text-sm text-(--color-muted-foreground) mb-4">
            Every row from every table serialised to JSON. Good for diffing in
            git, scripting, or importing into other tools.
          </p>
          <a
            href="/api/backup/json"
            download
            className="btn-primary inline-block"
          >
            Download .json
          </a>
          <p className="text-xs text-(--color-muted-foreground) mt-3">
            Imports back into the app are coming in a future release — for now
            the SQLite snapshot is the route for full restore.
          </p>
        </Card>
      </div>

      <Card title="Automated backups (recommended)">
        <div className="text-sm text-(--color-muted-foreground) space-y-2">
          <p>
            For peace of mind on a self-hosted setup, run a cron job that
            snapshots <code className="px-1 py-0.5 rounded bg-(--color-muted) text-xs">data/money.db</code>{" "}
            nightly with retention. Example for macOS / Linux:
          </p>
          <pre className="overflow-x-auto rounded-md bg-(--color-muted) p-3 text-xs">
{`0 3 * * * cp /path/to/Money/data/money.db \\
   /path/to/backups/money-$(date +\\%F).db && \\
   find /path/to/backups -name "money-*.db" -mtime +30 -delete`}
          </pre>
          <p className="text-xs">
            That keeps a daily snapshot for 30 days. SQLite under WAL is safe
            to copy live; the resulting backup is consistent.
          </p>
        </div>
      </Card>
    </div>
  );
}
