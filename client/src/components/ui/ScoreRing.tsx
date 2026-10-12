import { useId } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/cn";
import { bandFor } from "@/lib/format";

/**
 * A circular meter for a 0–100 score. The fill carries the band's status
 * colour on a lighter track of the same hue, and the band label is always
 * shown so meaning never rests on colour alone.
 */
export function ScoreRing({
  score,
  size = 168,
  stroke = 10,
  showBand = true,
  tone = "light",
  className,
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  showBand?: boolean;
  tone?: "light" | "dark";
  className?: string;
  label?: string;
}) {
  const id = useId();
  const value = useCountUp(score, 1400);
  const band = bandFor(score);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  const numberSize = size >= 140 ? "text-[52px]" : size >= 90 ? "text-[30px]" : "text-[19px]";

  return (
    <div className={cn("inline-flex flex-col items-center gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={`${label ?? "Score"}: ${score} out of 100, ${band.label}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            style={{ stroke: `color-mix(in oklab, ${band.color} ${tone === "light" ? 16 : 26}%, ${tone === "light" ? "white" : "transparent"})` }}
          />
          <circle
            id={id}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ stroke: band.color }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-display font-semibold leading-none tabular-nums", numberSize, tone === "dark" && "text-white")}>
            {value}
          </span>
          {size >= 90 && <span className={cn("mt-1 text-xs", tone === "light" ? "text-muted" : "text-white/60")}>out of 100</span>}
        </div>
      </div>
      {showBand && <BandLabel score={score} tone={tone} />}
    </div>
  );
}

export function BandLabel({ score, tone = "light", className }: { score: number; tone?: "light" | "dark"; className?: string }) {
  const band = bandFor(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium",
        tone === "light" ? "bg-mist text-ink-2" : "bg-white/10 text-white/85",
        className,
      )}
    >
      <span className="size-2 rounded-full" style={{ background: band.color }} aria-hidden="true" />
      {band.label}
    </span>
  );
}

/** Compact score pill for lists: number + band dot + label. */
export function ScorePill({ score, className }: { score: number | null; className?: string }) {
  if (score === null) return <span className={cn("text-sm text-faint", className)}>—</span>;
  const band = bandFor(score);
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full bg-mist px-2.5 py-1 text-[13px] font-medium", className)} title={band.label}>
      <span className="size-2 rounded-full" style={{ background: band.color }} aria-hidden="true" />
      <span className="tabular-nums text-ink">{score}</span>
      <span className="hidden text-muted sm:inline">{band.label}</span>
    </span>
  );
}
