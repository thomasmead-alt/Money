import { clsx } from "clsx";
import type { ReactNode, HTMLAttributes } from "react";

type CardProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title?: ReactNode;
  action?: ReactNode;
};

export function Card({
  title,
  action,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      {...rest}
      className={clsx(
        "rounded-xl border border-(--color-border) bg-(--color-card) shadow-sm",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-(--color-border)">
          {title && (
            <h2 className="font-medium text-sm text-(--color-muted-foreground) uppercase tracking-wide">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "positive" | "negative" | "warning";
  hint?: ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "text-(--color-positive)"
      : tone === "negative"
      ? "text-(--color-negative)"
      : tone === "warning"
      ? "text-(--color-warning)"
      : "text-(--color-foreground)";

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-(--color-muted-foreground)">
        {label}
      </div>
      <div className={clsx("text-2xl font-semibold tabular-nums mt-1", toneClass)}>
        {value}
      </div>
      {hint && (
        <div className="text-xs text-(--color-muted-foreground) mt-1">
          {hint}
        </div>
      )}
    </div>
  );
}
