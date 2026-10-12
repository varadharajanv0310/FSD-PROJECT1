import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * A horizontal meter for one 0–100 value: the fill in the data accent on a
 * lighter track of the same hue, with the value at the tip.
 */
export function Meter({
  label,
  value,
  description,
  tone = "light",
  className,
}: {
  label: string;
  value: number;
  description?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("group", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className={cn("text-[14px] font-medium", tone === "light" ? "text-ink-2" : "text-white/85")} title={description}>
          {label}
        </span>
        <span className={cn("text-[14px] font-semibold tabular-nums", tone === "light" ? "text-ink" : "text-white")}>{value}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ background: tone === "light" ? "var(--color-data-track)" : "rgb(255 255 255 / 0.12)" }}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: tone === "light" ? "var(--color-data)" : "linear-gradient(90deg,#ff7a2f,#ec4889)" }}
          initial={{ width: reduce ? `${Math.max(2, value)}%` : 0 }}
          whileInView={{ width: `${Math.max(2, value)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {description && <p className={cn("mt-1.5 text-[12.5px]", tone === "light" ? "text-muted" : "text-white/55")}>{description}</p>}
    </div>
  );
}
