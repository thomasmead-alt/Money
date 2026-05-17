import Link from "next/link";
import { Card } from "./Card";
import { clsx } from "clsx";
import type { Alert } from "@/lib/finance/alerts";

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <Card title="Alerts">
        <p className="text-sm text-(--color-muted-foreground)">
          All quiet — no overdue bills, expiring promos, or forecast dips
          detected.
        </p>
      </Card>
    );
  }

  return (
    <Card title={`Alerts (${alerts.length})`}>
      <ul className="divide-y divide-(--color-border) -my-2">
        {alerts.map((a) => (
          <li key={a.id} className="py-3 flex items-start gap-3">
            <span
              className={clsx(
                "mt-1 inline-flex h-2 w-2 rounded-full shrink-0",
                a.severity === "critical" && "bg-(--color-negative)",
                a.severity === "warning" && "bg-(--color-warning)",
                a.severity === "info" && "bg-(--color-accent)",
              )}
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">
                {a.href ? (
                  <Link href={a.href} className="hover:underline">
                    {a.title}
                  </Link>
                ) : (
                  a.title
                )}
              </div>
              <div className="text-xs text-(--color-muted-foreground) mt-0.5">
                {a.detail}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
