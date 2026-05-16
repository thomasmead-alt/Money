import { clsx } from "clsx";
import { formatGBP } from "@/lib/money";

interface MoneyProps {
  pence: number;
  colorBySign?: boolean;
  className?: string;
}

export function Money({ pence, colorBySign = false, className }: MoneyProps) {
  const sign = pence > 0 ? "pos" : pence < 0 ? "neg" : "zero";
  return (
    <span
      className={clsx(
        "tabular-nums",
        colorBySign && sign === "pos" && "text-(--color-positive)",
        colorBySign && sign === "neg" && "text-(--color-negative)",
        className,
      )}
    >
      {formatGBP(pence)}
    </span>
  );
}
