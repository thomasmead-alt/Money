import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { PROFILES } from "@/lib/import/profiles";
import { parseCsv } from "@/lib/import/csv";
import { parseOfx } from "@/lib/import/ofx";
import { persistImport } from "@/lib/import/persist";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await db.account.findUnique({ where: { id } });
  if (!account) notFound();

  async function doImport(formData: FormData) {
    "use server";
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("No file uploaded");
    }
    const sourceType = String(formData.get("sourceType") ?? "csv");
    const profileId = String(formData.get("profile") ?? "monzo");
    const text = await file.text();

    const parsed =
      sourceType === "ofx"
        ? parseOfx(text, file.name)
        : parseCsv(
            text,
            PROFILES.find((p) => p.id === profileId) ?? PROFILES[0],
            file.name,
          );

    await persistImport(id, parsed);
    redirect(`/accounts/${id}`);
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <a
          href={`/accounts/${id}`}
          className="text-xs text-(--color-muted-foreground) hover:underline"
        >
          ← {account.name}
        </a>
        <h1 className="text-2xl font-semibold mt-1">Import a statement</h1>
        <p className="text-sm text-(--color-muted-foreground) mt-1">
          Upload a CSV exported from your bank, or an OFX file. Re-uploading the
          same file is safe — duplicates are skipped automatically.
        </p>
      </div>
      <Card>
        <form action={doImport} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="sourceType" className="text-sm font-medium">
              File type
            </label>
            <select
              id="sourceType"
              name="sourceType"
              defaultValue="csv"
              className="input"
            >
              <option value="csv">CSV</option>
              <option value="ofx">OFX / QFX</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="profile" className="text-sm font-medium">
              Bank profile (CSV only)
            </label>
            <select id="profile" name="profile" className="input">
              {PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="file" className="text-sm font-medium">
              File
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,.ofx,.qfx,text/csv,application/x-ofx"
              required
              className="block w-full text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-(--color-accent) text-(--color-accent-foreground) px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Import
            </button>
          </div>
        </form>
      </Card>
      <style>{`
        .input {
          display: block;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--color-foreground);
        }
      `}</style>
    </div>
  );
}
